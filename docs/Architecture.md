# RegPulse System Architecture

This document details the software architecture, data models, and system components of **RegPulse** — the Reserve Bank of India (RBI) Circular Impact Simulator.

## Component Overview

RegPulse is designed with a decoupled **Client-Server** architecture, mapping regulatory texts to bank operational parameters.

```mermaid
graph TD
    subgraph Frontend [React SPA Client]
        UI[Vite + React SPA]
        State[React Context / State]
        Client[Axios Client]
    end

    subgraph Backend [FastAPI Server]
        API[API Endpoints Router]
        PDF_Plumber[PDF Plumber Service]
        Obligation_Extractor[Obligation Extraction Engine]
        Diff_Engine[Semantic Diff Engine]
        Rule_Mapper[Rule Mapping Engine]
        PDF_Gen[ReportLab PDF Generator]
        CSV_Gen[CSV Exporter]
        Config[Pydantic Settings Manager]
    end

    subgraph Storage [Persistent Storage]
        DB[(SQLite Database)]
        Uploads[Local Uploads / Samples Directories]
    end

    subgraph LLM [Cognitive Services]
        Gemini[Google Gemini API]
    end

    UI --> State
    State --> Client
    Client -- "REST API (HTTP)" --> API
    API --> Config
    API --> PDF_Plumber
    API --> Obligation_Extractor
    API --> Diff_Engine
    API --> Rule_Mapper
    API --> PDF_Gen
    API --> CSV_Gen
    
    Obligation_Extractor -.-> Gemini
    Diff_Engine -.-> Gemini
    Rule_Mapper -.-> Gemini
    
    API --> DB
    PDF_Plumber --> Uploads
```

---

## Database Architecture (Schema)

RegPulse uses an SQLite database (`regpulse.db`) managed via SQLAlchemy 2.0 ORM. The relational schema is structured as follows:

```mermaid
erDiagram
    CIRCULAR {
        int id PK
        string title
        string version_date
        string source_filename
        string pdf_hash
        text raw_text
        datetime created_at
    }
    OBLIGATION {
        int id PK
        int circular_id FK
        string obligation_id_slug
        text obligation_text
        string source_clause
        string obligation_type
        string applies_to
        float confidence_score
    }
    DIFF_SESSION {
        int id PK
        int old_circular_id FK
        int new_circular_id FK
        datetime created_at
    }
    DIFF_RESULT {
        int id PK
        int diff_session_id FK
        int old_circular_id FK
        int new_circular_id FK
        string category
        int old_obligation_id FK
        int new_obligation_id FK
        boolean semantic_verified
        float similarity_score
        string match_reason
    }
    RULE_MAPPING {
        int id PK
        int obligation_id FK
        text matched_param_ids
        text reasoning
        string confidence
        string implementation_priority
        string mapping_model
        datetime mapping_timestamp
        text affected_business_layer
        string mapping_source
        boolean review_required
        float match_score
        string mapping_version
    }

    CIRCULAR ||--o{ OBLIGATION : "contains"
    CIRCULAR ||--o{ DIFF_SESSION : "as_new"
    CIRCULAR ||--o{ DIFF_SESSION : "as_old"
    DIFF_SESSION ||--o{ DIFF_RESULT : "produces"
    OBLIGATION ||--o{ DIFF_RESULT : "in_new"
    OBLIGATION ||--o{ DIFF_RESULT : "in_old"
    OBLIGATION ||--o{ RULE_MAPPING : "maps_to"
```

### Table Definitions

1. **`circulars`**: Stores metadata, SHA-256 hashes, and raw extracted text of uploaded RBI circular PDFs.
2. **`obligations`**: Compliance obligations extracted from circular texts.
3. **`diff_sessions`**: Tracks comparison sessions between a baseline (old) and updated (new) circular.
4. **`diff_results`**: Links obligations between the circulars, categorizing them as `new`, `changed`, or `unchanged`.
5. **`rule_mappings`**: Configures how `new` and `changed` obligations align to the bank's operational parameters (Rule Taxonomy).

---

## Core Operational Modules

### 1. Extraction Pipeline (PDF -> Text -> Obligations)
Extracts human-readable text from uploaded PDFs using `pdfplumber`, applies text cleaning heuristics, and translates the raw text into structured compliance obligations using the Gemini API.

### 2. Semantic Diff Engine (SequenceMatcher + Gemini)
Determines updates between circulars. It utilizes a hybrid approach:
- Highly similar requirements ($\ge$ 90% character similarity) are categorized as `unchanged` immediately.
- Ambiguous matches (between 55% and 90% similarity) are sent to Gemini to evaluate semantics.
- Completely unmatched requirements are designated as `new`.

### 3. Rule Mapping Engine
Correlates obligations against the 13 bank parameters (e.g. `aml_txn_threshold`, `kyc_risk_weight`). It filters invalid parameters, identifies the affected business layers, and computes an automated implementation priority.
