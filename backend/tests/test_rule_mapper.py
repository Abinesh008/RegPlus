import os
import json
import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.db.session import Base, get_db
from backend.app.core.config import settings
from backend.app.models.models import Circular, Obligation, DiffSession, DiffResult, RuleMapping
from backend.app.services.rule_mapper import run_mapping_workflow, get_mock_mapping

# Setup in-memory database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    """Recreate database tables before each test case."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(autouse=True)
def setup_dependency_override():
    """Ensure the local dependency override is active for client requests."""
    old_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    yield
    if old_override is not None:
        app.dependency_overrides[get_db] = old_override
    else:
        app.dependency_overrides.pop(get_db, None)

def create_test_data(db):
    """Creates a dummy DiffSession and DiffResults for testing."""
    old_c = Circular(title="Old", source_filename="old.pdf", raw_text="Old Circular text.")
    new_c = Circular(title="New", source_filename="new.pdf", raw_text="New Circular text.")
    db.add_all([old_c, new_c])
    db.commit()

    obl1 = Obligation(
        circular_id=new_c.id,
        obligation_id_slug="OBL-1",
        obligation_text="Establish independent validation cycle standard for critical risk tier models.",
        source_clause="1.1",
        obligation_type="governance",
        applies_to="all",
        confidence_score=0.95
    )
    obl2 = Obligation(
        circular_id=new_c.id,
        obligation_id_slug="OBL-2",
        obligation_text="Implement decision explainability requirements.",
        source_clause="1.2",
        obligation_type="explainability",
        applies_to="all",
        confidence_score=0.9
    )
    db.add_all([obl1, obl2])
    db.commit()

    diff_session = DiffSession(old_circular_id=old_c.id, new_circular_id=new_c.id)
    db.add(diff_session)
    db.commit()

    dr1 = DiffResult(
        diff_session_id=diff_session.id,
        old_circular_id=old_c.id,
        new_circular_id=new_c.id,
        category="new",
        old_obligation_id=None,
        new_obligation_id=obl1.id,
        semantic_verified=False,
        similarity_score=0.0,
        match_reason="New obligation"
    )
    dr2 = DiffResult(
        diff_session_id=diff_session.id,
        old_circular_id=old_c.id,
        new_circular_id=new_c.id,
        category="changed",
        old_obligation_id=None,
        new_obligation_id=obl2.id,
        semantic_verified=False,
        similarity_score=0.0,
        match_reason="Changed obligation"
    )
    db.add_all([dr1, dr2])
    db.commit()

    return diff_session.id, obl1, obl2

def test_mock_mapping_heuristics():
    """Verify deterministic mock keyword-based mapping rules."""
    # Test 'validation' mapping to 'model_validation_cycle'
    res_val = get_mock_mapping("The model validation cycle must be independent.")
    assert "model_validation_cycle" in res_val["matched_param_ids"]
    assert res_val["confidence"] == "medium"
    assert res_val["implementation_priority"] == "medium"

    # Test 'explainability' mapping to 'explainability_requirement'
    res_exp = get_mock_mapping("Decision explainability is required for all outputs.")
    assert "explainability_requirement" in res_exp["matched_param_ids"]

    # Test 'human oversight' mapping to 'human_oversight_checkpoint'
    res_human = get_mock_mapping("Must have human oversight checkpoints in approvals.")
    assert "human_oversight_checkpoint" in res_human["matched_param_ids"]

    # Test 'vendor' mapping to 'vendor_model_accountability'
    res_vendor = get_mock_mapping("Third-party vendor model accountability is tracked.")
    assert "vendor_model_accountability" in res_vendor["matched_param_ids"]

    # Test 'kill switch' mapping to 'kill_switch_config'
    res_kill = get_mock_mapping("Configure a kill switch config suspension.")
    assert "kill_switch_config" in res_kill["matched_param_ids"]

    # Test multi-parameter mapping if multiple keywords are present
    res_multi = get_mock_mapping("Need model validation and decision explainability reports.")
    assert "model_validation_cycle" in res_multi["matched_param_ids"]
    assert "explainability_requirement" in res_multi["matched_param_ids"]

