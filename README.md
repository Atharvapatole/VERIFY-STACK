# Verify Stack — WhatsApp OTP Infrastructure for Developers

> **Tagline:** WhatsApp OTP Infrastructure for Developers.  
> **Production URL:** `https://verifystack-lyart.vercel.app`  
> **Platform Admin Portal:** `https://verifystack-lyart.vercel.app/platform-admin/login`

Verify Stack is a high-security, multi-tenant developer SaaS platform that lets software teams connect their own Meta WhatsApp Business Account (WABA) / Cloud API and request OTP messages directly from their applications via a REST API.

---

## 1. Architectural Highlights & Security

- **Multi-Tenant Own-WABA Model**: Each tenant connects and maintains its own Meta WhatsApp Business Platform credentials. Message delivery is billed directly by Meta to your own WABA. Verify Stack does not charge a mandatory platform fee for core initial usage.
- **Dedicated Webhook Route**: Meta delivers webhook events to `https://verifystack-lyart.vercel.app/api/webhooks/whatsapp/INTEGRATION_ID`. Each integration possesses its own unique callback URL, dedicated verification token, and decrypted App Secret validation.
- **Zero-Knowledge Credential Security**: Stored Meta Access Tokens and App Secrets are encrypted at rest using **AES-256-GCM** with authenticated 96-bit nonces, 128-bit authentication tags, and key versioning. Plaintext secrets are never returned in read APIs.
- **Keyed HMAC-SHA256 OTP Protection**: 6-digit numeric codes have low entropy ($10^6$ combinations). Verify Stack calculates a keyed HMAC using a server-side secret (`OTP_HMAC_SECRET`) before storing challenge records in PostgreSQL, preventing offline rainbow table attacks if a database disclosure occurs.
- **5-Attempt Lockout & Replay Resistance**: Every OTP challenge is limited to 5 verification attempts. Once verified, the challenge is atomically invalidated using conditional database updates to prevent race-condition replays.
- **High-Entropy API Keys**: Supports `vs_live_...` (dispatches through official Meta Cloud API) and `vs_test_...` (simulates OTP lifecycle safely in isolated sandbox). Only cryptographic hashes (`API_KEY_HASH_SECRET`) are stored in the database.
- **God-Level Platform Admin Console**: Dedicated admin console at `/platform-admin` protected by server-side allowlists (`ADMIN_EMAIL_ALLOWLIST`) and role checks. Includes tenant governance, suspension, controlled deletion workflows, real-time health checks, audit logs, and rate limit policies.

---

## 2. Production Webhook URL & Configuration

### Webhook URL Template
```
https://verifystack-lyart.vercel.app/api/webhooks/whatsapp/INTEGRATION_ID
```

Replace `INTEGRATION_ID` with the actual UUID of the WhatsApp integration generated in the Verify Stack dashboard.

### Where to Find Your Integration ID
1. Open your developer dashboard at `/dashboard/integrations`.
2. Locate your connected WhatsApp integration card.
3. The exact, copyable **Production Webhook Callback URL** is pre-generated with your real integration ID:
   `https://verifystack-lyart.vercel.app/api/webhooks/whatsapp/e7b92f14-9988-4c8d-812e-108273645123`
4. The matching **Webhook Verification Token** is displayed alongside it.

