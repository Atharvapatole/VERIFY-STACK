import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/aes";
import { verifyMetaWebhookSignature } from "@/lib/crypto/signature";
import crypto from "node:crypto";

/**
 * Meta WhatsApp Cloud API Webhook Handler for individual integrations.
 *
 * GET: Handles the Meta Hub subscription challenge.
 * POST: Handles message delivery statuses (sent, delivered, read, failed).
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
    .select("id, webhook_verify_token, status")
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

  if (mode === "subscribe" && tokenMatch) {
    // If integration was in pending status, mark as verified
    if (integration.status === "pending") {
      await admin
        .from("integrations")
        .update({ status: "verified", last_tested_at: new Date().toISOString() })
        .eq("id", integration.id);
    }

    // Must return raw challenge string with 200 OK
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Verification token mismatch", { status: 403 });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  const { integrationId } = await params;
  const signature = request.headers.get("x-hub-signature-256");

  // Read raw request body string for signature verification
  const rawBody = await request.text();

  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("integrations")
    .select("id, project_id, encrypted_app_secret")
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
    return NextResponse.json({ error: "Failed to decrypt secret" }, { status: 500 });
  }

  // Verify HMAC-SHA256 signature in constant time
  const isSignatureValid = verifyMetaWebhookSignature(rawBody, signature, appSecret);
  if (!isSignatureValid) {
    return NextResponse.json({ error: "Invalid X-Hub-Signature-256" }, { status: 401 });
  }

  // Parse Meta Payload
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Process Status Updates
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
          continue; // Already processed
        }

        // Record delivery event
        await admin.from("delivery_events").insert({
          project_id: integration.project_id,
          provider_message_id: messageId,
          event_type: eventType,
          raw_payload: statusObj,
        });

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

  // Acknowledge Meta promptly
  return NextResponse.json({ success: true, received: true });
}
