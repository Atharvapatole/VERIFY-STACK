# Verify Stack — WhatsApp OTP Infrastructure for Developers

> **Tagline:** WhatsApp OTP Infrastructure for Developers.

Verify Stack is a secure, developer-first SaaS platform that lets software teams connect their own Meta WhatsApp Business Account (WABA) / Cloud API and request OTP messages directly from their applications via a high-performance REST API.

---

## 1. Architectural Highlights

- **Multi-Tenant Own-WABA Model**: Each tenant connects and maintains its own Meta WhatsApp Business Platform credentials. Message delivery is billed directly by Meta to your own WABA. Verify Stack does not charge a mandatory platform fee for initial usage.
- **Zero-Knowledge Credential Security**: Stored Meta Access Tokens and App Secrets are encrypted at rest using **AES-256-GCM** with authenticated 96-bit nonces and 128-bit authentication tags. Plaintext secrets are never returned in read APIs.
- **Keyed HMAC-SHA256 OTP Protection**: 6-digit numeric codes have low entropy ($10^6$ combinations). Verify Stack calculates a keyed HMAC using a server-side secret (`OTP_HMAC_SECRET`) before storing challenge records in PostgreSQL, preventing offline rainbow table attacks if a database disclosure occurs.
- **5-Attempt Lockout & Replay Resistance**: Every OTP challenge is limited to 5 verification attempts. Once verified, the challenge is atomically invalidated using conditional database updates to prevent race-condition replays.
- **High-Entropy API Keys**: Supports `vs_live_...` (dispatches through official Meta Cloud API) and `vs_test_...` (simulates OTP lifecycle safely in isolated sandbox). Only cryptographic hashes (`API_KEY_HASH_SECRET`) are stored in the database.
- **Persistent Distributed Rate Limiting**: Built on PostgreSQL sliding-window token buckets, functioning reliably across serverless lambda/edge instances with local memory fallback.
- **Meta Webhook Signature Verification**: Webhooks validate `X-Hub-Signature-256` in constant time (`crypto.timingSafeEqual`) using decrypted tenant App Secrets.

---

## 2. Prerequisites

- **Node.js**: v18.18+ or v20+ (tested on Node.js v26)
- **Package Manager**: npm, pnpm, or yarn
- **Supabase Account**: Free Supabase project (PostgreSQL + Auth + Row Level Security)
- **Meta Developer Account**: An eligible Meta App with WhatsApp Business Platform added (for live sending; not needed for Sandbox simulation)

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### Required Configuration Fields:

| Variable | Description | Example / Format |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key (Public) | `eyJhbGci...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key (Server Only) | `eyJhbGci...` |
| `NEXT_PUBLIC_APP_URL` | Canonical Public URL | `http://localhost:3000` or `https://verify.yourdomain.com` |
| `INTEGRATION_ENCRYPTION_KEY` | 32-byte Hex Master Encryption Key | Generate: `openssl rand -hex 32` |
| `API_KEY_HASH_SECRET` | 32-byte Hex API Key Hashing Secret | Generate: `openssl rand -hex 32` |
| `OTP_HMAC_SECRET` | 32-byte Hex OTP Keyed HMAC Secret | Generate: `openssl rand -hex 32` |
| `ADMIN_EMAIL_ALLOWLIST` | Authorized admin email addresses | `admin@yourdomain.com,security@yourdomain.com` |
| `META_GRAPH_API_VERSION` | Meta Graph API Version | Default: `v22.0` |

> [!CAUTION]
> Never commit `.env.local` or paste production secrets into Git source control. Live message sending automatically fails closed if `INTEGRATION_ENCRYPTION_KEY` is missing or uses placeholder keys.

---

## 4. Supabase Setup & Disabling Signup Email Confirmation

Verify Stack allows developers to sign up and start testing immediately without waiting for an activation email.

### Step 4.1: Disable Email Confirmation in Supabase Dashboard
1. Open your **Supabase Dashboard** -> Select your Project.
2. Navigate to **Authentication** -> **Providers** -> **Email**.
3. Toggle **Confirm email** to **OFF** (`Disabled`).
4. Click **Save**.

*(Note: Password reset emails remain fully functional even when signup confirmation is turned off).*

### Step 4.2: Apply Database Migrations
Run the SQL migration script located at:
`supabase/migrations/20261028000001_initial_schema.sql`

You can apply it via:
1. **Supabase Dashboard**: Open the **SQL Editor**, paste the contents of `20261028000001_initial_schema.sql`, and click **Run**.
2. **Supabase CLI**:
   ```bash
   npx supabase db push
   ```

