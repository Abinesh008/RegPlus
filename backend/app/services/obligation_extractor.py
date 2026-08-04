import logging
import time
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, TypeAdapter
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from google import genai
from google.genai import types

from backend.app.core.config import settings
from backend.app.models.models import Obligation, Circular

logger = logging.getLogger("regpulse.obligation_extractor")

# Define prompt constants exactly as requested
SYSTEM_PROMPT = """You are an RBI Regulatory Compliance Analyst.

Read the RBI circular carefully.

Extract EVERY actionable compliance obligation.

Ignore:

Background

Definitions

History

Examples

Explanations

Only extract obligations that require an organization to perform, maintain, review, document, validate or report something.

Return STRICT JSON.

No markdown.

No explanation.

JSON schema:

[
  {
    "obligation_id":"string",
    "obligation_text":"string",
    "source_clause":"string",
    "obligation_type":"governance | documentation | validation | explainability | oversight | reporting | risk_tiering | other",
    "applies_to":"all_models | ai_ml_models_only | high_risk_models_only | vendor_supplied_models | general"
  }
]"""

class ObligationItem(BaseModel):
    obligation_id: str
    obligation_text: str
    source_clause: str
    obligation_type: Literal[
        "governance", "documentation", "validation", "explainability",
        "oversight", "reporting", "risk_tiering", "other"
    ]
    applies_to: Literal[
        "all_models", "ai_ml_models_only", "high_risk_models_only",
        "vendor_supplied_models", "general"
    ]
    confidence_score: float = Field(..., ge=0.0, le=1.0)

class ObligationListWrapper(BaseModel):
    obligations: List[ObligationItem] = Field(
        description="List of compliance obligations extracted from the circular text"
    )

def extract_obligations_mock(circular_text: str, circular_id: int) -> List[ObligationItem]:
    """Generates a deterministic set of mock obligations for a circular."""
    logger.info("Mock Mode: Generating deterministic obligations for circular ID %d", circular_id)
    # Simple deterministic selection based on circular_id
    return [
        ObligationItem(
            obligation_id=f"MOCK-OBL-{circular_id}-001",
            obligation_text="The organization must establish a robust governance framework for AI/ML models.",
            source_clause="Paragraph 3.1",
            obligation_type="governance",
            applies_to="all_models",
            confidence_score=0.95
        ),
        ObligationItem(
            obligation_id=f"MOCK-OBL-{circular_id}-002",
            obligation_text="All model validation reports must be documented and maintained for audit trail.",
            source_clause="Paragraph 4.2",
            obligation_type="documentation",
            applies_to="ai_ml_models_only",
            confidence_score=0.85
        )
    ]

def parse_and_validate_json(json_str: str) -> List[ObligationItem]:
    """Cleans and validates the JSON response using Pydantic."""
    cleaned = json_str.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    # Try parsing as ObligationListWrapper first, fallback to List[ObligationItem] directly if wrapper fails
    try:
        wrapper = ObligationListWrapper.model_validate_json(cleaned)
        return wrapper.obligations
    except Exception as wrapper_err:
        logger.debug("Failed to parse as ObligationListWrapper: %s. Attempting fallback parse of direct list.", wrapper_err)
        return TypeAdapter(List[ObligationItem]).validate_json(cleaned)

def run_extraction_workflow(circular: Circular, db: Session) -> List[Obligation]:
    """Core workflow to extract compliance obligations from a circular.
    Handles caching, Live Gemini Mode with structured output, 2-second retries with backoff,
    graceful Mock Mode fallback, database persistence, and token usage logging.
    """
    circular_id = circular.id
    cleaned_text = circular.raw_text
    
    # 1. Check database cache
    logger.info("Checking cache for circular ID %d", circular_id)
    stmt = select(Obligation).where(Obligation.circular_id == circular_id)
    existing_obligations = db.execute(stmt).scalars().all()
    if existing_obligations:
        logger.info("Cache hit: Returning stored obligations for circular ID %d", circular_id)
        # Log monitoring entry for cache hit
        logger.info(
            "Monitoring Log: Source: Database Cache | Model: None | Input Tokens: N/A | Output Tokens: N/A | Total Tokens: N/A | Response Time: 0 ms"
        )
        return list(existing_obligations)
        
    logger.info("Cache miss: Obligation extraction required for circular ID %d", circular_id)
    
    # Determine model name and API key
    model_name = settings.MODEL_NAME or "gemini-2.5-flash"
    api_key = settings.GEMINI_API_KEY
    
    # Check if API key is missing or is the default mock key
    is_mock_key = not api_key or api_key == "mock_api_key"
    
    parsed_items: Optional[List[ObligationItem]] = None
    source = "Gemini"
    response_time_ms = 0
    input_tokens = None
    output_tokens = None
    total_tokens = None
    
    if is_mock_key:
        logger.info("GEMINI_API_KEY is missing or set to default mock. Automatically entering Mock Mode.")
        start_time = time.perf_counter()
        parsed_items = extract_obligations_mock(cleaned_text, circular_id)
        response_time_ms = int((time.perf_counter() - start_time) * 1000)
        source = "Mock Mode"
    else:
        # We have an API key. Attempt live Gemini extraction.
        client = None
        try:
            client = genai.Client(api_key=api_key)
        except Exception as init_err:
            logger.error("Failed to initialize Gemini Client: %s. Falling back to Mock Mode.", init_err)
            is_mock_key = True
            
        if client:
            # Configure response schema for structured output
            try:
                config = types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    response_schema=ObligationListWrapper
                )
            except Exception as config_err:
                logger.warning("Could not set response_schema config: %s. Falling back to JSON mime type only.", config_err)
                config = types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json"
                )
                
            start_time = time.perf_counter()
            
            # First attempt
            response = None
            try:
                logger.info("Gemini request: Sending extraction request to model %s", model_name)
                response = client.models.generate_content(
                    model=model_name,
                    contents=cleaned_text,
                    config=config
                )
                logger.info("Gemini response received")
                if response and response.text:
                    parsed_items = parse_and_validate_json(response.text)
                    logger.info("JSON validation succeeded on attempt 1")
            except Exception as e:
                logger.warning("Attempt 1 failed (Exception or JSON validation error): %s", e)
                
            # Retry if attempt 1 failed
            if parsed_items is None:
                logger.info("Waiting 2 seconds before retry...")
                time.sleep(2.0)
                try:git add .
