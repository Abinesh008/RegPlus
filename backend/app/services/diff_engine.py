import logging
import time
from difflib import SequenceMatcher
from typing import Optional, List, Tuple, Dict, Any

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from google import genai
from google.genai import types

from backend.app.core.config import settings
from backend.app.models.models import Circular, Obligation, DiffSession, DiffResult

logger = logging.getLogger("regpulse.diff_engine")

SYSTEM_PROMPT = """You are an RBI regulatory compliance expert.

Compare these two compliance obligations.

Determine whether they represent:

same

changed

different

Definitions

same

The regulatory requirement is identical.

Only wording changed.

changed

The same obligation exists but the scope, applicability, frequency, threshold or intent has changed.

different

Completely different compliance obligations.

Return ONLY one word.

same

changed

different

No explanation."""

def call_gemini_semantic(
    old_text: str,
    new_text: str,
    api_key: str,
    model_name: str
) -> Tuple[str, Dict[str, Any]]:
    """
    Calls Gemini to classify the relationship between two obligations.
    Returns:
        tuple: (classification, token_usage_dict)
        where classification is one of "same", "changed", "different"
    """
    client = genai.Client(api_key=api_key)
    
    contents = (
        f"Obligation 1 (Old):\n{old_text}\n\n"
        f"Obligation 2 (New):\n{new_text}"
    )
    
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.0,
    )
    
    start_time = time.perf_counter()
    response = client.models.generate_content(
        model=model_name,
        contents=contents,
        config=config
    )
    latency_ms = int((time.perf_counter() - start_time) * 1000)
    
    input_tokens = 0
    output_tokens = 0
    total_tokens = 0
    if response.usage_metadata:
        input_tokens = response.usage_metadata.prompt_token_count or 0
        output_tokens = response.usage_metadata.candidates_token_count or 0
        total_tokens = response.usage_metadata.total_token_count or 0
        
    result_text = (response.text or "").strip().lower()
    
    # Simple search for the valid classifications in response if model outputs extra characters
    valid_responses = {"same", "changed", "different"}
    if result_text not in valid_responses:
        for word in valid_responses:
            if word in result_text:
                result_text = word
                break
        else:
            raise ValueError(f"Invalid response from Gemini: {response.text}")
            
    token_usage = {
        "model_name": model_name,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "latency_ms": latency_ms,
    }
    
    return result_text, token_usage

