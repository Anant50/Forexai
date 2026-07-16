-- ============================================================
-- ForexAI Pro — Step 1: Core Tables and Constraints
-- Normalized relational database schema in 3NF where applicable.
-- ============================================================

-- ── 1. Users Table (Core Identity) ──────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE,
    role user_role NOT NULL DEFAULT 'trader',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Constraint: Verification token lookup optimization & checks
ALTER TABLE users ADD CONSTRAINT check_failed_login_attempts CHECK (failed_login_attempts >= 0);

-- ── 2. User Sessions Table (OAuth State / Refresh Tokens) ────
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL, -- Supports IPv4 & IPv6
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 3. Watchlists Table (User-configured Pairs) ─────────────
CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pair VARCHAR(10) NOT NULL,  -- e.g. "EUR/USD"
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: Prevent duplicate entries of the same pair for a user
    CONSTRAINT unique_user_pair UNIQUE (user_id, pair)
);

-- ── 4. Model Versions Table (Model Registry) ────────────────
CREATE TABLE model_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100) NOT NULL,            -- e.g. "forexai_ensemble"
    version_tag VARCHAR(50) NOT NULL UNIQUE,      -- e.g. "v3.2.1"
    status model_status NOT NULL DEFAULT 'training',
    artifact_path VARCHAR(512),                  -- S3/Local file path
    hyperparameters JSONB DEFAULT '{}'::jsonb,
    accuracy NUMERIC(5,4),                       -- Out-of-sample metrics
    sharpe_ratio NUMERIC(4,2),
    win_rate NUMERIC(5,4),
    profit_factor NUMERIC(5,2),
    backtest_summary JSONB DEFAULT '{}'::jsonb,
    training_samples INT,
    training_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    training_completed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    deployed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 5. Backtest Results Table ───────────────────────────────
CREATE TABLE backtest_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
    pair VARCHAR(10) NOT NULL,
    timeframe VARCHAR(5) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_trades INT NOT NULL CHECK (total_trades >= 0),
    winning_trades INT NOT NULL CHECK (winning_trades >= 0),
    losing_trades INT NOT NULL CHECK (losing_trades >= 0),
    win_rate NUMERIC(5,4) NOT NULL CHECK (win_rate BETWEEN 0 AND 1),
    profit_factor NUMERIC(5,2) CHECK (profit_factor >= 0),
    sharpe_ratio NUMERIC(5,2),
    max_drawdown NUMERIC(5,4) CHECK (max_drawdown BETWEEN -1 AND 0),
    total_return NUMERIC(8,4) NOT NULL,
    equity_curve JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: Validate consistency of win/loss totals
    CONSTRAINT check_trades_totals CHECK (winning_trades + losing_trades <= total_trades)
);

-- ── 6. Predictions Table (Core AI Outputs) ─────────────────
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_version_id UUID REFERENCES model_versions(id) ON DELETE SET NULL,
    pair VARCHAR(10) NOT NULL,
    timeframe VARCHAR(5) NOT NULL,
    direction direction_type NOT NULL,
    confidence_score BOOLEAN, -- Will change to decimal/numeric range for reliability
    confidence_value NUMERIC(5,2) NOT NULL CHECK (confidence_value BETWEEN 0 AND 100),
    confidence_lower NUMERIC(5,2) CHECK (confidence_lower BETWEEN 0 AND 100),
    confidence_upper NUMERIC(5,2) CHECK (confidence_upper BETWEEN 0 AND 100),
    entry_price NUMERIC(10,5) NOT NULL CHECK (entry_price > 0),
    stop_loss NUMERIC(10,5) NOT NULL CHECK (stop_loss > 0),
    take_profit NUMERIC(10,5) NOT NULL CHECK (take_profit > 0),
    risk_reward NUMERIC(5,2) NOT NULL CHECK (risk_reward > 0),
    position_size_lots NUMERIC(6,2) CHECK (position_size_lots >= 0.01),
    account_risk_pct NUMERIC(4,2) CHECK (account_risk_pct BETWEEN 0 AND 100),
    model_scores JSONB NOT NULL DEFAULT '{}'::jsonb,         -- Scores from individual sub-models
    indicator_signals JSONB NOT NULL DEFAULT '{}'::jsonb,    -- Snapshot of inputs
    detected_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,     -- JSON array of patterns at predictive moment
    news_sentiment JSONB NOT NULL DEFAULT '{}'::jsonb,
    ai_narrative TEXT NOT NULL,                              -- Explanatory output narrative
    outcome outcome_type NOT NULL DEFAULT 'open',
    actual_pnl NUMERIC(12,2),
    outcome_recorded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Dynamic validation logic check
    CONSTRAINT check_confidence_values CHECK (confidence_lower <= confidence_value AND confidence_value <= confidence_upper)
);

