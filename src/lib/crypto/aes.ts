import crypto from "node:crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard GCM 96-bit nonce
const CURRENT_KEY_VERSION = 1;

/**
 * Derives a consistent 32-byte Buffer key from the hex or string secret.
 */
function getDerivedKey(rawSecret?: string): Buffer {
  const secret = rawSecret || env.INTEGRATION_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be provided and be at least 32 characters.");
  }
  // If it's a 64-char hex string, decode as hex; otherwise hash with SHA-256 to ensure exact 32-byte key
  if (secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string;         // Base64 encoded (12 bytes)
  tag: string;        // Base64 encoded (16 bytes auth tag)
  v: number;          // Key version
}

/**
 * Encrypts sensitive credentials (such as Meta Access Tokens or App Secrets)
 * using authenticated AES-256-GCM encryption with unique nonces.
 */
export function encryptSecret(plaintext: string, overrideSecret?: string): string {
  if (!plaintext) {
    throw new Error("Plaintext value to encrypt cannot be empty.");
  }

  const key = getDerivedKey(overrideSecret);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  const payload: EncryptedData = {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    v: CURRENT_KEY_VERSION,
  };

  return JSON.stringify(payload);
}

/**
 * Decrypts authenticated AES-256-GCM ciphertext.
 * Fails closed if the ciphertext is tampered with or corrupted.
 */
export function decryptSecret(encryptedPayload: string, overrideSecret?: string): string {
  if (!encryptedPayload) {
    throw new Error("Encrypted payload cannot be empty.");
  }

  let parsed: EncryptedData;
  try {
    parsed = JSON.parse(encryptedPayload);
  } catch {
    throw new Error("Invalid encrypted payload format: Expected valid JSON.");
  }

  if (!parsed.ciphertext || !parsed.iv || !parsed.tag) {
    throw new Error("Invalid encrypted payload: missing ciphertext, iv, or auth tag.");
  }

  const key = getDerivedKey(overrideSecret);
  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const encryptedText = Buffer.from(parsed.ciphertext, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error("Decryption failed: authentication tag mismatch or corrupted data.");
  }
}
