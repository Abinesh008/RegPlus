import csv
import json
import io
import logging
from typing import List, Dict, Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.models import DiffResult, RuleMapping

logger = logging.getLogger("regpulse.csv_generator")

TAXONOMY_MAP = {
    "kyc_risk_weight": "Customer KYC Risk Weighting Formula",
    "kyc_review_frequency": "Periodic KYC Review Frequency",
    "aml_txn_threshold": "AML Transaction Monitoring Alert Thresholds",
    "screening_frequency": "Negative News Screening Frequency",
    "model_validation_cycle": "Independent Model Validation Cycle",
    "model_documentation_standard": "Model Documentation Standards",
    "human_oversight_checkpoint": "Human-in-the-Loop Checkpoints",
    "kill_switch_config": "Model Kill-Switch Configuration",
    "explainability_requirement": "Decision Explainability Reports",
    "vendor_model_accountability": "Third-Party Model Accountability",
    "suspicious_activity_reporting_sla": "SAR Filing SLA",
    "document_validity_period": "KYC Document Validity Period",
    "model_risk_tiering": "Model Risk Tier Classification"
}

def generate_compliance_csv(db: Session, diff_session_id: int) -> str:
    """Generates a CSV string representation of the Rule Impact Table."""
    logger.info("Starting CSV generation for DiffSession %d", diff_session_id)
    
    # Fetch NEW and CHANGED diff results
    stmt_results = select(DiffResult).where(
        DiffResult.diff_session_id == diff_session_id,
        DiffResult.category.in_(["new", "changed"])
    )
    diff_results = db.execute(stmt_results).scalars().all()
    
    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    
    # Write header
    writer.writerow([
        "Obligation",
        "Matched Parameters",
        "Business Layer",
        "Priority",
        "Confidence",
        "Review Required",
        "Match Score",
        "Reasoning"
    ])
    
    for r in diff_results:
        if not r.new_obligation:
            continue
            
        # Fetch stored mapping for this new_obligation
        stmt_mapping = select(RuleMapping).where(RuleMapping.obligation_id == r.new_obligation_id)
        mapping = db.execute(stmt_mapping).scalar_one_or_none()
        
        if mapping:
            try:
                matched_params_raw = json.loads(mapping.matched_param_ids)
            except Exception:
                matched_params_raw = [mapping.matched_param_ids]
                
            try:
                business_layers_raw = json.loads(mapping.affected_business_layer)
            except Exception:
                business_layers_raw = []
                
            # Expand parameter IDs to full labels
            matched_params_labels = [TAXONOMY_MAP.get(p, p) for p in matched_params_raw]
            matched_params_str = "; ".join(matched_params_labels)
            
            # Format business layers
            business_layers_str = "; ".join([l.replace('_', ' ').title() for l in business_layers_raw])
            
            # Write row
            writer.writerow([
                r.new_obligation.obligation_text,
                matched_params_str,
                business_layers_str,
                mapping.implementation_priority.upper(),
                mapping.confidence.upper(),
                "YES" if mapping.review_required else "NO",
                f"{mapping.match_score:.2f}",
                mapping.reasoning
            ])
            
    csv_str = output.getvalue()
    output.close()
    logger.info("CSV generation completed successfully for DiffSession %d", diff_session_id)
    return csv_str