### Meta Developers Webhook Setup Guide:
1. Open [Meta for Developers](https://developers.facebook.com/) and navigate to your Meta App.
2. In the left sidebar, navigate to **WhatsApp** -> **Configuration**.
3. In the **Webhook** section, click **Edit**.
4. **Callback URL**: Paste the integration-specific URL (`https://verifystack-lyart.vercel.app/api/webhooks/whatsapp/<INTEGRATION_ID>`).
5. **Verify Token**: Paste the integration's verification token.
6. Click **Verify and Save**. Verify Stack's serverless GET handler verifies the token using constant-time comparison (`crypto.timingSafeEqual`) and returns the exact challenge string.
7. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**. This ensures message status callbacks (`sent`, `delivered`, `read`, `failed`) are ingested and verified against `X-Hub-Signature-256`.
8. In the Verify Stack dashboard, click **Verify Webhook Setup** to run a self-test diagnostic verifying credential decryption, token integrity, and HMAC signature algorithms.

---

## 3. Platform Admin Portal & Provisioning

The Platform Admin portal is located at:
```
https://verifystack-lyart.vercel.app/platform-admin/login
```

### Initial Admin Provisioning (One-Time Setup)

To provision or promote the first platform administrator without committing credentials to Git:

#### Option A: Via Command Line (Recommended)
Run the secure provisioning script locally or in a deployment container:
```bash
npx tsx scripts/provision-admin.ts --email=admin@yourdomain.com --name="Platform Administrator" --password="YourStrongSecurePassword123"
```
*(If the user already exists in your Supabase Auth database, it will promote their role to `'admin'` without altering their existing password).*

#### Option B: Via Supabase SQL Editor
Run the following SQL in your Supabase project:
```sql
UPDATE public.profiles
SET role = 'admin', status = 'active'
WHERE email = 'admin@yourdomain.com';
```

#### Option C: Add to Environment Allowlist
In your Vercel project environment variables, add:
```
ADMIN_EMAIL_ALLOWLIST="admin@yourdomain.com"
```

Once provisioned, navigate to `/platform-admin/login`, enter your credentials, and you will be securely authenticated into the Platform Admin console.

---

## 4. Required Vercel Environment Variables

Set these environment variables in your Vercel Dashboard (**Settings** -> **Environment Variables**):

| Variable | Description | Value / Format |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Canonical Production HTTPS URL | `https://verifystack-lyart.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anonymous Key (Client) | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (Server Only) | `eyJhbGciOi...` |
| `INTEGRATION_ENCRYPTION_KEY` | 32-byte Hex Master Key for AES-256-GCM | `openssl rand -hex 32` |
| `API_KEY_HASH_SECRET` | 32-byte Hex Secret for API Key Hashing | `openssl rand -hex 32` |
| `OTP_HMAC_SECRET` | 32-byte Hex Secret for Keyed OTP HMAC | `openssl rand -hex 32` |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated authorized admin emails | `admin@yourdomain.com,security@yourdomain.com` |
| `META_GRAPH_API_VERSION` | Meta Graph API Version | `v22.0` |

---

## 5. Supabase SQL Migrations

Apply the migration files located in `supabase/migrations/`:

1. `20261028000001_initial_schema.sql` — Core database tables (`profiles`, `projects`, `integrations`, `api_keys`, `otp_challenges`, `send_attempts`, `delivery_events`, `usage_events`, `idempotency_keys`, `rate_limit_buckets`, `audit_events`, `abuse_reports`) with strict RLS policies.
2. `20261028000002_admin_and_webhook_telemetry.sql` — Webhook telemetry counters (`last_webhook_received_at`, `webhook_events_received`, `webhook_events_processed`, etc.), user moderation fields, `admin_audit_logs`, and `platform_settings`.

Run via Supabase Dashboard **SQL Editor** or Supabase CLI:
```bash
npx supabase db push
```

### Disabling Signup Email Confirmation (Supabase Setting)
To allow immediate developer onboarding:
1. Open your **Supabase Dashboard** -> **Authentication** -> **Providers** -> **Email**.
2. Toggle **Confirm email** to **OFF** (`Disabled`).
3. Click **Save**.

---

## 6. Testing & Acceptance Verification

Run the automated test suite locally:
```bash
npm test
```

### Test Coverage (30 Unit & Integration Tests):
- **Admin Authentication**: Allowlist validation, whitespace & case-insensitivity, non-allowlisted rejection (403), confirmation phrase matching for safe account deletion.
- **Webhook GET Challenge**: Constant-time verification token matching, rejection of mismatched tokens (403).
- **Webhook POST Signature**: Raw-body HMAC-SHA256 calculation with decrypted App Secret, `X-Hub-Signature-256` constant-time verification, rejection of forged signatures (401).
- **Event Idempotency**: Deduplication of duplicate webhook status events.
- **OTP Lifecycle**: Keyed HMAC hashing, 5-minute expiry, strict 5-attempt lockout, replay attack prevention.
- **Credential Encryption**: AES-256-GCM roundtrip, nonce uniqueness, auth tag verification, tampering rejection.
- **Meta Provider Adapter**: Official WhatsApp template formatting, international phone normalization, client error sanitization without credential leakage.

---

## 7. Troubleshooting Guide

### Webhook Verification Fails in Meta Dashboard
- **Symptom**: Meta reports "The URL couldn't be validated".
- **Fix**:
  1. Ensure the URL ends with your actual integration ID: `https://verifystack-lyart.vercel.app/api/webhooks/whatsapp/<INTEGRATION_ID>`.
  2. Verify that the **Verify Token** entered in Meta exactly matches the token displayed in your Verify Stack dashboard.
  3. Ensure your production deployment has `NEXT_PUBLIC_APP_URL="https://verifystack-lyart.vercel.app"` and database migrations applied.

### Admin Login Denied
- **Symptom**: "Access denied. Your account does not possess platform administrator privileges."
- **Fix**:
  1. Confirm that the signing-in email is listed in `ADMIN_EMAIL_ALLOWLIST` in Vercel environment variables.
  2. Or verify that the user's record in `public.profiles` has `role = 'admin'` and `status = 'active'`.
  3. Run `npm run admin:provision -- --email=your_email@domain.com` to promote your user.
