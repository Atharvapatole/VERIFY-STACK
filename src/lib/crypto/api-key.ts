import crypto from "node:crypto";
import { env } from "@/lib/env";

export type ApiKeyEnvironment = "live" | "test";

export interface GeneratedApiKey {
  plaintextKey: string;
  keyPrefix: "vs_live_" | "vs_test_";
  keyHint: string;
  keyHash: string;
  environment: ApiKeyEnvironment;
}

/**
 * Generates a high-entropy random API key.
 * Formats:
 *  - Live: vs_live_<64 hex chars>
 *  - Test: vs_test_<64 hex chars>
 */
export function generateApiKey(environment: ApiKeyEnvironment): GeneratedApiKey {
  const prefix: "vs_live_" | "vs_test_" = environment === "live" ? "vs_live_" : "vs_test_";
  const randomBytes = crypto.randomBytes(32).toString("hex"); // 64 hex chars
  const plaintextKey = `${prefix}${randomBytes}`;

  const keyHint = `${prefix}${randomBytes.slice(0, 4)}...${randomBytes.slice(-4)}`;
  const keyHash = hashApiKey(plaintextKey);

  return {
    plaintextKey,
    keyPrefix: prefix,
    keyHint,
    keyHash,
    environment,
  };
}

/**
 * Computes a keyed HMAC-SHA256 hash of an API key for secure database storage.
 */
export function hashApiKey(plaintextKey: string, overrideSecret?: string): string {
  const secret = overrideSecret || env.API_KEY_HASH_SECRET;
  return crypto.createHmac("sha256", secret).update(plaintextKey.trim()).digest("hex");
}

/**
 * Compares two key hashes in constant time.
 */
export function verifyApiKeyHash(candidateKey: string, storedHash: string, overrideSecret?: string): boolean {
  if (!candidateKey || !storedHash) return false;
  const candidateHash = hashApiKey(candidateKey, overrideSecret);

  const candidateBuffer = Buffer.from(candidateHash, "utf8");
  const storedBuffer = Buffer.from(storedHash, "utf8");

  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}

/**
 * Parses and validates an API key prefix.
 */
export function parseApiKeyPrefix(key: string): { valid: boolean; environment?: ApiKeyEnvironment } {
  if (key.startsWith("vs_live_")) {
    return { valid: true, environment: "live" };
  }
  if (key.startsWith("vs_test_")) {
    return { valid: true, environment: "test" };
  }
  return { valid: false };
}
