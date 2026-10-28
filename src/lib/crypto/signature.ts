import crypto from "node:crypto";

/**
 * Validates Meta WhatsApp Webhook X-Hub-Signature-256 header.
 * Meta computes: HMAC-SHA256 of the raw payload string using the App Secret.
 *
 * @param rawBody - Exact raw UTF-8 string of the incoming request body
 * @param signatureHeader - X-Hub-Signature-256 header, e.g. "sha256=abcdef..."
 * @param appSecret - Decrypted Meta App Secret
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string
): boolean {
  if (!signatureHeader || !appSecret || !rawBody) {
    return false;
  }

  // Header format must be "sha256=<hex>"
  const parts = signatureHeader.split("=");
  if (parts.length !== 2 || parts[0] !== "sha256") {
    return false;
  }

  const expectedHash = parts[1];
  const computedHash = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  const computedBuffer = Buffer.from(computedHash, "utf8");

  if (expectedBuffer.length !== computedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
}
