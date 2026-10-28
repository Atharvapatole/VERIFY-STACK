import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 */
export function generateOtpCode(): string {
  // crypto.randomInt is cryptographically secure
  const code = crypto.randomInt(100000, 1000000);
  return code.toString();
}

/**
 * Computes a keyed HMAC-SHA256 of the 6-digit OTP code using server-side secret.
 * Low-entropy numbers (000000-999999) must NEVER be stored as plain hashes.
 */
export function hashOtpCode(code: string, overrideSecret?: string): string {
  const secret = overrideSecret || env.OTP_HMAC_SECRET;
  return crypto.createHmac("sha256", secret).update(code.trim()).digest("hex");
}

/**
 * Verifies an OTP code against stored HMAC hash in constant time.
 */
export function verifyOtpCode(candidateCode: string, storedHash: string, overrideSecret?: string): boolean {
  if (!candidateCode || !storedHash) return false;
  const candidateHash = hashOtpCode(candidateCode, overrideSecret);

  const candidateBuffer = Buffer.from(candidateHash, "utf8");
  const storedBuffer = Buffer.from(storedHash, "utf8");

  if (candidateBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}

/**
 * Redacts and masks a phone number for safe storage and logging.
 * Example: +919876543210 -> +91 98******210
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.length <= 6) {
    return cleaned.slice(0, 2) + "****";
  }
  const prefix = cleaned.slice(0, 5);
  const suffix = cleaned.slice(-3);
  return `${prefix}****${suffix}`;
}
