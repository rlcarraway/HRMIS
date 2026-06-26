-- ============================================================================
-- Complete Supabase Schema for HRMIS
-- ============================================================================
-- This includes ALL data that was previously stored in files
-- Run this after the initial schema from SUPABASE_MIGRATION.md
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Okta Settings Table
-- ============================================================================
-- Stores dynamic Okta OAuth configuration (can be updated via UI)
-- Only one row should exist (enforced by CHECK constraint)

CREATE TABLE IF NOT EXISTS okta_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  issuer TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row_okta CHECK (id = 1)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_okta_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER okta_settings_updated_at
  BEFORE UPDATE ON okta_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_okta_settings_updated_at();

-- ============================================================================
-- Outbound API Settings Table
-- ============================================================================
-- Stores outbound API webhook configuration
-- Only one row should exist (enforced by CHECK constraint)

CREATE TABLE IF NOT EXISTS outbound_api_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,
  url TEXT NOT NULL DEFAULT '',
  headers JSONB NOT NULL DEFAULT '[]', -- Array of {key, value} objects
  operations JSONB NOT NULL DEFAULT '{"create": false, "update": false, "delete": false}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row_outbound CHECK (id = 1)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_outbound_api_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER outbound_api_settings_updated_at
  BEFORE UPDATE ON outbound_api_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_outbound_api_settings_updated_at();

-- ============================================================================
-- Federated Users Table
-- ============================================================================
-- Stores Okta-authenticated users and their roles

CREATE TABLE IF NOT EXISTS federated_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'viewer')),
  provider VARCHAR(50) NOT NULL DEFAULT 'okta',
  provider_id VARCHAR(255) NOT NULL, -- Okta sub claim
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_federated_users_email ON federated_users(email);
CREATE INDEX IF NOT EXISTS idx_federated_users_provider_id ON federated_users(provider_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_federated_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER federated_users_updated_at
  BEFORE UPDATE ON federated_users
  FOR EACH ROW
  EXECUTE FUNCTION update_federated_users_updated_at();

-- ============================================================================
-- Audit Logs Table
-- ============================================================================
-- Stores all system audit logs for compliance and debugging

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action VARCHAR(100) NOT NULL, -- e.g., 'user.create', 'employee.update', etc.
  level VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error', 'success')),
  user_id VARCHAR(255), -- User who performed the action
  user_name VARCHAR(255),
  user_email VARCHAR(255),
  description TEXT NOT NULL,
  details JSONB, -- Additional structured data
  ip_address VARCHAR(45), -- IPv4 or IPv6
  user_agent TEXT,
  duration INTEGER, -- Duration in milliseconds
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_email ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);

-- ============================================================================
-- Initialize default settings
-- ============================================================================

-- Insert default outbound API settings if not exists
INSERT INTO outbound_api_settings (id, enabled, url, headers, operations)
VALUES (1, false, '', '[]'::jsonb, '{"create": false, "update": false, "delete": false}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Note: okta_settings should be populated from environment variables or UI
-- Note: federated_users will be populated as users sign in via Okta
-- Note: audit_logs will be populated as actions occur

-- ============================================================================
-- Row Level Security (RLS) - Optional for Production
-- ============================================================================
-- Uncomment these if you want to enable RLS for additional security
-- You'll need to create appropriate policies based on your auth setup

-- ALTER TABLE okta_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE outbound_api_settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE federated_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Example policy (adjust based on your auth implementation):
-- CREATE POLICY "Admin full access" ON federated_users
--   FOR ALL
--   USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- Cleanup old data retention (optional)
-- ============================================================================
-- You may want to set up a periodic cleanup for old audit logs
-- This can be done via a Supabase Edge Function or cron job

-- Example function to delete audit logs older than 90 days:
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- To run this periodically, use pg_cron extension or Supabase Edge Functions
-- Extension installation (if available):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs()');

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify tables were created successfully

-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'okta_settings',
    'outbound_api_settings',
    'federated_users',
    'audit_logs'
  )
ORDER BY table_name;

-- Check row counts
SELECT 'okta_settings' as table_name, COUNT(*) as count FROM okta_settings
UNION ALL
SELECT 'outbound_api_settings', COUNT(*) FROM outbound_api_settings
UNION ALL
SELECT 'federated_users', COUNT(*) FROM federated_users
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs;