git commit -m "Fix Gemini integration and frontend status verification"
                    logger.info("Gemini request (Retry): Sending retry request to model %s", model_name)
                    # Use a fresh call or multi-turn history.
                    # As requested: retry prompt: "Return ONLY valid JSON. No explanation. No markdown."
                    # If we had a partial response but it failed validation, we can supply history.
                    # Otherwise we retry the original call.
                    if response and response.text:
                        contents_history = [
                            types.Content(role="user", parts=[types.Part(text=cleaned_text)]),
                            types.Content(role="model", parts=[types.Part(text=response.text)]),
                            types.Content(role="user", parts=[types.Part(text="Return ONLY valid JSON.\nNo explanation.\nNo markdown.")])
                        ]
                    else:
                        contents_history = cleaned_text
                        
                    response = client.models.generate_content(
                        model=model_name,
                        contents=contents_history,
                        config=config
                    )
                    logger.info("Gemini retry response received")
                    if response and response.text:
                        parsed_items = parse_and_validate_json(response.text)
                        logger.info("JSON validation succeeded on retry attempt")
                except Exception as e_retry:
                    logger.error("Gemini retry attempt failed: %s. Falling back to Mock Mode.", e_retry)
            
            response_time_ms = int((time.perf_counter() - start_time) * 1000)
            
            # Extract token usage if available
            if response:
                if hasattr(response, "usage_metadata") and response.usage_metadata:
                    input_tokens = getattr(response.usage_metadata, "prompt_token_count", None)
                    output_tokens = getattr(response.usage_metadata, "candidates_token_count", None)
                    total_tokens = getattr(response.usage_metadata, "total_token_count", None)
                    
            if parsed_items is None:
                logger.warning("Both attempts to query/parse Gemini failed. Gracefully falling back to Mock Mode.")
                parsed_items = extract_obligations_mock(cleaned_text, circular_id)
                source = "Mock Mode"
                
    # Log monitoring and token usage
    logger.info(
        "Monitoring Log: Source: %s | Model: %s | Input Tokens: %s | Output Tokens: %s | Total Tokens: %s | Response Time: %d ms",
        source,
        model_name if source == "Gemini" else "None",
        input_tokens if input_tokens is not None else "N/A",
        output_tokens if output_tokens is not None else "N/A",
        total_tokens if total_tokens is not None else "N/A",
        response_time_ms
    )
    
    # 5. Store obligations
    logger.info("Database insert: Saving %d extracted obligations for circular ID %d", len(parsed_items), circular_id)
    
    # Delete existing obligations to prevent duplicates/conflicts (defensive design)
    db.execute(delete(Obligation).where(Obligation.circular_id == circular_id))
    
    db_obligations: List[Obligation] = []
    for item in parsed_items:
        db_obl = Obligation(
            circular_id=circular_id,
            obligation_id_slug=item.obligation_id,
            obligation_text=item.obligation_text,
            source_clause=item.source_clause,
            obligation_type=item.obligation_type,
            applies_to=item.applies_to,
            confidence_score=item.confidence_score
        )
        db.add(db_obl)
        db_obligations.append(db_obl)
        
    db.commit()
    
    # Refresh to load database IDs
    for db_obl in db_obligations:
        db.refresh(db_obl)
        
    logger.info("Extraction completed successfully for circular ID %d", circular_id)
    return db_obligations
