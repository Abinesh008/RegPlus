# RegPulse Deployment Guide

This document contains instructions for deploying the RegPulse application in demonstration, local development, or containerized production-like environments.

---

## Infrastructure Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **CPU** | 2 vCPUs | 4 vCPUs |
| **Memory** | 4 GB RAM | 8 GB RAM |
| **Storage** | 10 GB Disk space | 20 GB Disk space |
| **OS** | Windows 10/11, macOS, or Linux | Ubuntu 22.04 LTS |
| **Network** | Outbound internet access to Gemini API | Outbound internet access to Gemini API |

---

## Docker Deployment (Recommended)

RegPulse supports containerized execution via **Docker** and **Docker Compose** to run both the FastAPI backend and Vite-React frontend in single-command orchestrations.

### Prerequisites
* Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine + Docker Compose (Linux).

### Configuration
1. Create a `.env` file in the project root folder based on `.env.example`:
   ```bash
   GEMINI_API_KEY=your_actual_gemini_api_key
   MODEL_NAME=gemini-2.5-flash
   DATABASE_URL=sqlite:///./data/regpulse.db
   LOG_LEVEL=INFO
   ```
   > [!NOTE]
   > If `GEMINI_API_KEY` is omitted or set to `mock_api_key`, the application automatically operates in **Mock Mode** (using deterministic heuristics instead of LLM requests).

### Execution
To build images and boot the application:
```bash
docker-compose up --build -d
```

* **Frontend Console**: Accessible at `http://localhost:80` (mapped to port 80).
* **Backend API**: Accessible at `http://localhost:8000` (mapped to port 8000).
* **API Documentation**: Interactive OpenAPI Swagger documentation is at `http://localhost:8000/docs`.

To tear down containers and preserve SQLite data:
```bash
docker-compose down
```

---

## Production Security & Optimization Guidelines

When preparing RegPulse for enterprise demonstrations or technical interviews, keep in mind these operational considerations:

### 1. Database Upgrade
RegPulse ships with SQLite by default (`regpulse.db`). For heavy concurrent user demonstrations:
* Upgrade the `DATABASE_URL` to a robust database engine (e.g. PostgreSQL or MySQL).
* Update `backend/requirements.txt` to include the driver (e.g. `psycopg2-binary` or `asyncpg`).
* Update the database connection URL in `.env`.

### 2. HTTPS / SSL Termination
FastAPI and Vite containers do not handle SSL certificates natively:
* Deploy a reverse proxy (e.g. **Nginx** or **Traefik**) in front of the application.
* Terminate SSL/TLS at the reverse proxy (port 443) and redirect non-HTTPS traffic.

### 3. Environment Secrets Management
* In enterprise production, do not store keys inside `.env` files.
* Inject credentials dynamically using environment managers, secret vaults (e.g., HashiCorp Vault, AWS Secrets Manager), or Docker secrets.
