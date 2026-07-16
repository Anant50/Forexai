-- ============================================================
-- ForexAI Pro — Step 3: Database Index Tuning
-- Indexing strategy to optimize high-frequency reads and writes.
-- Covers B-Tree (standard), BRIN (block range for time series),
-- and GIN (generalized inverted indexes for JSONB & Arrays).
-- ============================================================

-- ── 1. B-Tree Indexes (Standard Relational Lookups) ──────────

-- Authentication & Roles
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Models & Evaluation metrics
CREATE INDEX idx_model_versions_metrics ON model_versions(model_name, accuracy DESC, sharpe_ratio DESC);
CREATE INDEX idx_backtest_results_model_id ON backtest_results(model_version_id);

-- Predictions & XAI mapping
CREATE INDEX idx_predictions_pair_tf ON predictions(pair, timeframe);
CREATE INDEX idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX idx_predictions_outcome ON predictions(outcome);

-- Trading Journal
CREATE INDEX idx_journal_user_pair ON journal_entries(user_id, pair);
CREATE INDEX idx_journal_trade_date ON journal_entries(trade_date DESC);
CREATE INDEX idx_journal_outcome ON journal_entries(outcome);

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Economic Calendar
CREATE INDEX idx_calendar_event_time ON economic_calendar(event_time DESC);


-- ── 2. Time-Series Partition Indexes ──────────────────────────
-- Note: Indexes on partitioned tables automatically propagate to child partitions.

-- Candles lookup (composite index for OHLC fetches)
CREATE INDEX idx_candles_lookup ON candles(pair, open_time DESC);

-- Indicators matching
CREATE INDEX idx_indicators_lookup ON indicators(pair, candle_time DESC);

-- Pattern matching
CREATE INDEX idx_patterns_lookup ON patterns(pair, detected_at DESC);


-- ── 3. GIN & Trigram Indexes (Complex Data Search) ────────────

-- GIN Inverted Index on JSONB Preferences to enable schema-less lookups
CREATE INDEX idx_users_preferences_gin ON users USING gin (preferences);

-- GIN Index on predictions model metrics and snapshots
CREATE INDEX idx_predictions_model_scores_gin ON predictions USING gin (model_scores);

-- GIN Index on structural pattern tracking
CREATE INDEX idx_predictions_detected_patterns_gin ON predictions USING gin (detected_patterns);

-- GIN index on array types for News tags
CREATE INDEX idx_news_currencies_gin ON news_events USING gin (affected_currencies);
CREATE INDEX idx_news_published_at ON news_events(published_at DESC);

-- Trigram Index (GIN pg_trgm) for fuzzy text headlines matching
CREATE INDEX idx_news_headline_tgrm ON news_events USING gin (headline gin_trgm_ops);

-- GIN index on audit logs changed keys metadata
CREATE INDEX idx_audit_logs_changes ON audit_logs USING gin (new_values);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