-- ── 7. Explanations Table (Detailed XAI payloads) ───────────
CREATE TABLE explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID NOT NULL UNIQUE REFERENCES predictions(id) ON DELETE CASCADE,
    method xai_method NOT NULL DEFAULT 'shap',
    shap_values JSONB NOT NULL DEFAULT '{}'::jsonb,         -- Contribution metrics
    lime_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    attention_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    plain_english_summary TEXT NOT NULL,
    top_features JSONB NOT NULL DEFAULT '[]'::jsonb,         -- Cached top N indicators triggering the action
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 8. Trading Journal Table (User Entries + Suggestions) ──
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES predictions(id) ON DELETE SET NULL,  -- Traceable link to prediction engine
    pair VARCHAR(10) NOT NULL,
    direction direction_type NOT NULL,
    entry_price NUMERIC(10,5) NOT NULL CHECK (entry_price > 0),
    stop_loss NUMERIC(10,5) CHECK (stop_loss > 0),
    take_profit NUMERIC(10,5) CHECK (take_profit > 0),
    position_size_lots NUMERIC(6,2) CHECK (position_size_lots >= 0.01),
    risk_reward NUMERIC(5,2) CHECK (risk_reward > 0),
    confidence_at_entry NUMERIC(5,2) CHECK (confidence_at_entry BETWEEN 0 AND 100),
    ai_suggested BOOLEAN NOT NULL DEFAULT FALSE,
    trade_taken BOOLEAN NOT NULL DEFAULT FALSE,
    actual_entry_price NUMERIC(10,5) CHECK (actual_entry_price > 0),
    actual_exit_price NUMERIC(10,5) CHECK (actual_exit_price > 0),
    actual_pnl NUMERIC(12,2),
    outcome outcome_type NOT NULL DEFAULT 'open',
    tags VARCHAR(50)[] NOT NULL DEFAULT '{}'::VARCHAR(50)[],  -- Category tags
    notes TEXT,
    screenshot_url VARCHAR(512),
    trade_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 9. Notifications Table (System & Alert Logs) ───────────
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 10. User Notification Preferences Table ─────────────────
CREATE TABLE user_notification_prefs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    new_signal BOOLEAN NOT NULL DEFAULT TRUE,
    model_retrained BOOLEAN NOT NULL DEFAULT TRUE,
    drawdown_warning BOOLEAN NOT NULL DEFAULT TRUE,
    daily_summary BOOLEAN NOT NULL DEFAULT TRUE,
    news_alert BOOLEAN NOT NULL DEFAULT FALSE,
    via_email BOOLEAN NOT NULL DEFAULT TRUE,
    via_telegram BOOLEAN NOT NULL DEFAULT FALSE,
    telegram_chat_id VARCHAR(50)
);

-- ── 11. Economic Calendar Events ────────────────────────────
CREATE TABLE economic_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) NOT NULL,                 -- e.g. "USD", "EUR"
    impact impact_level NOT NULL DEFAULT 'low',
    forecast VARCHAR(50),
    actual VARCHAR(50),
    previous VARCHAR(50),
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 12. News Events Table (Sentiment Aggregations) ───────────
CREATE TABLE news_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    headline TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    url VARCHAR(512) UNIQUE,
    content_snippet TEXT,
    affected_currencies VARCHAR(10)[] NOT NULL,     -- e.g. ARRAY['USD', 'GBP']
    sentiment sentiment_type NOT NULL DEFAULT 'neutral',
    sentiment_score NUMERIC(5,4) NOT NULL CHECK (sentiment_score BETWEEN -1 AND 1),
    impact impact_level NOT NULL DEFAULT 'low',
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 13. Knowledge Documents (RAG File Trackers) ─────────────
CREATE TABLE knowledge_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL UNIQUE,
    file_path VARCHAR(512) NOT NULL,
    content_preview TEXT,
    chunk_count INT NOT NULL CHECK (chunk_count > 0),
    indexed BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── 14. Audit Logs (Compliance Tracker) ─────────────────────
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,                  -- e.g. "user_role_update", "model_deployed"
    resource_type VARCHAR(50) NOT NULL,            -- e.g. "user", "model_version"
    resource_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
