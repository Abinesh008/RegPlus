# RegPulse API Reference

This document provides a reference for the REST API endpoints exposed by the RegPulse FastAPI backend.

The backend server runs on `http://localhost:8000` by default.

---

## Health Check

### `GET /health`
Verifies that the backend server is running.

**Response:**
* **`200 OK`**
  ```json
  {
    "status": "OK"
  }
  ```

---

## Circular Management

### `GET /circulars`
Lists all uploaded or sample circulars from the database.

**Response:**
* **`200 OK`**
  ```json
  [
    {
      "id": 1,
      "title": "Master Direction - Know Your Customer (KYC) Direction, 2016",
      "version_date": "2016-02-25",
      "source_filename": "KYC_Direction_2016.pdf",
      "pdf_hash": "a4d3e8...",
      "created_at": "2026-08-01T00:00:00Z"
    }
  ]
  ```

### `POST /circulars/upload`
Uploads an RBI circular in PDF format, computes its SHA-256 hash, extracts and cleans its text, and inserts a new database record (or returns the existing one if cached).

**Request Body:**
* Multipart form-data with field `file` containing the PDF file. (Maximum size: 50MB)

**Response:**
* **`200 OK`**
  ```json
  {
    "circular_id": 2,
    "title": "Amendment to KYC Directions - Video Customer Identification Process",
    "source_filename": "KYC_Amendment_2020.pdf",
    "cached": false
  }
  ```

### `GET /circulars/{id}`
Retrieves metadata for a specific circular by its primary key ID.

**Response:**
* **`200 OK`**
  ```json
  {
    "id": 2,
    "title": "Amendment to KYC Directions - Video Customer Identification Process",
    "version_date": "2020-01-09",
    "source_filename": "KYC_Amendment_2020.pdf",
    "pdf_hash": "b2c8f...",
    "created_at": "2026-08-01T00:05:00Z"
  }
  ```

### `GET /circulars/{id}/text`
Retrieves the cleaned extracted text of a circular.

**Response:**
* **`200 OK`**
  ```json
  {
    "id": 2,
    "text": "RESERVE BANK OF INDIA... Master Direction on KYC..."
  }
  ```

### `POST /circulars/process-samples`
Scans the backend's `data/sample_circulars` folder and automatically loads and processes any PDFs found. Useful for bootstrapping the demo.

**Response:**
* **`200 OK`**
  ```json
  {
    "processed": 2,
    "details": [
      {
        "filename": "KYC_Direction_2016.pdf",
        "status": "processed",
        "circular_id": 1,
        "title": "Master Direction - Know Your Customer (KYC) Direction, 2016",
        "cached": false
      }
    ]
  }
  ```

---

## Obligation Extraction

### `POST /circulars/{id}/extract`
Triggers the extraction of compliance obligations from the circular's raw text. If an API key is configured, it sends chunks to Gemini. Otherwise, it falls back to a deterministic Mock extraction based on sample guidelines.

**Response:**
* **`200 OK`**
  ```json
  [
    {
      "id": 10,
      "circular_id": 2,
      "obligation_id_slug": "ob-kyc-amend-vcip-1",
      "obligation_text": "Regulated Entities may undertake Live Video Customer Identification Process (V-CIP) for establishment of account-based relationship.",
      "source_clause": "Clause 18.2",
      "obligation_type": "permissive",
      "applies_to": "all_regulated_entities",
      "confidence_score": 0.95
    }
  ]
  ```

### `GET /circulars/{id}/obligations`
Retrieves stored compliance obligations for a specific circular from the database (read-only; does not invoke Gemini).

**Response:**
* **`200 OK`** (Lists obligation objects similar to above)

---

## Circular Comparison (Diff Engine)

### `POST /diff`
Compares a baseline circular and an updated circular by analyzing their compliance obligations. It matches identical/similar clauses and categorizes changes.

**Request Body:**
```json
{
  "old_circular_id": 1,
  "new_circular_id": 2
}
```

**Response:**
* **`200 OK`**
  ```json
  {
    "diff_id": 5,
    "new": 3,
    "changed": 2,
    "unchanged": 12
  }
  ```

### `GET /diff/{diff_id}`
Retrieves comparison results grouped by impact category (`NEW`, `CHANGED`, `UNCHANGED`).

**Response:**
* **`200 OK`**
  ```json
  {
    "NEW": [
      {
        "id": 15,
        "diff_session_id": 5,
        "old_circular_id": 1,
        "new_circular_id": 2,
        "old_obligation_id": null,
        "new_obligation_id": 25,
        "semantic_verified": false,
        "similarity_score": 0.0,
        "match_reason": "No similar obligation found"
      }
    ],
    "CHANGED": [],
    "UNCHANGED": []
  }
  ```

---

## Rule Mapping & Export

### `POST /diff/{diff_id}/map`
Maps all `new` and `changed` obligations in the diff session to the bank's taxonomy rules.

**Response:**
* **`200 OK`**
  ```json
  {
    "mapped": 5,
    "cached": 0,
    "generated": 5,
    "invalid_parameters_removed": 0
  }
  ```

### `GET /diff/{diff_id}/mappings`
Retrieves the compiled rule mappings for the comparison session.

**Response:**
* **`200 OK`**
  ```json
  [
    {
      "obligation": "Regulated Entities may undertake Live Video Customer Identification Process (V-CIP)...",
      "matched_parameters": ["kyc_risk_weight", "document_validity_period"],
      "confidence": "high",
      "priority": "high",
      "reasoning": "V-CIP impacts customer onboarding validation metrics and document submission standards.",
      "affected_business_layer": ["onboarding"],
      "mapping_source": "gemini",
      "review_required": true,
      "match_score": 0.95,
      "mapping_version": "v1.0"
    }
  ]
  ```

### `GET /diff/{diff_id}/export/pdf`
Generates and downloads a formal PDF advisory report containing metadata, executive summaries, business layer impact analysis, mapped rules tables, and processing logs.

**Response:**
* **`200 OK`** Binary PDF download with `Content-Type: application/pdf`

### `GET /diff/{diff_id}/export/csv`
Downloads a CSV compilation of the mapped rules.

**Response:**
* **`200 OK`** Text CSV download with `Content-Type: text/csv`
