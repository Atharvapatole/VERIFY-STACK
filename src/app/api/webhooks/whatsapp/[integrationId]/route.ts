import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/aes";
import { verifyMetaWebhookSignature } from "@/lib/crypto/signature";
import crypto from "node:crypto";

/**
 * Meta WhatsApp Cloud API Webhook Handler for individual integrations.
 *
 * Route: /api/webhooks/whatsapp/[integrationId]
 * GET: Handles the Meta Hub subscription challenge with constant-time token comparison.
 * POST: Validates X-Hub-Signature-256 against decrypted App Secret and records delivery events idempotently.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (!mode || !token || !challenge) {
    return new NextResponse("Missing hub challenge parameters", { status: 400 });
  }

  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("integrations")
    .select("id, webhook_verify_token, status, webhook_events_received, webhook_events_processed, webhook_events_failed")
    .eq("id", integrationId)
    .maybeSingle();

  if (error || !integration) {
    return new NextResponse("Integration not found", { status: 404 });
  }

  // Constant-time comparison of verify token
  const expectedToken = integration.webhook_verify_token;
  const tokenMatch =
    token.length === expectedToken.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));

  const nowIso = new Date().toISOString();

  if (mode === "subscribe" && tokenMatch) {
    // Record successful verification telemetry
    await admin
      .from("integrations")
      .update({
        status: "verified",
        last_tested_at: nowIso,
        last_webhook_verified_at: nowIso,
        last_webhook_error: null,
        webhook_events_received: (integration.webhook_events_received || 0) + 1,
        webhook_events_processed: (integration.webhook_events_processed || 0) + 1,
      })
      .eq("id", integration.id);

    // Return the raw challenge string with text/plain as strictly required by Meta
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Verification failure
  await admin
    .from("integrations")
    .update({
      last_webhook_error: "Verification token mismatch during GET challenge",
      webhook_events_failed: (integration.webhook_events_failed || 0) + 1,
    })
    .eq("id", integration.id);

  return new NextResponse("Verification token mismatch", { status: 403 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const signature = request.headers.get("x-hub-signature-256");

  // Read raw request body string for signature verification before JSON parsing
  const rawBody = await request.text();

  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("integrations")
    .select("id, project_id, encrypted_app_secret, webhook_events_received, webhook_events_processed, webhook_events_ignored, webhook_events_failed")
    .eq("id", integrationId)
    .maybeSingle();

  if (error || !integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  // Decrypt App Secret
  let appSecret = "";
  try {
    appSecret = decryptSecret(integration.encrypted_app_secret);
  } catch {
    await admin
      .from("integrations")
      .update({
        last_webhook_error: "Failed to decrypt integration App Secret for signature validation",
        webhook_events_failed: (integration.webhook_events_failed || 0) + 1,
      })
      .eq("id", integration.id);

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Verify HMAC-SHA256 signature in constant time
  const isSignatureValid = verifyMetaWebhookSignature(rawBody, signature, appSecret);
  if (!isSignatureValid) {
    await admin
      .from("integrations")
      .update({
        last_webhook_error: "Invalid X-Hub-Signature-256 header",
        webhook_events_failed: (integration.webhook_events_failed || 0) + 1,
      })
      .eq("id", integration.id);

    return NextResponse.json({ error: "Invalid X-Hub-Signature-256" }, { status: 401 });
  }

  // Parse Meta Payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await admin
      .from("integrations")
      .update({
        last_webhook_error: "Malformed JSON payload in webhook body",
        webhook_events_failed: (integration.webhook_events_failed || 0) + 1,
      })
      .eq("id", integration.id);

    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  let processedCount = 0;
  let ignoredCount = 0;

  // Process Status Updates and Messages
  const entries = payload?.entry || [];
  for (const entry of entries) {
    const changes = entry?.changes || [];
    for (const change of changes) {
      const statuses = change?.value?.statuses || [];
      for (const statusObj of statuses) {
        const messageId = statusObj?.id;
        const eventType = statusObj?.status; // 'sent' | 'delivered' | 'read' | 'failed'

        if (!messageId || !eventType) continue;

        // Idempotency: Check if this delivery event was already recorded
        const { data: existingEvent } = await admin
          .from("delivery_events")
          .select("id")
          .eq("provider_message_id", messageId)
          .eq("event_type", eventType)
          .maybeSingle();

        if (existingEvent) {
          ignoredCount++;
          continue; // Duplicate event acknowledged idempotently
        }

        // Record delivery event
        await admin.from("delivery_events").insert({
          project_id: integration.project_id,
          provider_message_id: messageId,
          event_type: eventType,
          raw_payload: statusObj,
        });

        processedCount++;

        // Update send attempt status if matching
        if (eventType === "delivered" || eventType === "failed") {
          await admin
            .from("send_attempts")
            .update({
              status: eventType === "delivered" ? "delivered" : "failed",
              error_message: statusObj?.errors?.[0]?.title || null,
              error_code: statusObj?.errors?.[0]?.code?.toString() || null,
            })
            .eq("provider_message_id", messageId);
        }
      }
    }
  }

  // Update telemetry on integration
  await admin
    .from("integrations")
    .update({
      last_webhook_received_at: nowIso,
      last_webhook_error: null,
      webhook_events_received: (integration.webhook_events_received || 0) + 1,
      webhook_events_processed: (integration.webhook_events_processed || 0) + processedCount,
      webhook_events_ignored: (integration.webhook_events_ignored || 0) + ignoredCount,
    })
    .eq("id", integration.id);

  // Promptly acknowledge Meta with 200 OK
  return NextResponse.json({ success: true, received: true, processed: processedCount, ignored: ignoredCount });
}
