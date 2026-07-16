# ForexAI Pro — Machine Learning Documentation

The ForexAI Pro system deploys an isolated Machine Learning structure partitioned across 5 individual Logic Engines mapped simultaneously via an Ensemble boundary.

## The Engines

### 1. Traditional Neural Pipelines (`app/ml/`)
- Utilizes `scikit-learn` and XGBoost algorithms recursively executing over tabular data.
- **Lazy Loading**: PyTorch models representing Deep Learning configurations (`LSTM` loops) natively execute bounds loading into GPU memory only at exact inference moments, freeing `VRAM` implicitly upon conclusion.

### 2. Vision Pipeline (`app/cv/`)
- Detects Support, Resistance, and Candle patterns dynamically utilizing structural pixels from uncompressed screenshots. 
- Utilizes `YOLOv8` bindings or falls back to structural `OpenCV` math limitations. Labels are parsed strictly utilizing `EasyOCR` tensors, mapped back as NLP logic.

### 3. Regime Detector (`app/intelligence/regime_detector.py`)
- Analyzes trailing ATR and ADX bounds to verify whether the models should expect "trending" logic or "fading" logic. Heavily overrides traditional outputs to prevent losses in sideways structural markets.

### 4. Knowledge Engine (`app/rag/`)
- Embeds `.pdf` bounds inside a localized ChromaDB directory utilizing `sentence-transformers`. Flushes vectors mapping directly into local Generative parameters (`FLAN-T5`). Absolute 100% data privacy architecture!

### 5. Explainable AI / XAI (`app/intelligence/xai_analyzer.py`)
- Parses Tree algorithms using `SHAP` values to output natural language bounds specifying heavily exactly *why* MACD or VWAP influenced an A+ trade grade!
