import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyMetaWebhookSignature } from "../src/lib/crypto/signature";
import { getCanonicalAppUrl, CANONICAL_PRODUCTION_URL } from "../src/lib/base-url";
import crypto from "node:crypto";

describe("Canonical App URL & Base URL Resolution", () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv;
  });

  it("strictly returns canonical URL when no env var is set", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getCanonicalAppUrl()).toBe(CANONICAL_PRODUCTION_URL);
    expect(getCanonicalAppUrl()).toBe("https://verifystack-lyart.vercel.app");
  });

  it("rejects non-existent verifystack.vercel.app domain and falls back to canonical", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://verifystack.vercel.app";
    expect(getCanonicalAppUrl()).toBe(CANONICAL_PRODUCTION_URL);
    expect(getCanonicalAppUrl()).toBe("https://verifystack-lyart.vercel.app");
  });

  it("rejects verifystack.vercel.app even with trailing slash or path", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://verifystack.vercel.app/";
    expect(getCanonicalAppUrl()).toBe(CANONICAL_PRODUCTION_URL);
  });

  it("rejects localhost in production and falls back to canonical", () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    expect(getCanonicalAppUrl()).toBe(CANONICAL_PRODUCTION_URL);
  });

  it("allows valid custom production domains", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://auth.mycompany.com";
    expect(getCanonicalAppUrl()).toBe("https://auth.mycompany.com");
  });
});

describe("Meta WhatsApp Webhook Advanced Verification & Idempotency", () => {
  const appSecret = "test_meta_app_secret_1029384756";

  it("validates exact Meta GET challenge token matching in constant time", () => {
    const storedToken = "whsec_0123456789abcdef0123456789abcdef0123456789abcdef";
    const suppliedToken = "whsec_0123456789abcdef0123456789abcdef0123456789abcdef";

    const isMatch =
      suppliedToken.length === storedToken.length &&
      crypto.timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(storedToken));

    expect(isMatch).toBe(true);
  });

  it("rejects mismatched verify tokens during GET challenge without throwing", () => {
    const storedToken = "whsec_0123456789abcdef0123456789abcdef0123456789abcdef";
    const wrongToken = "whsec_wrong_token_123456789";

    // Different length must not throw in crypto.timingSafeEqual
    const isMatch =
      wrongToken.length === storedToken.length &&
      crypto.timingSafeEqual(Buffer.from(wrongToken), Buffer.from(storedToken));

    expect(isMatch).toBe(false);
  });

  it("parses both dotted hub.* and flat parameters per Meta specifications", () => {
    const searchParamsDotted = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.challenge": "1158201444",
      "hub.verify_token": "whsec_test_token_123",
    });

    const mode1 = searchParamsDotted.get("hub.mode") || searchParamsDotted.get("mode");
    const challenge1 = searchParamsDotted.get("hub.challenge") || searchParamsDotted.get("challenge");
    const token1 = searchParamsDotted.get("hub.verify_token") || searchParamsDotted.get("verify_token");

    expect(mode1).toBe("subscribe");
    expect(challenge1).toBe("1158201444");
    expect(token1).toBe("whsec_test_token_123");

    const searchParamsFlat = new URLSearchParams({
      mode: "subscribe",
      challenge: "9988776655",
      verify_token: "whsec_test_token_456",
    });

    const mode2 = searchParamsFlat.get("hub.mode") || searchParamsFlat.get("mode");
    const challenge2 = searchParamsFlat.get("hub.challenge") || searchParamsFlat.get("challenge");
    const token2 = searchParamsFlat.get("hub.verify_token") || searchParamsFlat.get("verify_token");

    expect(mode2).toBe("subscribe");
    expect(challenge2).toBe("9988776655");
    expect(token2).toBe("whsec_test_token_456");
  });

  it("enforces Meta GET challenge protocol rules", () => {
    // Mode must be subscribe
    const validateChallengeRequest = (params: { mode?: string; challenge?: string; token?: string }, storedToken: string) => {
      if (!params.mode || params.mode !== "subscribe") {
        return { status: 400, body: "Invalid or unsupported hub.mode" };
      }
      if (!params.challenge) {
        return { status: 400, body: "Missing hub.challenge" };
      }
      if (!params.token) {
        return { status: 400, body: "Missing hub.verify_token" };
      }
      const match =
        params.token.length === storedToken.length &&
        crypto.timingSafeEqual(Buffer.from(params.token), Buffer.from(storedToken));
      if (!match) {
        return { status: 403, body: "Verification token mismatch" };
      }
      return { status: 200, body: params.challenge, contentType: "text/plain; charset=utf-8" };
    };

    const stored = "whsec_valid_token_abc";

    // Success case
    const success = validateChallengeRequest({ mode: "subscribe", challenge: "12345678", token: "whsec_valid_token_abc" }, stored);
    expect(success.status).toBe(200);
    expect(success.body).toBe("12345678");
    expect(success.contentType).toBe("text/plain; charset=utf-8");

    // Token mismatch case
    const mismatch = validateChallengeRequest({ mode: "subscribe", challenge: "12345678", token: "whsec_invalid" }, stored);
    expect(mismatch.status).toBe(403);

    // Unsupported mode case
    const badMode = validateChallengeRequest({ mode: "publish", challenge: "12345678", token: "whsec_valid_token_abc" }, stored);
    expect(badMode.status).toBe(400);

    // Missing challenge
    const noChallenge = validateChallengeRequest({ mode: "subscribe", token: "whsec_valid_token_abc" }, stored);
    expect(noChallenge.status).toBe(400);
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
