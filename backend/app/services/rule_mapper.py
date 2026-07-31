import json
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import Literal

from backend.app.core.config import settings
from backend.app.models.models import DiffSession, DiffResult, Obligation, RuleMapping

logger = logging.getLogger("regpulse.rule_mapper")

# Resolve taxonomy path
TAXONOMY_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "rule_taxonomy.json"

def load_taxonomy() -> List[Dict[str, Any]]:
    """Loads the taxonomy parameters from the JSON file."""
    if not TAXONOMY_PATH.exists():
        logger.error("Taxonomy file not found at %s", TAXONOMY_PATH)
        return []
    try:
        with open(TAXONOMY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Failed to parse taxonomy JSON: %s", e)
        return []

# Load taxonomy mapping
TAXONOMY = load_taxonomy()
TAXONOMY_MAP = {item["param_id"]: item for item in TAXONOMY}

# Pydantic schema for Gemini structured response
class GeminiRuleMapping(BaseModel):
    matched_param_ids: List[str] = Field(
        description="List of param_id strings matching the obligation from the taxonomy. Return empty list if none match."
    )
    reasoning: str = Field(description="Explanation of why these parameters must be reviewed.")
    confidence: Literal["high", "medium", "low"] = Field(description="Confidence in the mapping.")
    implementation_priority: Literal["critical", "high", "medium", "low"] = Field(
        description="Priority/urgency of implementing the obligation."
    )

def get_mock_mapping(obligation_text: str) -> Dict[str, Any]:
    """Generates a deterministic mapping using keyword-based rules."""
    text_lower = obligation_text.lower()
    matched = []
    
    # Keyword rules specified by the user
    if "validation" in text_lower:
        matched.append("model_validation_cycle")
    if "explainability" in text_lower or "explain" in text_lower:
        matched.append("explainability_requirement")
    if "human oversight" in text_lower or "oversight" in text_lower or "human-in-the-loop" in text_lower:
        matched.append("human_oversight_checkpoint")
    if "vendor" in text_lower or "third-party" in text_lower or "third party" in text_lower:
        matched.append("vendor_model_accountability")
    if "kill switch" in text_lower or "kill-switch" in text_lower or "suspension" in text_lower:
        matched.append("kill_switch_config")
        
    # Extra keyword rules to match other taxonomy parameters
    if "weight" in text_lower:
        matched.append("kyc_risk_weight")
    if "review" in text_lower or "frequency" in text_lower or "periodic" in text_lower:
        if "kyc" in text_lower:
            matched.append("kyc_review_frequency")
        else:
            matched.append("model_validation_cycle")
    if "aml" in text_lower or "transaction" in text_lower or "threshold" in text_lower:
        matched.append("aml_txn_threshold")
    if "screening" in text_lower or "watchlist" in text_lower or "negative news" in text_lower:
        matched.append("screening_frequency")
    if "documentation" in text_lower or "model card" in text_lower:
        matched.append("model_documentation_standard")
    if "reporting" in text_lower or "sar" in text_lower or "suspicious" in text_lower:
        matched.append("suspicious_activity_reporting_sla")
    if "validity" in text_lower or "expiry" in text_lower:
        matched.append("document_validity_period")
    if "risk tier" in text_lower:
        matched.append("model_risk_tiering")
        
    # If no matches, fallback to model_validation_cycle
    if not matched:
        matched.append("model_validation_cycle")
        
    # Filter by actual taxonomy parameters
    valid_matched = [pid for pid in matched if pid in TAXONOMY_MAP]
    if not valid_matched:
        valid_matched = ["model_validation_cycle"]
        
    return {
        "matched_param_ids": valid_matched,
        "reasoning": f"Keyword-based heuristic match for parameters: {', '.join(valid_matched)}.",
        "confidence": "medium",
        "implementation_priority": "medium"
    }

def call_gemini_mapping(obligation_text: str, api_key: str, model_name: str) -> Tuple[GeminiRuleMapping, Dict[str, Any]]:
    """Calls Gemini with structured outputs to retrieve mapping recommendations."""
    client = genai.Client(api_key=api_key)
    
    # Construct taxonomy summary to supply in prompt
    taxonomy_description = "\n".join(
        [f"- {item['param_id']}: {item['name']} (layer: {item['layer']})" for item in TAXONOMY]
    )
    
    system_instruction = (
        "You are a banking compliance implementation specialist.\n"
        "Your task is to determine which configurable rule-engine parameters must be reviewed when implementing the following RBI regulatory obligation.\n"
        "Use ONLY the supplied taxonomy. Do NOT invent new parameters.\n\n"
        "Available Taxonomy Parameters:\n"
        f"{taxonomy_description}"
    )
    
    contents = f"RBI Regulatory Obligation:\n{obligation_text}"
    
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=0.0,
        response_mime_type="application/json",
        response_schema=GeminiRuleMapping,
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
        
    # Parse structured JSON from response text
    parsed_json = json.loads(response.text or "{}")
    result = GeminiRuleMapping(**parsed_json)
    
    token_usage = {
        "model_name": model_name,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
        "latency_ms": latency_ms,
    }
    
    return result, token_usage

def run_mapping_workflow(db: Session, diff_session_id: int) -> Dict[str, int]:
    """
    Executes the rule mapping workflow for a given diff session.
    Returns a summary of cache hits, generations, and invalid parameters removed.
    """
    # 1. Retrieve DiffSession
    diff_session = db.get(DiffSession, diff_session_id)
    if not diff_session:
        logger.error("DiffSession %d not found.", diff_session_id)
        raise HTTPException(status_code=404, detail="DiffSession not found")
        
    # 2. Find NEW + CHANGED obligations
    stmt_results = select(DiffResult).where(
        DiffResult.diff_session_id == diff_session_id,
        DiffResult.category.in_(["new", "changed"])
    )
    diff_results = db.execute(stmt_results).scalars().all()
    
    new_obligations = []
    for r in diff_results:
        if r.new_obligation:
            new_obligations.append(r.new_obligation)
            
    mapped_count = len(new_obligations)
    cached_count = 0
    generated_count = 0
    invalid_removed_count = 0
    
    api_key = settings.GEMINI_API_KEY
    model_name = settings.MODEL_NAME or "gemini-2.5-flash"
    is_mock_key = not api_key or api_key == "mock_api_key"
    
    for obligation in new_obligations:
        # Check cache: by obligation_id first
        stmt_mapping = select(RuleMapping).where(RuleMapping.obligation_id == obligation.id)
        existing_mapping = db.execute(stmt_mapping).scalar_one_or_none()
        
        if existing_mapping:
            logger.info("Cache hit for obligation_id %d in RuleMapping.", obligation.id)
            # Log Token Monitoring
            logger.info(
                "Token Monitoring: Model=None, Input Tokens=0, Output Tokens=0, Total Tokens=0, Latency=0 ms, Response Source=Database Cache"
            )
            cached_count += 1
            continue
            
        # Check cache: by obligation_text matching a mapped obligation
        stmt_text = select(RuleMapping).join(Obligation).where(
            Obligation.obligation_text == obligation.obligation_text
        )
        text_mapping = db.execute(stmt_text).scalars().first()
        
        if text_mapping:
            logger.info("Cache hit by text similarity for obligation_id %d.", obligation.id)
            # Clone mapping for this obligation_id
            cloned = RuleMapping(
                obligation_id=obligation.id,
                matched_param_ids=text_mapping.matched_param_ids,
                reasoning=text_mapping.reasoning,
                confidence=text_mapping.confidence,
                implementation_priority=text_mapping.implementation_priority,
                mapping_model=text_mapping.mapping_model,
                mapping_timestamp=datetime.utcnow(),
                affected_business_layer=text_mapping.affected_business_layer,
                mapping_source="database_cache", # cloned copy is database_cache
                review_required=text_mapping.review_required,
                match_score=text_mapping.match_score,
                mapping_version="v1.0"
            )
            db.add(cloned)
            db.commit()
            
            # Log Token Monitoring
            logger.info(
                "Token Monitoring: Model=None, Input Tokens=0, Output Tokens=0, Total Tokens=0, Latency=0 ms, Response Source=Database Cache"
            )
            cached_count += 1
            continue
            
        # Cache miss: generate mapping
        generated_count += 1
        mapping_data = None
        source_label = "gemini"
        
        if is_mock_key:
            logger.info("Mocking mapping for obligation %d (API key is mock).", obligation.id)
            mapping_data = get_mock_mapping(obligation.obligation_text)
            source_label = "mock"
            # Log Token Monitoring
            logger.info(
                "Token Monitoring: Model=None, Input Tokens=0, Output Tokens=0, Total Tokens=0, Latency=0 ms, Response Source=Mock Mode"
            )
        else:
            # Call Gemini with 1 retry
            gemini_success = False
            for attempt in range(2):
                try:
                    logger.info("Calling Gemini for mapping, attempt %d...", attempt + 1)
                    res, tokens = call_gemini_mapping(obligation.obligation_text, api_key, model_name)
                    
                    # Store mapping data
                    mapping_data = {
                        "matched_param_ids": res.matched_param_ids,
                        "reasoning": res.reasoning,
                        "confidence": res.confidence,
                        "implementation_priority": res.implementation_priority
                    }
                    gemini_success = True
                    
                    # Log Token Monitoring
                    logger.info(
                        "Token Monitoring: Model=%s, Input Tokens=%d, Output Tokens=%d, Total Tokens=%d, Latency=%d ms, Response Source=Gemini",
                        model_name, tokens["input_tokens"], tokens["output_tokens"], tokens["total_tokens"], tokens["latency_ms"]
                    )
                    break
                except Exception as e:
                    logger.error("Gemini mapping call failed (attempt %d): %s", attempt + 1, e)
                    
            if not gemini_success:
                logger.warning("Gemini failed after retries. Falling back to Mock Mode.")
                mapping_data = get_mock_mapping(obligation.obligation_text)
                source_label = "mock"
                # Log Token Monitoring
                logger.info(
                    "Token Monitoring: Model=None, Input Tokens=0, Output Tokens=0, Total Tokens=0, Latency=0 ms, Response Source=Mock Mode"
                )
                
        # Validate returned parameter IDs
        raw_param_ids = mapping_data["matched_param_ids"]
        valid_param_ids = []
        for pid in raw_param_ids:
            if pid in TAXONOMY_MAP:
                valid_param_ids.append(pid)
            else:
                invalid_removed_count += 1
                logger.warning("Filtered out invalid parameter ID: %s", pid)
                
        # If no valid parameter remains, default
        if not valid_param_ids:
            valid_param_ids = ["model_validation_cycle"]
            
        # Derive affected business layers
        unique_layers = set()
        for pid in valid_param_ids:
            layer = TAXONOMY_MAP[pid]["layer"]
            unique_layers.add(layer)
            
        # Derive review required
        conf = mapping_data["confidence"]
        review_req = conf in ("high", "medium")
        
        # Derive match score
        score_map = {"high": 0.95, "medium": 0.75, "low": 0.50}
        m_score = score_map.get(conf, 0.50)
        
        # Save to database
        db_mapping = RuleMapping(
            obligation_id=obligation.id,
            matched_param_ids=json.dumps(valid_param_ids),
            reasoning=mapping_data["reasoning"] or "No reasoning provided.",
            confidence=conf,
            implementation_priority=mapping_data["implementation_priority"],
            mapping_model=model_name if source_label == "gemini" else "mock",
            mapping_timestamp=datetime.utcnow(),
            affected_business_layer=json.dumps(list(unique_layers)),
            mapping_source=source_label,
            review_required=review_req,
            match_score=m_score,
            mapping_version="v1.0"
        )
        db.add(db_mapping)
        db.commit()
        
    return {
        "mapped": mapped_count,
        "cached": cached_count,
        "generated": generated_count,
        "invalid_parameters_removed": invalid_removed_count
    }
