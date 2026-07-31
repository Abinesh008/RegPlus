import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.db.session import Base, get_db
from backend.app.core.config import settings
from backend.app.models.models import Circular, Obligation, DiffSession, DiffResult
from backend.app.services.diff_engine import diff_circulars

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

def create_circular(db, title, text, source_filename, pdf_hash):
    circular = Circular(
        title=title,
        version_date="2026-07-31",
        source_filename=source_filename,
        pdf_hash=pdf_hash,
        raw_text=text
    )
    db.add(circular)
    db.commit()
    db.refresh(circular)
    return circular

def create_obligation(db, circular_id, slug, text):
    obligation = Obligation(
        circular_id=circular_id,
        obligation_id_slug=slug,
        obligation_text=text,
        source_clause="Paragraph 1",
        obligation_type="governance",
        applies_to="all_models",
        confidence_score=0.9
    )
    db.add(obligation)
    db.commit()
    db.refresh(obligation)
    return obligation

def test_sequence_matcher_thresholds():
    """Verify that SequenceMatcher thresholds classify immediately without Gemini."""
    db = TestingSessionLocal()
    
    # Create circulars
    old_c = create_circular(db, "Old Circ", "Text 1", "old.pdf", "hash1")
    new_c = create_circular(db, "New Circ", "Text 2", "new.pdf", "hash2")
    
    # 1. Similarity > 0.90 -> UNCHANGED (Immediate)
    # Obligation texts are identical (similarity 1.0)
    create_obligation(db, old_c.id, "OBL-OLD-1", "The board must review validation reports quarterly.")
    create_obligation(db, new_c.id, "OBL-NEW-1", "The board must review validation reports quarterly.")
    
    # 2. Similarity < 0.55 -> NEW (Immediate)
    # Completely different texts
    create_obligation(db, old_c.id, "OBL-OLD-2", "Submit annual reports of model weights to the regulator.")
    create_obligation(db, new_c.id, "OBL-NEW-2", "Maintain log of data preprocessing pipelines for review.")
    
    # Run diff (GEMINI key is mock, so it won't affect immediate matches)
    settings.GEMINI_API_KEY = "mock_api_key"
    res = diff_circulars(db, old_c.id, new_c.id)
    
    # We have:
    # - OBL-NEW-1 (matching OBL-OLD-1, similarity 1.0 -> UNCHANGED)
    # - OBL-NEW-2 (similarity with old ones is < 0.55 -> NEW)
    # Wait, let's look at similarity of OBL-NEW-2 with OLD-1 and OLD-2:
    # "Maintain log of data preprocessing pipelines for review." has similarity < 0.55 with:
    # "The board must review validation reports quarterly." and
    # "Submit annual reports of model weights to the regulator."
    # So OBL-NEW-2 is NEW.
    assert res["unchanged"] == 1
    assert res["new"] == 1
    assert res["changed"] == 0
    
    # Check stored results
    stmt = select(DiffResult).where(DiffResult.diff_session_id == res["diff_id"])
    db_results = db.execute(stmt).scalars().all()
    assert len(db_results) == 2
    
    new_items = [r for r in db_results if r.category == "new"]
    unchanged_items = [r for r in db_results if r.category == "unchanged"]
    
    assert len(new_items) == 1
    assert new_items[0].semantic_verified is False
    assert new_items[0].match_reason == "No similar obligation found"
    
    assert len(unchanged_items) == 1
    assert unchanged_items[0].semantic_verified is False
    assert unchanged_items[0].similarity_score == 1.0
    assert "Sequence similarity" in unchanged_items[0].match_reason
    db.close()

