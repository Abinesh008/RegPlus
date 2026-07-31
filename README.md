# RegPulse — RBI Circular Impact Simulator

RegPulse is a production-ready enterprise compliance simulator designed for banking compliance teams, RegTech demonstrations, and technical portfolio reviews. It automates the process of ingestion, analysis, delta-computation (diffing), and rule-engine mapping for Reserve Bank of India (RBI) notifications and directives.

The platform extracts human-readable obligations, computes semantic differences between circular versions, and maps updates directly to banking parameters (e.g., Jocata-GRID rule parameters).

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite SPA), Tailwind CSS, Vanilla CSS, Lucide Icons, Recharts (reporting analytics).
* **Backend**: FastAPI (Python 3.11/3.14 compatible), Uvicorn.
* **Database**: SQLite (SQLAlchemy 2.0 ORM for clean migrations and persistence).
* **Extraction & PDF Generation**: `pdfplumber` (text extraction), `ReportLab` (formal PDF advisory report generation).
* **AI Cognitive Services**: Google Gemini API (`gemini-2.5-flash` for extraction, semantic diff classification, and taxonomy parameter mapping).

---

## 🏗️ Architecture Component Design

RegPulse utilizes a decoupled Client-Server architecture:
* **Ingestion Pipeline**: Uploaded circular PDFs are cached via SHA-256 hashes to prevent duplicate parsing. `pdfplumber` strips headers/footers/boilerplates.
* **Extraction Engine**: AI processes raw text to return a list of actionable compliance obligations.
* **Semantic Diff Engine**: A greedy comparison engine that filters identical clauses using character similarity and prompts Gemini for semantic validation on boundary changes.
* **Rule Mapping Engine**: Maps obligations to the 13 configurable parameters in the bank's transaction, onboarding, screening, and reporting layers.

Details are documented in [docs/Architecture.md](file:///c:/Users/USER/Desktop/RegPlus/docs/Architecture.md).

---

## ⚙️ Environment Variables

A `.env` configuration file must be created either in the root directory or in `backend/`. Copy `.env.example` to start:

```bash
# Google Gemini API key. If omitted or set to 'mock_api_key',
# the application will run in Mock Mode with deterministic results.
GEMINI_API_KEY=your_actual_gemini_api_key

# The Gemini model to use for semantic diffing and rule mapping.
MODEL_NAME=gemini-2.5-flash

# Database connection URL. SQLite is used by default.
DATABASE_URL=sqlite:///./regpulse.db

# Logging level.
LOG_LEVEL=INFO
```

---

## 🚀 Quick Start with Docker

RegPulse supports single-command containerized startup.

### Running with Docker Compose

1. Set up your `.env` variables at the project root.
2. Launch the services:
   ```bash
   docker-compose up --build -d
   ```
3. Open your browser:
   * **Frontend Application**: [http://localhost](http://localhost) (Port 80)
   * **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)

To stop the containers:
```bash
docker-compose down
```

---

## 💻 Local Development Setup (Windows PowerShell)

If you prefer to run the components locally on your host machine:

### Running the Backend

1. Navigate to the project root and activate the Python virtual environment:
   ```powershell
   cd c:\Users\USER\Desktop\RegPlus
   .venv\Scripts\Activate.ps1
   ```
2. Install Python dependencies:
   ```powershell
   pip install -r backend/requirements.txt
   ```
3. Boot the Uvicorn development server:
   ```powershell
   cd backend
   $env:PYTHONPATH="c:\Users\USER\Desktop\RegPlus"
   uvicorn app.main:app --reload --port 8000
   ```

### Running the Frontend

1. Open a new PowerShell window and navigate to the frontend directory:
   ```powershell
   cd c:\Users\USER\Desktop\RegPlus\frontend
   ```
2. Install Node dependencies:
   ```powershell
   npm install
   ```
3. Boot Vite:
   ```powershell
   npm run dev
   ```
4. Access the React workbench at [http://localhost:5173](http://localhost:5173).

---

## 📂 Project Structure

```
RegPlus/
├── .env.example            # Environment variables template
├── Dockerfile              # Root-level multi-stage container description
├── docker-compose.yml      # Service orchestration
├── docs/                   # Markdown architecture and API specifications
│   ├── Architecture.md
│   ├── API.md
│   ├── Workflow.md
│   └── Deployment.md
├── backend/
│   ├── Dockerfile          # Python service container details
│   ├── requirements.txt    # Python packages
│   ├── app/
│   │   ├── main.py         # Entrypoint & global exception handlers
│   │   ├── api/
│   │   │   └── endpoints.py # API router and controller endpoints
│   │   ├── services/
│   │   │   ├── pdf_extractor.py
│   │   │   ├── obligation_extractor.py
│   │   │   ├── diff_engine.py
│   │   │   ├── rule_mapper.py
│   │   │   ├── pdf_generator.py  # ReportLab PDF compiler
│   │   │   └── csv_generator.py  # CSV tabular exporter
│   │   └── db/
│   └── tests/              # Pytest verification suites
└── frontend/
    ├── Dockerfile          # Vite build & Nginx container steps
    ├── src/
    │   ├── App.jsx         # Workbench core and lazy loading routes
    │   ├── components/     # Reusable UI (ErrorBanner, LoadingSkeleton)
    │   └── pages/          # Layout modules (CircularLibrary, RuleImpact)
```

---

## 📊 End-to-End Compliance Workflow

```
[ Upload PDF ] ➔ [ Extract Obligations ] ➔ [ Compare (Diff) Versions ] ➔ [ Map to Taxonomy ] ➔ [ Export PDF / CSV ]
```
See the full sequence and execution steps in [docs/Workflow.md](file:///c:/Users/USER/Desktop/RegPlus/docs/Workflow.md).

---

## 🌐 API Reference Summary

* `GET /health` — Simple backend system check.
* `GET /circulars` — Retrieve metadata for all circulars.
* `POST /circulars/upload` — Upload PDF file.
* `POST /circulars/{id}/extract` — Parse obligations using Gemini or mock.
* `POST /diff` — Calculate version diffs.
* `GET /diff/{id}/mappings` — Retrieve mapped parameters.
* `GET /diff/{id}/export/pdf` — Download printable compliance PDF report.
* `GET /diff/{id}/export/csv` — Download Excel-compatible CSV mapping sheet.

Refer to [docs/API.md](file:///c:/Users/USER/Desktop/RegPlus/docs/API.md) for full parameters and payload structures.

---

## 🔮 Future Improvements

1. **PostgreSQL/MySQL Integration**: Transition database from SQLite to PostgreSQL for multi-user transactional stability.
2. **Interactive Mapping Editor**: Support human-in-the-loop updates directly through the frontend dashboard.
3. **Advanced RAG integration**: Connect extraction results with historical regulatory archives to surface related directives.

---

## 📝 License & Authors

* **License**: MIT License
* **Authors**: RegPulse Core Team & Google DeepMind Advanced Agentic Coding
