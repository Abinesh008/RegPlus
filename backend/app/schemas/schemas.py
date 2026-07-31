from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict

# Circular Schemas
class CircularBase(BaseModel):
    title: str
    version_date: str
    source_filename: str
    raw_text: str

class CircularCreate(CircularBase):
    pass

class CircularResponse(CircularBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# Obligation Schemas
class ObligationBase(BaseModel):
    obligation_id_slug: str
    obligation_text: str
    source_clause: str
    obligation_type: str
    applies_to: str

class ObligationCreate(ObligationBase):
    pass

class ObligationResponse(ObligationBase):
    id: int
    circular_id: int

    model_config = ConfigDict(from_attributes=True)

# DiffResult Schemas
class DiffResultBase(BaseModel):
    category: str  # "new", "changed", "unchanged"

class DiffResultResponse(DiffResultBase):
    id: int
    old_circular_id: Optional[int] = None
    new_circular_id: int
    old_obligation_id: Optional[int] = None
    new_obligation_id: int

    model_config = ConfigDict(from_attributes=True)

# RuleMapping Schemas
class RuleMappingBase(BaseModel):
    reasoning: str
    confidence: str

class RuleMappingResponse(RuleMappingBase):
    id: int
    obligation_id: int
    matched_param_ids: List[str]

    model_config = ConfigDict(from_attributes=True)
