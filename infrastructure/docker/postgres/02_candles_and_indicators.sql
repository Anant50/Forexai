-- ============================================================
-- ForexAI Pro — Step 2: Time Series Chart & Analytics Data
-- Partitioned master table for historic candlesticks (OHLCV)
-- along with associated technical and geometrical indicators.
-- ============================================================

-- ── 1. Master Candles Table (Partitioned by List) ─────────────
CREATE TABLE candles (
    id BIGSERIAL,
    pair VARCHAR(10) NOT NULL,                    -- e.g. "EUR/USD"
    timeframe VARCHAR(5) NOT NULL,               -- e.g. "1m", "5m", "15m", "1h", "4h", "1d", "1w"
    open_time TIMESTAMP WITH TIME ZONE NOT NULL,
    open_price NUMERIC(10,5) NOT NULL CHECK (open_price > 0),
    high_price NUMERIC(10,5) NOT NULL,
    low_price NUMERIC(10,5) NOT NULL,
    close_price NUMERIC(10,5) NOT NULL CHECK (close_price > 0),
    volume NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (volume >= 0),
    source data_source NOT NULL DEFAULT 'yfinance',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, timeframe),
    
    -- Constraint: Prevent contradictory wick high/low configurations
    CONSTRAINT check_wick_bounds CHECK (high_price >= open_price AND high_price >= close_price AND low_price <= open_price AND low_price <= close_price)
) PARTITION BY LIST (timeframe);

-- Create Partitions for standard intervals
CREATE TABLE candles_1m PARTITION OF candles FOR VALUES IN ('1m');
CREATE TABLE candles_5m PARTITION OF candles FOR VALUES IN ('5m');
CREATE TABLE candles_15m PARTITION OF candles FOR VALUES IN ('15m');
CREATE TABLE candles_1H PARTITION OF candles FOR VALUES IN ('1h');
CREATE TABLE candles_4H PARTITION OF candles FOR VALUES IN ('4h');
CREATE TABLE candles_1D PARTITION OF candles FOR VALUES IN ('1d');
CREATE TABLE candles_1W PARTITION OF candles FOR VALUES IN ('1w');


-- ── 2. Indicators Table (Technical overlays and subpanels) ────
CREATE TABLE indicators (
    id BIGSERIAL,
    pair VARCHAR(10) NOT NULL,
    timeframe VARCHAR(5) NOT NULL,
    candle_time TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Momentum indicators
    rsi NUMERIC(5,2) CHECK (rsi BETWEEN 0 AND 100),
    macd NUMERIC(10,5),
    macd_signal NUMERIC(10,5),
    macd_histogram NUMERIC(10,5),
    
    -- Moving Averages
    ema9 NUMERIC(10,5),
    ema21 NUMERIC(10,5),
    ema50 NUMERIC(10,5),
    ema200 NUMERIC(10,5),
    sma20 NUMERIC(10,5),
    sma50 NUMERIC(10,5),
    sma200 NUMERIC(10,5),
    
    -- Volatility & Trend indicators
    atr NUMERIC(10,5) CHECK (atr >= 0),
    adx NUMERIC(5,2) CHECK (adx BETWEEN 0 AND 100),
    bb_upper NUMERIC(10,5),
    bb_middle NUMERIC(10,5),
    bb_lower NUMERIC(10,5),
    vwap NUMERIC(10,5),
    supertrend INT CHECK (supertrend IN (-1, 1)), -- 1 = Bullish, -1 = Bearish
    
    -- Complex indicators in raw format
    ichimoku JSONB,          -- Tenkan, Kijun, Senkou A, Senkou B, Chikou
    fibonacci_levels JSONB,  -- Calculated swing high/low levels
    pivot_points JSONB,      -- Classic, Camarilla, Woodie pivot configurations
    
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, timeframe)
) PARTITION BY LIST (timeframe);

-- Create Indicator Partitions
CREATE TABLE indicators_1m PARTITION OF indicators FOR VALUES IN ('1m');
CREATE TABLE indicators_5m PARTITION OF indicators FOR VALUES IN ('5m');
CREATE TABLE indicators_15m PARTITION OF indicators FOR VALUES IN ('15m');
CREATE TABLE indicators_1H PARTITION OF indicators FOR VALUES IN ('1h');
CREATE TABLE indicators_4H PARTITION OF indicators FOR VALUES IN ('4h');
CREATE TABLE indicators_1D PARTITION OF indicators FOR VALUES IN ('1d');
CREATE TABLE indicators_1W PARTITION OF indicators FOR VALUES IN ('1w');


-- ── 3. Patterns Table (Geometric structures catalog) ──────────
CREATE TABLE patterns (
    id UUID DEFAULT uuid_generate_v4(),
    pair VARCHAR(10) NOT NULL,
    timeframe VARCHAR(5) NOT NULL,
    pattern_name VARCHAR(100) NOT NULL,          -- e.g. "double_bottom", "head_and_shoulders"
    pattern_grp pattern_type NOT NULL,          -- chart vs candlestick vs harmonic
    confidence NUMERIC(5,2) NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    direction_bias signal_type NOT NULL DEFAULT 'neutral',
    key_level_1 NUMERIC(10,5) CHECK (key_level_1 > 0),
    key_level_2 NUMERIC(10,5) CHECK (key_level_2 > 0),
    key_level_3 NUMERIC(10,5) CHECK (key_level_3 > 0),
    from_image BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE if detected via Screen Capture YOLO model
    start_candle_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_candle_time TIMESTAMP WITH TIME ZONE NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id, timeframe),
    CONSTRAINT check_pattern_timestamps CHECK (start_candle_time <= end_candle_time)
) PARTITION BY LIST (timeframe);

-- Create Pattern Partitions
CREATE TABLE patterns_1m PARTITION OF patterns FOR VALUES IN ('1m');
CREATE TABLE patterns_5m PARTITION OF patterns FOR VALUES IN ('5m');
CREATE TABLE patterns_15m PARTITION OF patterns FOR VALUES IN ('15m');
CREATE TABLE patterns_1H PARTITION OF patterns FOR VALUES IN ('1h');
CREATE TABLE patterns_4H PARTITION OF patterns FOR VALUES IN ('4h');
CREATE TABLE patterns_1D PARTITION OF patterns FOR VALUES IN ('1d');
CREATE TABLE patterns_1W PARTITION OF patterns FOR VALUES IN ('1w');
