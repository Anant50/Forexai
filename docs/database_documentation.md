# ForexAI Pro — Database Documentation

The platform depends on PostgreSQL mapped entirely through native **SQLAlchemy 2.0 Asyncpg**.
For heavy throughput speeds, it features UUID architectures scaling concurrently.

## Core Relational Map 

### 1. Account & Security Layer
*   `User`: Handles root authentications and RBAC capabilities (`is_active`, `is_admin`, etc.).
*   `AuditLog`: Tracks critical events (failed logins, model retrains, system deletes).

### 2. Market Mathematics Array
*   `Candle`: Primary OHLCV temporal structure parsed historically.
*   `Indicator`: Offsets arrays like RSI, MACD, and EMAs generated asynchronously during tick-cycles.
*   `Pattern`: Records visual candlestick structures (Doji, Hammer, Engulfing).

### 3. Machine Learning & Inference
*   `ModelVersion`: Complete registry tracking model architectures, versions (`v1.4`), accuracy rates, and paths logic.
*   `BacktestResult`: Profitability mapping boundaries testing model logic structurally.
*   `Prediction`: Generates Trade constraints linked to specific Models mapping SL and TP coordinates.
*   `Explanation`: SHAP matrices identifying *why* predictions exist natively.

### 4. User Interactions & RAG
*   `JournalEntry`: Synchronizes mathematical prediction targets structurally bounded to a user's local PNL records.
*   `KnowledgeDocument` & `KnowledgeChunk`: Bounding text ingestion layers directly communicating against isolated ChromaDB stores.

## Optimization Strategy
To keep DB size scalable on timeseries `Candle` ingestion, all tables run on sequential `BigInts` mapping timestamps inherently alongside heavily constrained indexing (`pair`, `timeframe`, `open_time`) eliminating sequential scan limits.
