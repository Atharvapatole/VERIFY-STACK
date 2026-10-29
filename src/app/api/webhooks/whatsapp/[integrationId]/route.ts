import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/aes";
import { verifyMetaWebhookSignature } from "@/lib/crypto/signature";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

  // Support both dotted hub.* parameter names sent by Meta and optional standard names
  const mode = (searchParams.get("hub.mode") || searchParams.get("mode") || "").trim();
  const token = (searchParams.get("hub.verify_token") || searchParams.get("verify_token") || "").trim();
  const challenge = searchParams.get("hub.challenge") || searchParams.get("challenge");

  if (!mode) {
    return new NextResponse("Missing hub.mode parameter", { status: 400 });
  }

  if (mode !== "subscribe") {
    return new NextResponse(`Unsupported hub.mode: ${mode}`, { status: 400 });
  }

  if (!token || !challenge) {
    return new NextResponse("Missing hub.verify_token or hub.challenge parameter", { status: 400 });
  }

  if (!integrationId || integrationId.trim() === "") {
    return new NextResponse("Missing integrationId parameter in URL", { status: 400 });
  }

  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("integrations")
    .select("id, webhook_verify_token, status, webhook_events_received, webhook_events_processed, webhook_events_failed")
    .eq("id", integrationId.trim())
    .maybeSingle();

  if (error || !integration) {
    return new NextResponse("Integration not found", { status: 404 });
  }

  if (integration.status === "disabled") {
    return new NextResponse("Integration is disabled", { status: 403 });
  }

  // Constant-time comparison of verify token
  const expectedToken = (integration.webhook_verify_token || "").trim();
  let tokenMatch = false;

  if (expectedToken.length > 0 && token.length === expectedToken.length) {
    tokenMatch = crypto.timingSafeEqual(
      Buffer.from(token, "utf8"),
      Buffer.from(expectedToken, "utf8")
    );
  }

  const nowIso = new Date().toISOString();

  if (tokenMatch) {
    // Record successful verification telemetry and transition status to verified
    await admin
      .from("integrations")
      .update({
        status: "verified",
        last_tested_at: nowIso,
        last_webhook_verified_at: nowIso,
        last_webhook_received_at: nowIso,
        last_webhook_error: null,
        webhook_events_received: (integration.webhook_events_received || 0) + 1,
        webhook_events_processed: (integration.webhook_events_processed || 0) + 1,
        updated_at: nowIso,
      })
      .eq("id", integration.id);

    // Return the exact challenge string as plain text with HTTP 200 as strictly required by Meta
    return new NextResponse(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  // Verification failure
  await admin
    .from("integrations")
    .update({
      last_webhook_error: "Verification token mismatch during GET challenge",
      webhook_events_failed: (integration.webhook_events_failed || 0) + 1,
      updated_at: nowIso,
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
    .select("id, project_id, encrypted_app_secret, status, webhook_events_received, webhook_events_processed, webhook_events_ignored, webhook_events_failed")
    .eq("id", integrationId.trim())
    .maybeSingle();

  if (error || !integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  if (integration.status === "disabled") {
    return NextResponse.json({ error: "Integration is disabled" }, { status: 403 });
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  // Verify HMAC-SHA256 signature in constant time using decrypted Meta App Secret
  const isSignatureValid = verifyMetaWebhookSignature(rawBody, signature, appSecret);
  if (!isSignatureValid) {
    await admin
      .from("integrations")
      .update({
        last_webhook_error: "Invalid X-Hub-Signature-256 header",
        webhook_events_failed: (integration.webhook_events_failed || 0) + 1,
        updated_at: new Date().toISOString(),
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
        updated_at: new Date().toISOString(),
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
      updated_at: nowIso,
    })
    .eq("id", integration.id);

  // Promptly acknowledge Meta with 200 OK
  return NextResponse.json({ success: true, received: true, processed: processedCount, ignored: ignoredCount });
}
