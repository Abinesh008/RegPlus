# RegPulse — RBI Circular Impact Simulator

RegPulse is a regulatory compliance intelligence platform designed to extract compliance obligations from Reserve Bank of India (RBI) circulars, compute differences between circular versions, and map updates directly to banking parameters (e.g., Jocata-GRID rule parameters).

This workspace holds the foundational layout (Prompt 1) including the database schema, FastAPI server, configuration managers, standard logging, and Vite-React frontend shell.

---

## Prerequisites

- **Python Version:** 3.14.4 ONLY
- **Node.js:** Version 18+ and npm
- **OS:** Windows 11 + VS Code

---

## Backend Setup (Windows PowerShell)

1. Open PowerShell and navigate to the workspace root:
   ```powershell
   cd c:\Users\USER\Desktop\RegPlus
   ```

2. Create a virtual environment using Python 3.14.4:
   ```powershell
   py -3.14 -m venv .venv
   ```

3. Activate the virtual environment:
   ```powershell
   .venv\Scripts\Activate.ps1
   ```

4. Install backend dependencies:
   ```powershell
   pip install -r backend/requirements.txt
   ```

5. Copy the configuration template:
   ```powershell
   Copy-Item backend/.env.example backend/.env
   ```

6. Run the FastAPI development server:
   ```powershell
   cd backend
   uvicorn app.main:app --reload --port 8000
   ```

On startup, the SQLite database (`regpulse.db`) will automatically initialize and construct the tables if they don't exist.

---

## Frontend Setup (Windows PowerShell)

1. Open a new PowerShell window and navigate to the frontend folder:
   ```powershell
   cd c:\Users\USER\Desktop\RegPlus\frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Boot the Vite development server:
   ```powershell
   npm run dev
   ```

The React app will be accessible at [http://localhost:5173](http://localhost:5173).

---

## Architecture Components

- **FastAPI application** with standard CORS configuration allowing requests from `localhost:5173`.
- **SQLAlchemy 2.x ORM engine/session** with automatic DB migrations (tables: `Circular`, `Obligation`, `DiffResult`, `RuleMapping`).
- **Configuration loading** via `pydantic-settings` reading from `.env`.
- **Taxonomy:** hardcoded 13 system parameters in `backend/data/rule_taxonomy.json`.
- **Logging:** standard Python logger matching the `.env` `LOG_LEVEL`.
- **API Endpoints:**
  - `GET /health` -> Verify status
  - `GET /circulars` -> Query circular list from DB
  - `POST /circulars/upload` -> Stub returning `"Not Implemented Yet"`