This creates all multi-tenant tables (`profiles`, `projects`, `integrations`, `api_keys`, `otp_challenges`, `send_attempts`, `delivery_events`, `usage_events`, `idempotency_keys`, `rate_limit_buckets`, `audit_events`, `abuse_reports`) and enforces Row Level Security (RLS) policies.

---

## 5. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the automated test suite:
   ```bash
   npm test
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Meta WhatsApp Cloud API Setup Checklist

To connect live WhatsApp delivery:

1. **Create a Meta App**:
   - Go to [Meta for Developers](https://developers.facebook.com/).
   - Create an app with the **Business** type.
   - Add **WhatsApp** product to your app.

2. **Obtain Identifiers**:
   - In WhatsApp -> API Setup, copy your **Phone Number ID** and **WhatsApp Business Account ID (WABA ID)**.

3. **Generate Permanent System User Token**:
   - Go to **Business Manager Settings** -> **Users** -> **System Users**.
   - Create a System User with **Admin** role.
   - Assign WhatsApp Business Account asset permissions.
   - Generate Token with `whatsapp_business_messaging` and `whatsapp_business_management` scopes.

4. **Create an Authentication Template**:
   - In WhatsApp Manager -> Message Templates, create a template named `otp_authentication`.
   - Category: **Authentication**.
   - Add a Copy Code button or URL button with parameter `{{1}}`.
   - Submit for Meta approval (usually approved in minutes).

5. **Configure Webhook Callback**:
   - In Verify Stack dashboard under **WhatsApp Integrations**, copy your **Webhook Callback URL**:
     `https://YOUR_DOMAIN/api/webhooks/whatsapp/<INTEGRATION_ID>`
   - Copy the generated **Webhook Verify Token**.
   - In Meta App Dashboard -> WhatsApp -> Configuration:
     - Set Callback URL to your HTTPS endpoint.
     - Set Verify Token to your integration's verify token.
     - Click **Verify and Save**.
     - Subscribe to the `messages` webhook field.

> [!IMPORTANT]
> Webhooks require a public **HTTPS** endpoint. In local development, use a tunneling tool (such as ngrok or Cloudflare Tunnel) to expose port 3000.

---

## 7. Custom Domain vs Preview URLs

In production deployments (such as Vercel, Railway, or AWS):
- Do **not** rely permanently on temporary preview URLs (e.g. `*.vercel.app`) as your Meta webhook endpoint. Every preview deployment generates a new domain, breaking webhook verification.
- Always configure a production custom domain (e.g. `https://verify.yourdomain.com`) in your DNS and update `NEXT_PUBLIC_APP_URL`.

---

## 8. REST API Quick Reference

### 8.1 Dispatch OTP
```bash
curl -X POST https://api.verifystack.dev/api/v1/otp/send \
  -H "Authorization: Bearer vs_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: req_uuid_102938" \
  -d '{
    "phone": "+14155552671",
    "purpose": "login"
  }'
```

**Response (200 OK):**
```json
{
  "challenge_id": "83fb8b01-1b77-440f-90e1-4c55e9ba4cb8",
  "status": "accepted",
  "phone_masked": "+1415****671",
  "expires_at": "2026-10-28T12:35:00.000Z",
  "is_sandbox": false
}
```

### 8.2 Verify OTP
```bash
curl -X POST https://api.verifystack.dev/api/v1/otp/verify \
  -H "Authorization: Bearer vs_live_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "challenge_id": "83fb8b01-1b77-440f-90e1-4c55e9ba4cb8",
    "code": "729104"
  }'
```

**Response (200 OK):**
```json
{
  "verified": true,
  "status": "verified",
  "challenge_id": "83fb8b01-1b77-440f-90e1-4c55e9ba4cb8"
}
```

---

## 9. Test Suite & Verification

Run the automated test suite:
```bash
npm test
```

Tests cover:
- Authenticated AES-256-GCM encryption/decryption roundtrips and nonce uniqueness.
- OTP CSPRNG generation, keyed HMAC hashing, and phone masking.
- API key generation (`vs_live_`, `vs_test_`), hashing, and constant-time verification.
- Meta `X-Hub-Signature-256` webhook HMAC verification and tampering rejection.
- OTP lifecycle lockout (strict 5-attempt limit), expiration checks, and replay prevention.
- Distributed rate limiter window thresholds and fallback behavior.
- Meta Cloud API provider adapter payload formatting and error sanitization.

---

## 10. License

Verify Stack is distributed under the MIT License. Meta, WhatsApp, and WhatsApp Business are registered trademarks of Meta Platforms, Inc.