def test_gemini_semantic_verification(mocker):
    """Verify that ambiguous similarity (0.55-0.90) triggers Gemini and behaves accordingly."""
    db = TestingSessionLocal()
    
    old_c = create_circular(db, "Old Circ", "Text 1", "old.pdf", "hash1")
    new_c = create_circular(db, "New Circ", "Text 2", "new.pdf", "hash2")
    
    # Similarity between 0.55 and 0.90:
    # "The board must review validation reports quarterly." vs "The board of directors shall review validation reports annually."
    create_obligation(db, old_c.id, "OBL-OLD-1", "The board must review validation reports quarterly.")
    create_obligation(db, new_c.id, "OBL-NEW-1", "The board of directors shall review validation reports annually.")
    
    # We will test three scenarios by mocking Gemini's responses
    settings.GEMINI_API_KEY = "valid_api_key"
    mock_client = mocker.Mock()
    mocker.patch("google.genai.Client", return_value=mock_client)
    
    # Scenario A: Gemini returns "same" -> UNCHANGED
    mock_response = mocker.Mock()
    mock_response.text = "same"
    mock_response.usage_metadata = mocker.Mock(
        prompt_token_count=10, candidates_token_count=1, total_token_count=11
    )
    mock_client.models.generate_content.return_value = mock_response
    
    res_a = diff_circulars(db, old_c.id, new_c.id)
    assert res_a["unchanged"] == 1
    assert res_a["changed"] == 0
    assert res_a["new"] == 0
    
    stmt = select(DiffResult).where(DiffResult.diff_session_id == res_a["diff_id"])
    db_res_a = db.execute(stmt).scalars().all()
    assert db_res_a[0].category == "unchanged"
    assert db_res_a[0].semantic_verified is True
    assert db_res_a[0].match_reason == "Gemini classified as SAME"
    
    # Clean database caches/sessions for next run
    db.query(DiffResult).delete()
    db.query(DiffSession).delete()
    db.commit()
    
    # Scenario B: Gemini returns "changed" -> CHANGED
    mock_response.text = "changed"
    res_b = diff_circulars(db, old_c.id, new_c.id)
    assert res_b["unchanged"] == 0
    assert res_b["changed"] == 1
    assert res_b["new"] == 0
    
    stmt = select(DiffResult).where(DiffResult.diff_session_id == res_b["diff_id"])
    db_res_b = db.execute(stmt).scalars().all()
    assert db_res_b[0].category == "changed"
    assert db_res_b[0].semantic_verified is True
    assert db_res_b[0].match_reason == "Gemini classified as CHANGED"
    
    # Clean database caches/sessions for next run
    db.query(DiffResult).delete()
    db.query(DiffSession).delete()
    db.commit()
    
    # Scenario C: Gemini returns "different" -> NEW
    mock_response.text = "different"
    res_c = diff_circulars(db, old_c.id, new_c.id)
    # Since they are different, they are not matched, and OBL-NEW-1 remains unmatched -> NEW
    assert res_c["unchanged"] == 0
    assert res_c["changed"] == 0
    assert res_c["new"] == 1
    
    stmt = select(DiffResult).where(DiffResult.diff_session_id == res_c["diff_id"])
    db_res_c = db.execute(stmt).scalars().all()
    assert db_res_c[0].category == "new"
    assert db_res_c[0].semantic_verified is False  # Rejected matches end up as NEW with semantic_verified=False
    assert db_res_c[0].match_reason == "No similar obligation found"
    
    db.close()

def test_greedy_highest_score_matching():
    """Verify greedy highest-score matching and duplicate matching prevention."""
    db = TestingSessionLocal()
    
    old_c = create_circular(db, "Old Circ", "Text 1", "old.pdf", "hash1")
    new_c = create_circular(db, "New Circ", "Text 2", "new.pdf", "hash2")
    
    # Old circular obligations:
    # 1. "The board must review validation reports quarterly."
    # 2. "The board must review validation reports every month."
    create_obligation(db, old_c.id, "OBL-OLD-1", "The board must review validation reports quarterly.")
    create_obligation(db, old_c.id, "OBL-OLD-2", "The board must review validation reports every month.")
    
    # New circular obligation:
    # "The board must review validation reports quarterly."
    # This should match OBL-OLD-1 (similarity 1.0) rather than OBL-OLD-2 (similarity ~0.80).
    create_obligation(db, new_c.id, "OBL-NEW-1", "The board must review validation reports quarterly.")
    
    settings.GEMINI_API_KEY = "mock_api_key"
    res = diff_circulars(db, old_c.id, new_c.id)
    
    assert res["unchanged"] == 1  # Matches OLD-1
    assert res["new"] == 0
    
    # Check that OBL-NEW-1 is matched to OBL-OLD-1
    stmt = select(DiffResult).where(DiffResult.diff_session_id == res["diff_id"])
    db_res = db.execute(stmt).scalars().all()
    assert len(db_res) == 1
    
    # Find obligations matched
    old_obligation = db.get(Obligation, db_res[0].old_obligation_id)
    assert old_obligation.obligation_id_slug == "OBL-OLD-1"
    
    db.close()

