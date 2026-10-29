import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/aes";
import { verifyMetaWebhookSignature } from "@/lib/crypto/signature";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { getCanonicalAppUrl } from "@/lib/base-url";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("integrations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !integration) {
    return NextResponse.json({ error: "Integration not found or access denied." }, { status: 404 });
  }

  const diagnostics: Record<string, { status: "passed" | "failed"; detail: string }> = {};

  // 1. Test Credential Decryption
  let decryptedAppSecret = "";
  let decryptedToken = "";
  try {
    decryptedAppSecret = decryptSecret(integration.encrypted_app_secret);
    decryptedToken = decryptSecret(integration.encrypted_access_token);
    diagnostics.credential_decryption = {
      status: "passed",
      detail: "AES-256-GCM ciphertexts decrypted successfully using server master key.",
    };
  } catch (err: any) {
    diagnostics.credential_decryption = {
      status: "failed",
      detail: "Decryption failed. Stored secrets cannot be decrypted with the current master key.",
    };
  }

  // 2. Test Verification Token
  if (integration.webhook_verify_token && integration.webhook_verify_token.length >= 16) {
    diagnostics.verification_token = {
      status: "passed",
      detail: `Verification token present (${integration.webhook_verify_token.length} chars). Constant-time matching ready.`,
    };
  } else {
    diagnostics.verification_token = {
      status: "failed",
      detail: "Verification token missing or insufficient entropy.",
    };
  }

  // 3. Test Signature Engine
  if (decryptedAppSecret) {
    const testPayload = JSON.stringify({ entry: [{ id: "test", changes: [] }] });
    const computedHmac = crypto
      .createHmac("sha256", decryptedAppSecret)
      .update(testPayload, "utf8")
      .digest("hex");
    const testHeader = `sha256=${computedHmac}`;
    const sigValid = verifyMetaWebhookSignature(testPayload, testHeader, decryptedAppSecret);

    if (sigValid) {
      diagnostics.signature_engine = {
        status: "passed",
        detail: "HMAC-SHA256 signature generation and constant-time validation verified.",
      };
    } else {
      diagnostics.signature_engine = {
        status: "failed",
        detail: "HMAC signature comparison failed.",
      };
    }
  } else {
    diagnostics.signature_engine = {
      status: "failed",
      detail: "Cannot test signature engine without decrypted App Secret.",
    };
  }

  // 4. Webhook URL format
  const baseUrl = getCanonicalAppUrl();
  const expectedUrl = `${baseUrl.replace(/\/$/, "")}/api/webhooks/whatsapp/${integration.id}`;

  const allPassed = Object.values(diagnostics).every((d) => d.status === "passed");

  return NextResponse.json({
    success: allPassed,
    integration_id: integration.id,
    production_webhook_url: expectedUrl,
    diagnostics,
    telemetry: {
      status: integration.status,
      last_received_at: integration.last_webhook_received_at,
      last_verified_at: integration.last_webhook_verified_at,
      last_error: integration.last_webhook_error,
      events_received: integration.webhook_events_received || 0,
      events_processed: integration.webhook_events_processed || 0,
      events_ignored: integration.webhook_events_ignored || 0,
      events_failed: integration.webhook_events_failed || 0,
    },
  });
}
