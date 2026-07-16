# ForexAI Pro — Folder Structure Layout

ForexAI Pro is meticulously organized adhering rigorously to Domain-Driven Design (DDD) principles:

```
forexai-pro/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # The REST boundary (Auth, Journal, Intelligence, etc.)
│   │   ├── core/           # Security, Settings config, Logging setup
│   │   ├── cv/             # Phase 9: Computer Vision Pipeline (YOLO/ViT)
│   │   ├── data/           # Phase 5: yfinance market data fetchers
│   │   ├── intelligence/   # Phase 11: Regime, XAI, Ensemble Engine Mastermind
│   │   ├── ml/             # Phase 7 & 8: Prediction Engines & Model Training
│   │   ├── models/         # Phase 2: SQLAlchemy Database ORMs
│   │   ├── rag/            # Phase 10: ChromaDB Knowledge Engine
│   │   ├── schemas/        # Phase 3: Pydantic Validation bounds
│   │   └── services/       # Core business logic isolating API maps from processing
│   ├── tests/              # Phase 4: Headless robust test suites
│   └── requirements.txt    # Heavy ML deps (torch, transformers) + FastAPI
├── deploy/
│   ├── docker-compose.prod.yml  # Live orchestration maps
│   ├── Dockerfile.backend       # Slim multi-stage builders
│   ├── nginx.conf               # Phase 12 Security Proxies
│   └── production_deploy_guide.md
└── .github/workflows/           # CI/CD deployment logic
```

## Key Boundaries
- `api/`: Strictly handles Request/Response and HTTP status codes.
- `services/`: Holds business logic (creates calculations, queries DBs).
- `schemas/`: Maps strict typing using Pydantic preventing invalid payloads.
- `models/`: Maps strict Python classes corresponding natively to PostgreSQL tables!