def test_fallback_mode_gemini_unavailable(mocker):
    """Verify that when Gemini is unavailable, 0.55-0.90 similarity matches default to category='changed' with semantic_verified=False."""
    db = TestingSessionLocal()
    
    old_c = create_circular(db, "Old Circ", "Text 1", "old.pdf", "hash1")
    new_c = create_circular(db, "New Circ", "Text 2", "new.pdf", "hash2")
    
    # Similarity between 0.55 and 0.90:
    create_obligation(db, old_c.id, "OBL-OLD-1", "The board must review validation reports quarterly.")
    create_obligation(db, new_c.id, "OBL-NEW-1", "The board of directors shall review validation reports annually.")
    
    # Simulate Gemini failure by raising an exception
    settings.GEMINI_API_KEY = "valid_api_key"
    mock_client = mocker.Mock()
    mocker.patch("google.genai.Client", return_value=mock_client)
    mock_client.models.generate_content.side_effect = Exception("Quota Exceeded")
    
    res = diff_circulars(db, old_c.id, new_c.id)
    
    # Fallback classifies the match as CHANGED (category="changed") but with semantic_verified=False
    assert res["changed"] == 1
    assert res["unchanged"] == 0
    assert res["new"] == 0
    
    stmt = select(DiffResult).where(DiffResult.diff_session_id == res["diff_id"])
    db_res = db.execute(stmt).scalars().all()
    assert db_res[0].category == "changed"
    assert db_res[0].semantic_verified is False
    assert db_res[0].match_reason == "Fallback heuristic (Gemini unavailable)"
    
    db.close()

def test_database_caching(mocker):
    """Verify caching works: subsequent calls for the same circular pair never call SequenceMatcher or Gemini."""
    db = TestingSessionLocal()
    
    old_c = create_circular(db, "Old Circ", "Text 1", "old.pdf", "hash1")
    new_c = create_circular(db, "New Circ", "Text 2", "new.pdf", "hash2")
    
    create_obligation(db, old_c.id, "OBL-OLD-1", "The board must review validation reports quarterly.")
    create_obligation(db, new_c.id, "OBL-NEW-1", "The board must review validation reports quarterly.")
    
    # 1st run: Cache miss, computes diff
    res_1 = diff_circulars(db, old_c.id, new_c.id)
    assert res_1["unchanged"] == 1
    
    # Modify the obligation text of new circular in DB (if caching didn't work, re-running would recalculate and give different results or fail)
    new_obl = db.execute(select(Obligation).where(Obligation.circular_id == new_c.id)).scalar_one()
    new_obl.obligation_text = "Completely different text now."
    db.commit()
    
    # 2nd run: Cache hit, returns cached result
    res_2 = diff_circulars(db, old_c.id, new_c.id)
    assert res_2["diff_id"] == res_1["diff_id"]
    assert res_2["unchanged"] == 1  # Still 1 because it's retrieved from cache!
    
    db.close()

def test_api_endpoints_flow():
    """Verify POST /diff and GET /diff/{id} endpoints behavior."""
    db = TestingSessionLocal()
    
    old_c = create_circular(db, "Old Circ", "Text 1", "old.pdf", "hash1")
    new_c = create_circular(db, "New Circ", "Text 2", "new.pdf", "hash2")
    
    create_obligation(db, old_c.id, "OBL-OLD-1", "The board must review validation reports quarterly.")
    create_obligation(db, new_c.id, "OBL-NEW-1", "The board must review validation reports quarterly.")
    
    # 1. Test POST /diff
    response = client.post("/diff", json={
        "old_circular_id": old_c.id,
        "new_circular_id": new_c.id
    })
    assert response.status_code == 200
    data = response.json()
    assert "diff_id" in data
    assert data["unchanged"] == 1
    assert data["new"] == 0
    assert data["changed"] == 0
    
    diff_id = data["diff_id"]
    
    # 2. Test GET /diff/{diff_id}
    response_get = client.get(f"/diff/{diff_id}")
    assert response_get.status_code == 200
    details = response_get.json()
    assert "NEW" in details
    assert "CHANGED" in details
    assert "UNCHANGED" in details
    
    assert len(details["UNCHANGED"]) == 1
    assert details["UNCHANGED"][0]["new_circular_id"] == new_c.id
    assert details["UNCHANGED"][0]["semantic_verified"] is False
    assert details["UNCHANGED"][0]["similarity_score"] == 1.0
    
    # 3. Test non-existent diff session
    response_404 = client.get("/diff/99999")
    assert response_404.status_code == 404
    
    db.close()

def test_error_handling_missing_and_no_obligations():
    """Verify error handling for missing circulars and empty obligations."""
    # 1. Missing circular
    response = client.post("/diff", json={
        "old_circular_id": 9999,
        "new_circular_id": 9998
    })
    assert response.status_code == 404
    
    # 2. Circulars exist but have no obligations
    db = TestingSessionLocal()
    old_c = create_circular(db, "Old Circ", "Text 1", "old.pdf", "hash1")
    new_c = create_circular(db, "New Circ", "Text 2", "new.pdf", "hash2")
    old_id = old_c.id
    new_id = new_c.id
    db.close()
    
    response_no_obl = client.post("/diff", json={
        "old_circular_id": old_id,
        "new_circular_id": new_id
    })
    assert response_no_obl.status_code == 400
    assert "no obligations extracted" in response_no_obl.json()["detail"].lower()
