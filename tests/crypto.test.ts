import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "../src/lib/crypto/aes";
import { generateOtpCode, hashOtpCode, verifyOtpCode, maskPhoneNumber } from "../src/lib/crypto/otp";
import { generateApiKey, hashApiKey, verifyApiKeyHash, parseApiKeyPrefix } from "../src/lib/crypto/api-key";
import { verifyMetaWebhookSignature } from "../src/lib/crypto/signature";
import crypto from "node:crypto";

describe("AES-256-GCM Credential Encryption & Decryption", () => {
  const secretKey = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  it("successfully encrypts and decrypts sensitive Meta access tokens", () => {
    const rawToken = "EAAQZBBxyz123456789LongMetaAccessTokenString";
    const encrypted = encryptSecret(rawToken, secretKey);

    expect(encrypted).toBeTypeOf("string");
    expect(encrypted).not.toContain(rawToken);

    const decrypted = decryptSecret(encrypted, secretKey);
    expect(decrypted).toBe(rawToken);
  });

  it("produces unique nonces/IVs for identical plaintext", () => {
    const plaintext = "SameSecretValue123";
    const enc1 = JSON.parse(encryptSecret(plaintext, secretKey));
    const enc2 = JSON.parse(encryptSecret(plaintext, secretKey));

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it("fails securely when ciphertext or auth tag is tampered with", () => {
    const plaintext = "ConfidentialCredential";
    const encryptedJson = encryptSecret(plaintext, secretKey);
    const parsed = JSON.parse(encryptedJson);

    // Tamper with ciphertext
    parsed.ciphertext = Buffer.from("tampered_ciphertext").toString("base64");
    const tamperedJson = JSON.stringify(parsed);

    expect(() => decryptSecret(tamperedJson, secretKey)).toThrow(/Decryption failed/);
  });

  it("fails securely when wrong encryption key is used", () => {
    const plaintext = "ConfidentialCredential";
    const encrypted = encryptSecret(plaintext, secretKey);
    const wrongKey = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

    expect(() => decryptSecret(encrypted, wrongKey)).toThrow();
  });
});

describe("OTP CSPRNG, Keyed HMAC & Phone Masking", () => {
  const hmacSecret = "test-hmac-secret-abcdef0123456789abcdef0123456789";

  it("generates 6-digit numeric OTPs", () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateOtpCode();
      expect(otp).toMatch(/^\d{6}$/);
      const num = parseInt(otp, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThan(1000000);
    }
  });

  it("computes keyed HMAC-SHA256 and verifies valid codes in constant time", () => {
    const otp = "849201";
    const hash = hashOtpCode(otp, hmacSecret);

    expect(verifyOtpCode("849201", hash, hmacSecret)).toBe(true);
    expect(verifyOtpCode("849202", hash, hmacSecret)).toBe(false);
    expect(verifyOtpCode("000000", hash, hmacSecret)).toBe(false);
  });

  it("protects low-entropy 6-digit codes by requiring server secret", () => {
    const otp = "123456";
    const plainSha256 = crypto.createHash("sha256").update(otp).digest("hex");
    const keyedHmac = hashOtpCode(otp, hmacSecret);

    // Keyed HMAC must not match plain unkeyed SHA-256
    expect(keyedHmac).not.toBe(plainSha256);
  });

  it("safely masks E.164 phone numbers without revealing identity", () => {
    expect(maskPhoneNumber("+919876543210")).toBe("+9198****210");
    expect(maskPhoneNumber("+14155552671")).toBe("+1415****671");
  });
});

describe("High-Entropy API Keys", () => {
  const hashSecret = "api-key-hash-secret-1234567890abcdef1234567890abcdef";

  it("generates live and test keys with recognizable prefixes and hints", () => {
    const liveKey = generateApiKey("live");
    expect(liveKey.plaintextKey.startsWith("vs_live_")).toBe(true);
    expect(liveKey.keyPrefix).toBe("vs_live_");
    expect(liveKey.keyHint.startsWith("vs_live_")).toBe(true);
    expect(liveKey.plaintextKey.length).toBeGreaterThan(60);

    const testKey = generateApiKey("test");
    expect(testKey.plaintextKey.startsWith("vs_test_")).toBe(true);
    expect(testKey.keyPrefix).toBe("vs_test_");
  });

  it("parses API key prefixes correctly", () => {
    expect(parseApiKeyPrefix("vs_live_abc123")).toEqual({ valid: true, environment: "live" });
    expect(parseApiKeyPrefix("vs_test_xyz789")).toEqual({ valid: true, environment: "test" });
    expect(parseApiKeyPrefix("sk_live_123456")).toEqual({ valid: false });
  });

  it("verifies API key hashes in constant time", () => {
    const key = generateApiKey("live");
    const storedHash = hashApiKey(key.plaintextKey, hashSecret);

    expect(verifyApiKeyHash(key.plaintextKey, storedHash, hashSecret)).toBe(true);
    expect(verifyApiKeyHash("vs_live_wrongKey1234567890", storedHash, hashSecret)).toBe(false);
  });
});

describe("Meta Webhook Signature Verification", () => {
  const appSecret = "meta_app_secret_998877665544";

  it("validates authentic Meta X-Hub-Signature-256 headers", () => {
    const payload = JSON.stringify({ entry: [{ id: "123", changes: [] }] });
    const signature = crypto.createHmac("sha256", appSecret).update(payload, "utf8").digest("hex");
    const header = `sha256=${signature}`;

    const isValid = verifyMetaWebhookSignature(payload, header, appSecret);
    expect(isValid).toBe(true);
  });

  it("rejects forged or modified webhook payloads", () => {
    const legitimatePayload = JSON.stringify({ entry: [{ id: "123" }] });
    const forgedPayload = JSON.stringify({ entry: [{ id: "999_injected" }] });

    const signature = crypto.createHmac("sha256", appSecret).update(legitimatePayload, "utf8").digest("hex");
    const header = `sha256=${signature}`;

    const isValid = verifyMetaWebhookSignature(forgedPayload, header, appSecret);
    expect(isValid).toBe(false);
  });

  it("rejects mismatched App Secrets", () => {
    const payload = JSON.stringify({ entry: [] });
    const signature = crypto.createHmac("sha256", "other_secret").update(payload, "utf8").digest("hex");
    const header = `sha256=${signature}`;

    const isValid = verifyMetaWebhookSignature(payload, header, appSecret);
    expect(isValid).toBe(false);
  });
});