def test_workflow_with_mock_mode():
    """Verify workflow executes with mock mode when API key is set to mock."""
    db = TestingSessionLocal()
    diff_session_id, obl1, obl2 = create_test_data(db)

    settings.GEMINI_API_KEY = "mock_api_key"
    
    summary = run_mapping_workflow(db, diff_session_id)
    
    assert summary["mapped"] == 2
    assert summary["cached"] == 0
    assert summary["generated"] == 2
    assert summary["invalid_parameters_removed"] == 0

    # Retrieve from DB to verify columns
    stmt = select(RuleMapping).where(RuleMapping.obligation_id == obl1.id)
    mapping = db.execute(stmt).scalar_one()
    
    assert mapping.mapping_source == "mock"
    assert mapping.mapping_model == "mock"
    assert mapping.confidence == "medium"
    assert mapping.implementation_priority == "medium"
    assert mapping.review_required is True
    assert mapping.match_score == 0.75
    assert mapping.mapping_version == "v1.0"
    
    # Layer derived from model_validation_cycle is 'governance'
    layers = json.loads(mapping.affected_business_layer)
    assert "governance" in layers

    db.close()

def test_gemini_mapping_success(mocker):
    """Verify successful Gemini call with structured output and param validation."""
    db = TestingSessionLocal()
    diff_session_id, obl1, obl2 = create_test_data(db)

    settings.GEMINI_API_KEY = "valid_api_key"
    
    mock_client = mocker.Mock()
    mocker.patch("google.genai.Client", return_value=mock_client)
    
    mock_response = mocker.Mock()
    # Return structured output with one valid parameter and one invalid parameter (invented)
    mock_response.text = json.dumps({
        "matched_param_ids": ["model_validation_cycle", "invalid_param_xyz"],
        "reasoning": "Standard validation cycles apply.",
        "confidence": "high",
        "implementation_priority": "critical"
    })
    mock_response.usage_metadata = mocker.Mock(
        prompt_token_count=120, candidates_token_count=35, total_token_count=155
    )
    mock_client.models.generate_content.return_value = mock_response

    summary = run_mapping_workflow(db, diff_session_id)
    
    # Check that both generated, and the invalid parameter 'invalid_param_xyz' was removed (1 from each generation -> 2 total)
    assert summary["mapped"] == 2
    assert summary["generated"] == 2
    assert summary["invalid_parameters_removed"] == 2  # one invalid param removed per obligation

    # Verify db mapping content
    stmt = select(RuleMapping).where(RuleMapping.obligation_id == obl1.id)
    mapping = db.execute(stmt).scalar_one()
    
    assert mapping.mapping_source == "gemini"
    assert "model_validation_cycle" in json.loads(mapping.matched_param_ids)
    assert "invalid_param_xyz" not in json.loads(mapping.matched_param_ids)
    assert mapping.confidence == "high"
    assert mapping.review_required is True  # high confidence -> review_required = True
    assert mapping.match_score == 0.95
    assert mapping.implementation_priority == "critical"
    
    db.close()

def test_gemini_retry_and_mock_fallback(mocker):
    """Verify that if Gemini fails, it retries once, and then falls back to Mock Mode."""
    db = TestingSessionLocal()
    diff_session_id, obl1, obl2 = create_test_data(db)

    settings.GEMINI_API_KEY = "valid_api_key"
    mock_client = mocker.Mock()
    mocker.patch("google.genai.Client", return_value=mock_client)
    
    # Make call fail with exception
    mock_client.models.generate_content.side_effect = Exception("API Quota Limit Exceeded")
    
    summary = run_mapping_workflow(db, diff_session_id)
    
    # Verify generate_content was called twice for each obligation (try + 1 retry)
    assert mock_client.models.generate_content.call_count == 4
    
    # Verify fallback to mock was successful
    assert summary["generated"] == 2
    stmt = select(RuleMapping).where(RuleMapping.obligation_id == obl1.id)
    mapping = db.execute(stmt).scalar_one()
    assert mapping.mapping_source == "mock"
    
    db.close()

