-- SpotMe module schema
-- Idempotent: safe to run on every module enable.
-- Mirrors modules-custom/spot-me/database/schema.ts

CREATE TABLE IF NOT EXISTS spot_me_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  google_token_expiry TIMESTAMPTZ,
  google_email TEXT,
  max_walk_minutes INTEGER NOT NULL DEFAULT 25,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spot_me_settings_user_id ON spot_me_settings(user_id);

ALTER TABLE spot_me_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS spot_me_settings_rls_select ON spot_me_settings;
CREATE POLICY spot_me_settings_rls_select ON spot_me_settings FOR SELECT
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS spot_me_settings_rls_insert ON spot_me_settings;
CREATE POLICY spot_me_settings_rls_insert ON spot_me_settings FOR INSERT
  WITH CHECK (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS spot_me_settings_rls_update ON spot_me_settings;
CREATE POLICY spot_me_settings_rls_update ON spot_me_settings FOR UPDATE
  USING (user_id = (SELECT current_setting('app.current_user_id')));

DROP POLICY IF EXISTS spot_me_settings_rls_delete ON spot_me_settings;
CREATE POLICY spot_me_settings_rls_delete ON spot_me_settings FOR DELETE
  USING (user_id = (SELECT current_setting('app.current_user_id')));
