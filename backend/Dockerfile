# ============================================
# BlogForgeAI Backend — Production Dockerfile
# ============================================
# Optimized for Render free tier deployment
# ============================================

FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr (important for Render logs)
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install system dependencies required by psycopg (PostgreSQL driver)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for generated content
RUN mkdir -p blogs images

# Expose port (Render sets PORT dynamically)
EXPOSE 8000

# Start Uvicorn — Render injects $PORT at runtime
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