def test_cache_reuse_and_text_cloning():
    """Verify that mapping cache works by both obligation_id and matching obligation_text."""
    db = TestingSessionLocal()
    diff_session_id, obl1, obl2 = create_test_data(db)

    # 1. Manually insert a mapping for obl1
    mapping1 = RuleMapping(
        obligation_id=obl1.id,
        matched_param_ids=json.dumps(["model_validation_cycle"]),
        reasoning="Pre-existing reasoning",
        confidence="low",
        implementation_priority="low",
        mapping_model="mock",
        mapping_timestamp=datetime.utcnow(),
        affected_business_layer=json.dumps(["governance"]),
        mapping_source="mock",
        review_required=False,
        match_score=0.50,
        mapping_version="v1.0"
    )
    db.add(mapping1)
    db.commit()

    # 2. Run mapping. obl1 should hit cache directly. obl2 will run mock mapping.
    settings.GEMINI_API_KEY = "mock_api_key"
    summary = run_mapping_workflow(db, diff_session_id)
    assert summary["cached"] == 1
    assert summary["generated"] == 1

    # 3. Create a new obligation in a new circular/session that has the EXACT same text as obl2
    new_c_2 = Circular(title="Newer", source_filename="newer.pdf", raw_text="Another text.")
    db.add(new_c_2)
    db.commit()
    obl3 = Obligation(
        circular_id=new_c_2.id,
        obligation_id_slug="OBL-3",
        obligation_text=obl2.obligation_text,  # exact same text as obl2
        source_clause="2.1",
        obligation_type="explainability",
        applies_to="all",
        confidence_score=0.88
    )
    db.add(obl3)
    db.commit()

    diff_session_2 = DiffSession(old_circular_id=new_c_2.id, new_circular_id=new_c_2.id)
    db.add(diff_session_2)
    db.commit()

    dr3 = DiffResult(
        diff_session_id=diff_session_2.id,
        old_circular_id=None,
        new_circular_id=new_c_2.id,
        category="new",
        old_obligation_id=None,
        new_obligation_id=obl3.id,
        semantic_verified=False,
        similarity_score=0.0,
        match_reason="Newer obligation"
    )
    db.add(dr3)
    db.commit()

    # Run mapping for diff_session_2. Since obl3 matches obl2 text, it should clone mapping as cache hit.
    summary_2 = run_mapping_workflow(db, diff_session_2.id)
    assert summary_2["cached"] == 1
    assert summary_2["generated"] == 0

    # Verify that the cloned mapping was saved with mapping_source='database_cache'
    stmt = select(RuleMapping).where(RuleMapping.obligation_id == obl3.id)
    mapping3 = db.execute(stmt).scalar_one()
    assert mapping3.mapping_source == "database_cache"
    assert mapping3.mapping_version == "v1.0"

    db.close()

def test_api_endpoints_flow(mocker):
    """Verify that POST /diff/{id}/map and GET /diff/{id}/mappings endpoints return expected formats."""
    db = TestingSessionLocal()
    diff_session_id, obl1, obl2 = create_test_data(db)
    db.close()

    settings.GEMINI_API_KEY = "mock_api_key"

    # 1. Test POST /diff/{diff_id}/map
    response_post = client.post(f"/diff/{diff_session_id}/map")
    assert response_post.status_code == 200
    data_post = response_post.json()
    assert data_post["mapped"] == 2
    assert data_post["cached"] == 0
    assert data_post["generated"] == 2
    assert data_post["invalid_parameters_removed"] == 0

    # 2. Test GET /diff/{diff_id}/mappings
    response_get = client.get(f"/diff/{diff_session_id}/mappings")
    assert response_get.status_code == 200
    data_get = response_get.json()
    assert len(data_get) == 2
    
    # Assert keys and formats in the response list
    mapping = data_get[0]
    assert "obligation" in mapping
    assert "matched_parameters" in mapping
    assert isinstance(mapping["matched_parameters"], list)
    assert "confidence" in mapping
    assert "priority" in mapping
    assert "reasoning" in mapping
    assert "affected_business_layer" in mapping
    assert isinstance(mapping["affected_business_layer"], list)
    assert "mapping_source" in mapping
    assert "review_required" in mapping
    assert "match_score" in mapping
    assert "mapping_version" in mapping
    assert mapping["mapping_version"] == "v1.0"

    # 3. Test non-existent DiffSession
    response_404 = client.post("/diff/99999/map")
    assert response_404.status_code == 404
    
    response_404_get = client.get("/diff/99999/mappings")
    assert response_404_get.status_code == 404
