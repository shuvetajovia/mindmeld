FROM python:3.12-slim

WORKDIR /workspace

# Install essential compilation and XGBoost runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install python requirements
COPY backend/requirements.txt /workspace/backend/requirements.txt
RUN pip install --no-cache-dir -r /workspace/backend/requirements.txt

# Copy source code and models
COPY backend/ /workspace/backend/
COPY models/ /workspace/models/
COPY two_tier_landslide_ews_dataset.csv /workspace/

ENV PYTHONPATH=/workspace
EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
