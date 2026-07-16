# Builder Stage
FROM python:3.12-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Production Stage
FROM python:3.12-slim

WORKDIR /app

# Install runtime system dependencies (Postgres client, etc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    ffmpeg \
    libsm6 \
    libext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual env from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Create unprivileged user
RUN addgroup --system appgroup && adduser --system --group appuser
RUN mkdir -p /app/data/chroma /app/data/uploads && \
    chown -R appuser:appgroup /app/data

USER appuser

EXPOSE 8000

# Start Gunicorn with Uvicorn workers for high concurrency
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-"]
