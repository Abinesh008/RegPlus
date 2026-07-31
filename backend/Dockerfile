FROM python:3.11-slim

WORKDIR /workspace

# Copy backend requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend code into the workspace
COPY . /workspace/backend

ENV PYTHONPATH=/workspace
EXPOSE 8000

# Run FastAPI app via uvicorn
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
