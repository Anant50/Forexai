-- ============================================================
-- ForexAI Pro — Step 0: Extensions & Custom Types
-- Run this FIRST before any table creation
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- similarity() for text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";      -- GIN index on scalar types
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance monitoring

-- ── Custom ENUM Types ────────────────────────────────────────

-- User roles for RBAC
CREATE TYPE user_role AS ENUM (
    'trader',     -- Standard user: can view + analyze
    'analyst',    -- Power user: can access advanced features
    'admin'       -- Full platform control
);

-- Trade / signal direction
CREATE TYPE direction_type AS ENUM (
    'long',       -- Bullish / Buy
    'short',      -- Bearish / Sell
    'neutral'     -- No bias / Wait
);

-- Indicator and AI signal classification
CREATE TYPE signal_type AS ENUM (
    'bullish',
    'bearish',
    'neutral'
);

-- Outcome of a trade or prediction
CREATE TYPE outcome_type AS ENUM (
    'open',        -- Trade or prediction still open
    'win',         -- Closed in profit (TP hit)
    'loss',        -- Closed at a loss (SL hit)
    'breakeven',   -- Exited at entry price
    'cancelled'    -- Trade was cancelled before execution
);

-- Model lifecycle status
CREATE TYPE model_status AS ENUM (
    'training',           -- Currently being trained
    'backtesting',        -- Training complete, running backtest
    'pending_approval',   -- Passed backtest, awaiting admin review
    'approved',           -- Admin approved, awaiting deployment
    'active',             -- Currently deployed in production
    'rejected',           -- Failed backtest criteria
    'admin_rejected',     -- Admin manually rejected
    'archived',           -- Superseded by newer model
    'rolled_back'         -- Was active but auto-rolled back due to performance drop
);

-- News and economic event impact rating
CREATE TYPE impact_level AS ENUM (
    'low',       -- Minimal market impact expected
    'medium',    -- Moderate volatility possible
    'high',      -- Significant market movement likely (e.g., CPI)
    'red'        -- Extreme market event (e.g., NFP, FOMC rate decision)
);

-- Sentiment classification (news, currency)
CREATE TYPE sentiment_type AS ENUM (
    'positive',   -- Bullish for the currency
    'negative',   -- Bearish for the currency
    'neutral'     -- No clear directional impact
);

-- Chart/candlestick pattern grouping
CREATE TYPE pattern_type AS ENUM (
    'chart',          -- Multi-bar chart patterns (H&S, Double Top, etc.)
    'candlestick',    -- Single or multi-stick patterns (Doji, Engulfing, etc.)
    'harmonic'        -- Harmonic patterns (Gartley, Bat, Butterfly, Crab)
);

-- Notification type for routing and filtering
CREATE TYPE notification_type AS ENUM (
    'new_signal',        -- AI generated a new trading signal
    'model_retrained',   -- A candidate model finished training
    'drawdown_warning',  -- User approaching daily drawdown limit
    'daily_summary',     -- Automated daily P&L summary
    'news_alert',        -- High-impact news event incoming
    'system'             -- System-level administrative message
);

-- Market data source identification
CREATE TYPE data_source AS ENUM (
    'yfinance',       -- Yahoo Finance (primary, free)
    'alpha_vantage',  -- Alpha Vantage (fallback, 25 req/day free)
    'manual'          -- Manually entered data
);

-- XAI explanation method
CREATE TYPE xai_method AS ENUM (
    'shap',       -- SHAP TreeExplainer (tree models)
    'lime',       -- LIME TimeSeriesExplainer (neural nets)
    'attention',  -- Attention weight visualization (Transformer/ViT)
    'gradcam',    -- GradCAM heatmap (CNN/ViT on images)
    'rule'        -- Rule-based explanation (indicator signals)
);
