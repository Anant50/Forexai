# ForexAI Pro — Developer Documentation

Welcome to the ForexAI Pro backend repository! This guide provides standard operating procedures for backend developers scaling the FastAPI + Machine Learning architecture.

## 1. Local Environment Setup

### Prerequisites
- Python 3.12+ (Anaconda environment highly recommended)
- PostgreSQL 15+ (Local or Dockerized)
- Redis 7+

### Bootstrapping
1. Create a `.env` file at the root duplicating `.env.example`.
2. Generate a secure secret key: `openssl rand -hex 32` and place it under `SECRET_KEY`.
3. Install strict dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Start the Uvicorn Developer server (Live Reload enabled):
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## 2. Coding Standards
ForexAI Pro adheres strictly to **Domain-Driven Design (DDD)**. 
- Never place SQL logic into an API router endpoint. Always pass dependency-injected sessions down to the `services/` layer.
- **Pydantic Strictness**: All incoming and outgoing data MUST pass through a Pydantic schema (`app/schemas/`). Exclude raw ORM returns from crossing the REST boundary.
- **Type Hinting**: Ensure variables and function scopes use strict Python typing (`typing.Dict`, `typing.List`, `Optional`, `Union`) to maintain MyPy compliance.

## 3. Contributing AI Modules
When introducing a new sub-engine:
- Always encapsulate parameters safely inside `app/intelligence/`. 
- Ensure that if dependencies like PyTorch (`.pt`) or SHAP fall offline, the platform relies gracefully on **heuristic fallback bounds** (e.g., standard Moving Average voting defaults).

## 4. PyTest Bounds
Before submitting PRs to `main`, ensure the complete 71-suite pipeline passes:
```bash
python -m pytest tests/ -vv --tb=short
```
