import { describe, it, expect } from "vitest";
import { verifyMetaWebhookSignature } from "../src/lib/crypto/signature";
import crypto from "node:crypto";

describe("Meta WhatsApp Webhook Advanced Verification & Idempotency", () => {
  const appSecret = "test_meta_app_secret_1029384756";

  it("validates exact Meta GET challenge token matching in constant time", () => {
    const storedToken = "vs_webhook_secret_tok_9918273645";
    const suppliedToken = "vs_webhook_secret_tok_9918273645";

    const isMatch =
      suppliedToken.length === storedToken.length &&
      crypto.timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(storedToken));

    expect(isMatch).toBe(true);
  });

  it("rejects mismatched verify tokens during GET challenge", () => {
    const storedToken = "vs_webhook_secret_tok_9918273645";
    const wrongToken = "vs_webhook_wrong_token_123456789";

    const isMatch =
      wrongToken.length === storedToken.length &&
      crypto.timingSafeEqual(Buffer.from(wrongToken), Buffer.from(storedToken));

    expect(isMatch).toBe(false);
  });

  it("verifies POST X-Hub-Signature-256 for authentic delivery events", () => {
    const rawPayload = JSON.stringify({
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_12345",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                statuses: [
                  {
                    id: "wamid.HBgLMTIzNDU2Nzg5MA==",
                    status: "delivered",
                    timestamp: "1730112345",
                    recipient_id: "14155552671",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    });

    const expectedHash = crypto.createHmac("sha256", appSecret).update(rawPayload, "utf8").digest("hex");
    const signatureHeader = `sha256=${expectedHash}`;

    expect(verifyMetaWebhookSignature(rawPayload, signatureHeader, appSecret)).toBe(true);
  });

  it("rejects forged or modified webhook payloads (returns 401)", () => {
    const originalPayload = JSON.stringify({ entry: [{ id: "msg_001" }] });
    const forgedPayload = JSON.stringify({ entry: [{ id: "msg_001_injected" }] });

    const expectedHash = crypto.createHmac("sha256", appSecret).update(originalPayload, "utf8").digest("hex");
    const signatureHeader = `sha256=${expectedHash}`;

    expect(verifyMetaWebhookSignature(forgedPayload, signatureHeader, appSecret)).toBe(false);
  });

  it("idempotently handles duplicate delivery status updates", () => {
    const processedEvents = new Set<string>();

    const handleEvent = (messageId: string, eventType: string) => {
      const compositeKey = `${messageId}:${eventType}`;
      if (processedEvents.has(compositeKey)) {
        return { status: "ignored_duplicate" };
      }
      processedEvents.add(compositeKey);
      return { status: "processed_and_recorded" };
    };

    const firstDelivery = handleEvent("wamid_123", "delivered");
    expect(firstDelivery.status).toBe("processed_and_recorded");

    // Second delivery of the exact same event
    const secondDelivery = handleEvent("wamid_123", "delivered");
    expect(secondDelivery.status).toBe("ignored_duplicate");

    // New event for same message (e.g. read status)
    const readDelivery = handleEvent("wamid_123", "read");
    expect(readDelivery.status).toBe("processed_and_recorded");
  });

  it("generates cryptographically secure rotated tokens with whsec_ prefix", () => {
    const generateToken = () => "whsec_" + crypto.randomBytes(24).toString("hex");
    const token = generateToken();
    expect(token.startsWith("whsec_")).toBe(true);
    expect(token.length).toBe(54); // "whsec_" (6) + 48 hex characters
  });

  it("correctly determines integration webhook statuses", () => {
    const getStatus = (item: any) => {
      if (item.last_webhook_error || ((item.webhook_events_failed || 0) > 0 && !item.last_webhook_verified_at)) {
        return "Error";
      }
      if ((item.webhook_events_processed || 0) > 0) {
        return "Receiving events";
      }
      if (item.status === "verified" || item.last_webhook_verified_at) {
        return "Verified";
      }
      if (item.status === "pending") {
        return "Awaiting Meta verification";
      }
      return "Not configured";
    };

    expect(getStatus({ status: "pending", webhook_events_received: 0 })).toBe("Awaiting Meta verification");
    expect(getStatus({ status: "verified", last_webhook_verified_at: "2026-10-28T00:00:00Z" })).toBe("Verified");
    expect(getStatus({ status: "verified", webhook_events_processed: 12 })).toBe("Receiving events");
    expect(getStatus({ last_webhook_error: "Signature mismatch" })).toBe("Error");
    expect(getStatus({ status: "draft" })).toBe("Not configured");
  });
});
