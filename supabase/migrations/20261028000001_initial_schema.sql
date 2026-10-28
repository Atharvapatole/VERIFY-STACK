-- Verify Stack: Comprehensive Database Schema & Row Level Security
-- Migration: 20261028000001_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 1. PROFILES TABLE (Linked to auth.users)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- ====================================================================
-- 2. PROJECTS TABLE (Multi-tenant container)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, slug)
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
    ON public.projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
    ON public.projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON public.projects FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON public.projects FOR DELETE
    USING (auth.uid() = user_id);

-- ====================================================================
-- 3. INTEGRATIONS TABLE (WhatsApp Cloud API credentials, encrypted at rest)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    waba_id TEXT NOT NULL,
    template_name TEXT NOT NULL DEFAULT 'otp_authentication',
    template_language TEXT NOT NULL DEFAULT 'en_US',
    webhook_verify_token TEXT NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_app_secret TEXT NOT NULL,
    key_version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'disabled')),
    is_sandbox BOOLEAN NOT NULL DEFAULT FALSE,
    last_tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage integrations in their projects"
    ON public.integrations FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- 4. API KEYS TABLE (Hashed, never stored plaintext)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL CHECK (key_prefix IN ('vs_live_', 'vs_test_')),
    key_hint TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    environment TEXT NOT NULL CHECK (environment IN ('live', 'test')),
    scopes TEXT[] NOT NULL DEFAULT ARRAY['otp:send', 'otp:verify'],
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their API keys"
    ON public.api_keys FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ====================================================================
-- 5. OTP CHALLENGES (Server-side lifecycle, keyed HMAC hash)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.otp_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
    phone_e164 TEXT NOT NULL,
    phone_masked TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'authentication',
    code_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    is_sandbox BOOLEAN NOT NULL DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OTP challenges should only be accessed server-side via trusted Service Role
ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all client direct queries to OTP challenges"
    ON public.otp_challenges FOR ALL
    USING (FALSE);

-- ====================================================================
-- 6. SEND ATTEMPTS & DELIVERY EVENTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.send_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES public.otp_challenges(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'accepted', 'delivered', 'failed', 'simulated')),
    provider_message_id TEXT,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.send_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view send attempts"
    ON public.send_attempts FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects WHERE projects.id = send_attempts.project_id AND projects.user_id = auth.uid()
    ));

CREATE TABLE IF NOT EXISTS public.delivery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    provider_message_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'read', 'failed')),
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view delivery events"
    ON public.delivery_events FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.projects WHERE projects.id = delivery_events.project_id AND projects.user_id = auth.uid()
    ));

-- ====================================================================
-- 7. USAGE EVENTS & IDEMPOTENCY KEYS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('send', 'verify')),
    is_sandbox BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project owners can view usage events"
    ON public.usage_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key TEXT NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    response_status INTEGER NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, key)
);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
-- Managed solely server-side by API handler

-- ====================================================================
-- 8. DISTRIBUTED RATE LIMIT BUCKETS (Serverless safe)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
    bucket_key TEXT PRIMARY KEY,
    tokens INTEGER NOT NULL,
    last_refill TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 9. AUDIT EVENTS & ABUSE REPORTS
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit logs"
    ON public.audit_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.abuse_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reported_project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create abuse reports"
    ON public.abuse_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_user_id);

-- ====================================================================
-- 10. INDEXES FOR HIGH-PERFORMANCE LOOKUPS
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_project_id ON public.integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_lookup ON public.api_keys(key_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_otp_challenges_lookup ON public.otp_challenges(id, project_id, status);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone ON public.otp_challenges(phone_e164, created_at);
CREATE INDEX IF NOT EXISTS idx_send_attempts_challenge ON public.send_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_send_attempts_project ON public.send_attempts(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_events_msg_id ON public.delivery_events(provider_message_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_project ON public.usage_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_expires ON public.rate_limit_buckets(expires_at);

-- Trigger for auto-updating updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
