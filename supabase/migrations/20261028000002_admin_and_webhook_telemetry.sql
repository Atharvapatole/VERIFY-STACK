-- Verify Stack: Webhook Telemetry & Platform Admin Schema
-- Migration: 20261028000002_admin_and_webhook_telemetry.sql

-- 1. Add Webhook Telemetry Columns to Integrations
ALTER TABLE public.integrations
    ADD COLUMN IF NOT EXISTS last_webhook_received_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_webhook_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_webhook_error TEXT,
    ADD COLUMN IF NOT EXISTS webhook_events_received INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS webhook_events_processed INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS webhook_events_ignored INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS webhook_events_failed INTEGER NOT NULL DEFAULT 0;

-- 2. Add Moderation Columns to Profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    ADD COLUMN IF NOT EXISTS admin_notes TEXT,
    ADD COLUMN IF NOT EXISTS monthly_otp_limit INTEGER DEFAULT 10000;

-- 3. Dedicated Admin Audit Log Table (Immutable / Append-only)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow only platform admins to read audit logs
CREATE POLICY "Admins can view all admin audit logs"
    ON public.admin_audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 4. Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view and manage platform settings"
    ON public.platform_settings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Seed initial default platform limits
INSERT INTO public.platform_settings (key, value, description)
VALUES 
    ('rate_limits', '{"otp_send_per_phone": 3, "otp_send_per_ip": 10, "otp_verify_per_challenge": 5, "api_requests_per_minute": 120}'::jsonb, 'Global rate limit thresholds'),
    ('cost_estimates', '{"authentication_rate_usd": 0.035, "currency": "USD"}'::jsonb, 'Estimated WhatsApp conversation cost for display')
ON CONFLICT (key) DO NOTHING;

-- Index for high performance admin log lookups
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_integrations_webhook_telemetry ON public.integrations(last_webhook_received_at);
