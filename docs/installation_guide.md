# ForexAI Pro — Installation Guide (Local/Dev)

Follow these directions to stand up your ForexAI Pro system independently on a local machine for testing or expansion!

## 1. Environment Parsing
Ensure you have `python 3.12` natively scaling alongside valid installations for Node (if injecting React parameters mapping later) and Docker.

```bash
git clone https://github.com/your-username/forexai-pro.git
cd forexai-pro
```

## 2. Docker Native (Easiest)
Simply inject your variables in `.env` mapping your passwords and keys, then run:

```bash
docker-compose up -d --build
```
This forces all Databases and API boundaries securely without polluting local dependencies.

## 3. Dedicated Python Build 

Start the Database nodes independently to bind locally:
```bash
docker run --name forexai_db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:15-alpine
docker run --name forexai_redis -p 6379:6379 -d redis:7-alpine
```

Initialize your Anaconda Python 3.12 terminal mapping structural environment variables heavily targeting paths:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # (or venv\Scripts\activate on Windows)
pip install -r requirements.txt
```

Boot the server heavily via mapping Uvicorn bounds natively:

```bash
uvicorn app.main:app --reload
```
You can now access your swagger structure bounds directly at `http://localhost:8000/docs`!
