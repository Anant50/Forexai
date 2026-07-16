# ForexAI Pro — API Documentation

ForexAI relies on an asynchronous REST architecture mapped via **FastAPI**, serving endpoints natively behind OAuth2 JSON Web Tokens.

## Base URL
Production: `https://api.forexai.pro/api/v1`
Local: `http://localhost:8000/api/v1`

## Naming Conventions & Namespaces

- `/auth/*` : Bearer Token generation, Identity constraints, and RBAC mapping.
- `/admin/*` : Guarded metrics, Model Promotions mapping, and Mass Database resets.
- `/market-data/*` : Asynchronous querying bounds fetching historic / live `Candle` entities.
- `/predictions/*` : Machine Learning inference executions and Signal retrieval.
- `/journal/*` : User specific isolated trading notebooks merging historic predictions.
- `/intelligence/*` : Ensemble logic bounding XAI and Market Regime conditions.
- `/vision/*` : Screenshot bounds generating Vision Transformer/YOLO structures.
- `/knowledge/*` : RAG document embedding vectors mapping strictly to local `ChromaDB`.

---

## Example: Executing a Prediction

**POST /api/v1/intelligence/analyze/multi-model**

**Headers**: `Authorization: Bearer <JWT>`
**Payload**:
```json
{
  "pair": "GBP/USD",
  "timeframe": "15m"
}
```

**Response**: (200 OK)
```json
{
  "prediction_id": "ensemble_12345",
  "suggested_direction": "long",
  "confidence_score": 88.5,
  "grade": "A+",
  "regime": "trending_bull",
  "sl": 1.2500,
  "tp": 1.2650,
  "ai_narrative": "The ensemble engine suggests a long trade with an A+ ratings."
}
```

*For complete Open-API schema parameters and testing limits, deploy the server locally and visit `/docs` for the interactive Swagger dashboard.*
