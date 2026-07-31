import os
import time
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from backend.app.main import app
from backend.app.db.session import Base, get_db
from backend.app.core.config import settings
from backend.app.models.models import Circular, Obligation
from backend.app.services.obligation_extractor import run_extraction_workflow

from sqlalchemy.pool import StaticPool

# Setup in-memory database for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency override
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

@pytest.fixture
def sample_circular():
    """Insert a sample circular into the test database."""
    db = TestingSessionLocal()
    circular = Circular(
        title="RBI Guidelines on AI Risk Management",
        version_date="2026-07-31",
        source_filename="test_circular.pdf",
        pdf_hash="samplehash123456",
        raw_text="The organization must establish a robust governance framework. Also, they must validate all models."
    )
    db.add(circular)
    db.commit()
    db.refresh(circular)
    db.close()
    return circular.id

def test_mock_mode_extraction(sample_circular):
    """Verify that Mock Mode is entered and returns deterministic obligations when API key is default/missing."""
    settings.GEMINI_API_KEY = "mock_api_key"
    db = TestingSessionLocal()
    
    circular = db.get(Circular, sample_circular)
    obligations = run_extraction_workflow(circular, db)
    
    assert len(obligations) == 2
    assert obligations[0].obligation_id_slug == f"MOCK-OBL-{sample_circular}-001"
    assert obligations[0].obligation_type == "governance"
    assert obligations[0].applies_to == "all_models"
    assert obligations[0].confidence_score == 0.95
    assert obligations[1].obligation_id_slug == f"MOCK-OBL-{sample_circular}-002"
    assert obligations[1].confidence_score == 0.85
    db.close()

def test_live_gemini_mode_mocked(mocker, sample_circular):
    """Verify standard extraction workflow when Gemini API is available and returns valid JSON on the first try."""
    settings.GEMINI_API_KEY = "valid_test_api_key"
    settings.MODEL_NAME = "gemini-2.5-flash"
    
    mock_client = mocker.Mock()
    mocker.patch("google.genai.Client", return_value=mock_client)
    
    # Mock successful response
    mock_response = mocker.Mock()
    mock_response.text = '[{"obligation_id": "OBL-REAL-001", "obligation_text": "Live text", "source_clause": "Sec 1", "obligation_type": "governance", "applies_to": "all_models", "confidence_score": 0.99}]'
    mock_response.usage_metadata = mocker.Mock(
        prompt_token_count=100,
        candidates_token_count=50,
        total_token_count=150
    )
    mock_client.models.generate_content.return_value = mock_response
    
    db = TestingSessionLocal()
    circular = db.get(Circular, sample_circular)
    obligations = run_extraction_workflow(circular, db)
    
    assert len(obligations) == 1
    assert obligations[0].obligation_id_slug == "OBL-REAL-001"
    assert obligations[0].obligation_text == "Live text"
    assert obligations[0].confidence_score == 0.99
    
    # Verify generate_content was called once
    mock_client.models.generate_content.assert_called_once()
    db.close()

def test_json_retry_success(mocker, sample_circular):
    """Verify that if JSON parsing fails on attempt 1, the engine retries and succeeds if attempt 2 succeeds."""
    settings.GEMINI_API_KEY = "valid_test_api_key"
    
    mock_client = mocker.Mock()
    mocker.patch("google.genai.Client", return_value=mock_client)
    mocker.patch("time.sleep", return_value=None) # Skip the 2s delay in tests
    
    # Attempt 1 returns invalid json, Attempt 2 returns valid json
    response_1 = mocker.Mock()
    response_1.text = "This is not JSON text."
    response_1.usage_metadata = None
    
    response_2 = mocker.Mock()
    response_2.text = '[{"obligation_id": "OBL-RETRY-002", "obligation_text": "Retry text", "source_clause": "Sec 2", "obligation_type": "documentation", "applies_to": "ai_ml_models_only", "confidence_score": 0.75}]'
    response_2.usage_metadata = mocker.Mock(
        prompt_token_count=120,
        candidates_token_count=60,
        total_token_count=180
    )
    
    mock_client.models.generate_content.side_effect = [response_1, response_2]
    
    db = TestingSessionLocal()
    circular = db.get(Circular, sample_circular)
    obligations = run_extraction_workflow(circular, db)
    
    assert len(obligations) == 1
    assert obligations[0].obligation_id_slug == "OBL-RETRY-002"
    assert obligations[0].obligation_text == "Retry text"
    assert obligations[0].confidence_score == 0.75
    
    # Assert generate_content was called twice
    assert mock_client.models.generate_content.call_count == 2
    db.close()