def diff_circulars(db: Session, old_circular_id: int, new_circular_id: int) -> Dict[str, Any]:
    """
    Compare two RBI circulars using their extracted obligations.
    Uses SequenceMatcher and Gemini semantic checks with greedy matching.
    """
    start_run_time = time.perf_counter()
    logger.info("Diff requested: old_circular_id=%d, new_circular_id=%d", old_circular_id, new_circular_id)
    
    # 1. Check cache (if DiffSession already exists)
    stmt_session = select(DiffSession).where(
        DiffSession.old_circular_id == old_circular_id,
        DiffSession.new_circular_id == new_circular_id
    )
    session_record = db.execute(stmt_session).scalar_one_or_none()
    
    if session_record:
        logger.info("Cache hit for circular pair (%d, %d). Returning cached results.", old_circular_id, new_circular_id)
        stmt_results = select(DiffResult).where(DiffResult.diff_session_id == session_record.id)
        results = db.execute(stmt_results).scalars().all()
        
        new_count = sum(1 for r in results if r.category == "new")
        changed_count = sum(1 for r in results if r.category == "changed")
        unchanged_count = sum(1 for r in results if r.category == "unchanged")
        
        logger.info(
            "Token Monitoring: Model=None, Input Tokens=0, Output Tokens=0, Total Tokens=0, Latency=0 ms, Response Source=Database Cache"
        )
        return {
            "diff_id": session_record.id,
            "new": new_count,
            "changed": changed_count,
            "unchanged": unchanged_count
        }
        
    logger.info("Cache miss for circular pair (%d, %d). Running diff computation.", old_circular_id, new_circular_id)
    
    # 2. Fetch circulars and check exists
    old_circular = db.get(Circular, old_circular_id)
    new_circular = db.get(Circular, new_circular_id)
    
    if not old_circular or not new_circular:
        logger.error("Missing circular: old_circular_id=%s, new_circular_id=%s", old_circular_id, new_circular_id)
        raise HTTPException(status_code=404, detail="Circular not found")
        
    # 3. Retrieve and validate obligations
    old_obligations = old_circular.obligations
    new_obligations = new_circular.obligations
    
    if not old_obligations or not new_obligations:
        logger.error("No obligations: old_circular has %d obligations, new_circular has %d obligations", len(old_obligations), len(new_obligations))
        raise HTTPException(status_code=400, detail="One or both circulars have no obligations extracted. Please extract obligations first.")
        
    # 4. Generate candidate pairs using SequenceMatcher
    logger.info("Candidate generation: old obligations = %d, new obligations = %d", len(old_obligations), len(new_obligations))
    candidates = []
    for o_new in new_obligations:
        for o_old in old_obligations:
            score = SequenceMatcher(None, o_new.obligation_text, o_old.obligation_text).ratio()
            candidates.append((score, o_new, o_old))
            
    # Sort candidates by score descending
    candidates.sort(key=lambda x: x[0], reverse=True)
    logger.info("Candidate generation: Generated %d pairs.", len(candidates))
    
    # Log similarity scores
    for score, o_new, o_old in candidates:
        logger.debug("Similarity score: old_id=%d, new_id=%d, score=%.4f", o_old.id, o_new.id, score)
        
    # 5. Greedy highest-score matching
    matched_new = set()
    matched_old = set()
    results_to_save = []
    
    total_input_tokens = 0
    total_output_tokens = 0
    total_latency_ms = 0
    used_gemini = False
    
    api_key = settings.GEMINI_API_KEY
    model_name = settings.MODEL_NAME or "gemini-2.5-flash"
    is_mock_key = not api_key or api_key == "mock_api_key"
    
    for score, o_new, o_old in candidates:
        if o_new.id in matched_new or o_old.id in matched_old:
            continue
            
        if score >= 0.90:
            logger.info("Similarity score: old_id=%d, new_id=%d, score=%.4f (Immediate UNCHANGED)", o_old.id, o_new.id, score)
            matched_new.add(o_new.id)
            matched_old.add(o_old.id)
            results_to_save.append({
                "old_obligation_id": o_old.id,
                "new_obligation_id": o_new.id,
                "category": "unchanged",
                "semantic_verified": False,
                "similarity_score": score,
                "match_reason": f"Sequence similarity {score:.2f}"
            })
        elif score >= 0.55:
            # Ambiguous similarity, call Gemini
            logger.info("Similarity score: old_id=%d, new_id=%d, score=%.4f (Within [0.55, 0.90), calling Gemini)", o_old.id, o_new.id, score)
            
            gemini_failed = False
            gemini_response = None
            
            if is_mock_key:
                gemini_failed = True
                logger.warning("Gemini API key is missing or set to mock. Skipping semantic verification.")
            else:
                try:
                    logger.info("Gemini semantic check: comparing old_id=%d with new_id=%d", o_old.id, o_new.id)
                    classification, token_usage = call_gemini_semantic(
                        o_old.obligation_text,
                        o_new.obligation_text,
                        api_key,
                        model_name
                    )
                    used_gemini = True
                    total_input_tokens += token_usage["input_tokens"]
                    total_output_tokens += token_usage["output_tokens"]
                    total_latency_ms += token_usage["latency_ms"]
                    gemini_response = classification
                    logger.info("Gemini semantic checks: old_id=%d, new_id=%d, response=%s", o_old.id, o_new.id, classification)
                except Exception as e:
                    logger.error("Gemini semantic check failed for pair old_id=%d, new_id=%d: %s", o_old.id, o_new.id, str(e))
                    gemini_failed = True
                    
            if gemini_failed:
                logger.warning("Semantic verification skipped: Gemini client failed or unavailable. Fallback to SequenceMatcher only.")
                matched_new.add(o_new.id)
                matched_old.add(o_old.id)
                results_to_save.append({
                    "old_obligation_id": o_old.id,
                    "new_obligation_id": o_new.id,
                    "category": "changed",
                    "semantic_verified": False,
                    "similarity_score": score,
                    "match_reason": "Fallback heuristic (Gemini unavailable)"
                })
            else:
                if gemini_response == "same":
                    matched_new.add(o_new.id)
                    matched_old.add(o_old.id)
                    results_to_save.append({
                        "old_obligation_id": o_old.id,
                        "new_obligation_id": o_new.id,
                        "category": "unchanged",
                        "semantic_verified": True,
                        "similarity_score": score,
                        "match_reason": "Gemini classified as SAME"
                    })
                elif gemini_response == "changed":
                    matched_new.add(o_new.id)
                    matched_old.add(o_old.id)
                    results_to_save.append({
                        "old_obligation_id": o_old.id,
                        "new_obligation_id": o_new.id,
                        "category": "changed",
                        "semantic_verified": True,
                        "similarity_score": score,
                        "match_reason": "Gemini classified as CHANGED"
                    })
                elif gemini_response == "different":
                    # Rejection: continue checking other potential matches
                    logger.info("Gemini classified as DIFFERENT: pair old_id=%d, new_id=%d rejected.", o_old.id, o_new.id)
                    pass

    # 6. Unmatched obligations classified as NEW
    for o_new in new_obligations:
        if o_new.id not in matched_new:
            logger.info("Obligation new_id=%d has no matched counterpart (Immediate NEW)", o_new.id)
            results_to_save.append({
                "old_obligation_id": None,
                "new_obligation_id": o_new.id,
                "category": "new",
                "semantic_verified": False,
                "similarity_score": 0.0,
                "match_reason": "No similar obligation found"
            })
            
    # 7. Write to database
    logger.info("Database writes: Saving DiffSession and %d DiffResult rows", len(results_to_save))
    try:
        session_record = DiffSession(
            old_circular_id=old_circular_id,
            new_circular_id=new_circular_id
        )
        db.add(session_record)
        db.flush()  # Generate session ID
        
        for r in results_to_save:
            res = DiffResult(
                diff_session_id=session_record.id,
                old_circular_id=old_circular_id,
                new_circular_id=new_circular_id,
                category=r["category"],
                old_obligation_id=r["old_obligation_id"],
                new_obligation_id=r["new_obligation_id"],
                semantic_verified=r["semantic_verified"],
                similarity_score=r["similarity_score"],
                match_reason=r["match_reason"]
            )
            db.add(res)
            
        db.commit()
        db.refresh(session_record)
        logger.info("Database writes completed. Session ID: %d", session_record.id)
    except Exception as e:
        db.rollback()
        logger.error("Database failure: %s", str(e))
        raise HTTPException(status_code=500, detail="Database failure during diff engine persistence")
        
    new_count = sum(1 for r in results_to_save if r["category"] == "new")
    changed_count = sum(1 for r in results_to_save if r["category"] == "changed")
    unchanged_count = sum(1 for r in results_to_save if r["category"] == "unchanged")
    
    total_tokens = total_input_tokens + total_output_tokens
    response_source = "Gemini" if used_gemini else "SequenceMatcher"
    
    if used_gemini:
        logger.info(
            "Token Monitoring: Model=%s, Input Tokens=%d, Output Tokens=%d, Total Tokens=%d, Latency=%d ms, Response Source=%s",
            model_name, total_input_tokens, total_output_tokens, total_tokens, total_latency_ms, response_source
        )
    else:
        logger.info(
            "Token Monitoring: Model=None, Input Tokens=0, Output Tokens=0, Total Tokens=0, Latency=0 ms, Response Source=%s",
            response_source
        )
        
    response_time_ms = int((time.perf_counter() - start_run_time) * 1000)
    logger.info("Completion: Diff computation completed in %d ms.", response_time_ms)
    
    return {
        "diff_id": session_record.id,
        "new": new_count,
        "changed": changed_count,
        "unchanged": unchanged_count
    }