def test_json_retry_failure_fallback_to_mock(mocker, sample_circular):
    """Verify that if both attempts fail to produce valid JSON, it falls back to Mock Mode instead of crashing."""
    settings.GEMINI_API_KEY = "valid_test_api_key"
    
    mock_client = mocker.Mock()
    mocker.patch("google.genai.Client", return_value=mock_client)
    mocker.patch("time.sleep", return_value=None)
    
    response_1 = mocker.Mock()
    response_1.text = "Bad JSON 1"
    response_1.usage_metadata = None
    
    response_2 = mocker.Mock()
    response_2.text = "Bad JSON 2"
    response_2.usage_metadata = None
    
    mock_client.models.generate_content.side_effect = [response_1, response_2]
    
    db = TestingSessionLocal()
    circular = db.get(Circular, sample_circular)
    obligations = run_extraction_workflow(circular, db)
    
    # Fallback to Mock Mode obligations
    assert len(obligations) == 2
    assert obligations[0].obligation_id_slug == f"MOCK-OBL-{sample_circular}-001"
    db.close()

def test_cache_reuse_and_duplicate_prevention(mocker, sample_circular):
    """Verify cache reuse (subsequent calls bypass Gemini/Mock) and duplicate prevention."""
    settings.GEMINI_API_KEY = "valid_test_api_key"
    
    mock_client = mocker.Mock()
    mocker.patch("google.genai.Client", return_value=mock_client)
    
    mock_response = mocker.Mock()
    mock_response.text = '[{"obligation_id": "OBL-CACHE-01", "obligation_text": "Cache text", "source_clause": "Sec 1", "obligation_type": "governance", "applies_to": "all_models", "confidence_score": 0.8}]'
    mock_response.usage_metadata = None
    mock_client.models.generate_content.return_value = mock_response
    
    db = TestingSessionLocal()
    circular = db.get(Circular, sample_circular)
    
    # First extraction: Cache miss, hits Gemini
    obligations_1 = run_extraction_workflow(circular, db)
    assert len(obligations_1) == 1
    assert mock_client.models.generate_content.call_count == 1
    
    # Verify records in database
    stmt = select(Obligation).where(Obligation.circular_id == sample_circular)
    db_obs_1 = db.execute(stmt).scalars().all()
    assert len(db_obs_1) == 1
    
    # Second extraction: Cache hit, should not invoke Gemini
    obligations_2 = run_extraction_workflow(circular, db)
    assert len(obligations_2) == 1
    assert mock_client.models.generate_content.call_count == 1  # Still 1
    
    # Check that database records did not duplicate
    db_obs_2 = db.execute(stmt).scalars().all()
    assert len(db_obs_2) == 1
    db.close()

def test_api_endpoints_flow(mocker, sample_circular):
    """Verify HTTP POST extract and HTTP GET obligations endpoints."""
    settings.GEMINI_API_KEY = "mock_api_key"  # Runs in Mock Mode
    
    # 1. Post to extract
    response = client.post(f"/circulars/{sample_circular}/extract")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["obligation_id_slug"] == f"MOCK-OBL-{sample_circular}-001"
    assert data[0]["confidence_score"] == 0.95
    
    # 2. Get obligations
    response_get = client.get(f"/circulars/{sample_circular}/obligations")
    assert response_get.status_code == 200
    data_get = response_get.json()
    assert len(data_get) == 2
    assert data_get[0]["obligation_id_slug"] == f"MOCK-OBL-{sample_circular}-001"
    
    # 3. Requesting a non-existent circular
    response_404 = client.post("/circulars/99999/extract")
    assert response_404.status_code == 404
    
    response_get_404 = client.get("/circulars/99999/obligations")
    assert response_get_404.status_code == 404
