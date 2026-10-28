import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

// In-memory fallback map for resilience & testing
const localFallbackStore = new Map<string, { tokens: number; resetAt: number }>();

/**
 * Distributed rate limiter backed by Supabase PostgreSQL `rate_limit_buckets` table,
 * suitable for serverless functions, with local memory fallback.
 *
 * @param bucketKey - Unique rate limit identifier (e.g. `send:phone:+1234567890`)
 * @param limit - Maximum requests allowed in the window
 * @param windowSeconds - Duration of window in seconds
 */
export async function checkDistributedRateLimit(
  bucketKey: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTimestampSec = Math.ceil((now + windowSeconds * 1000) / 1000);
  const nowIso = new Date(now).toISOString();
  const expiresIso = new Date(now + windowSeconds * 1000).toISOString();

  // In test environment or offline mode, operate immediately via in-memory bucket store
  if (process.env.NODE_ENV === "test" || !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock-verify-stack")) {
    const local = localFallbackStore.get(bucketKey);
    if (!local || now > local.resetAt) {
      localFallbackStore.set(bucketKey, {
        tokens: limit - 1,
        resetAt: now + windowSeconds * 1000,
      });
      return {
        allowed: true,
        remaining: limit - 1,
        reset: resetTimestampSec,
      };
    }

    if (local.tokens <= 0) {
      return {
        allowed: false,
        remaining: 0,
        reset: Math.ceil(local.resetAt / 1000),
      };
    }

    local.tokens -= 1;
    return {
      allowed: true,
      remaining: local.tokens,
      reset: Math.ceil(local.resetAt / 1000),
    };
  }

  try {
    const admin = createAdminClient();

    // Query existing bucket
    const { data: bucket, error: selectError } = await admin
      .from("rate_limit_buckets")
      .select("tokens, expires_at, last_refill")
      .eq("bucket_key", bucketKey)
      .maybeSingle();

    if (selectError && selectError.code !== "PGRST116") {
      throw selectError;
    }

    if (!bucket) {
      // Create new bucket with limit - 1
      await admin.from("rate_limit_buckets").insert({
        bucket_key: bucketKey,
        tokens: limit - 1,
        last_refill: nowIso,
        expires_at: expiresIso,
      });

      return {
        allowed: true,
        remaining: limit - 1,
        reset: resetTimestampSec,
      };
    }

    const bucketExpires = new Date(bucket.expires_at).getTime();

    // If bucket expired, reset window
    if (now > bucketExpires) {
      await admin
        .from("rate_limit_buckets")
        .update({
          tokens: limit - 1,
          last_refill: nowIso,
          expires_at: expiresIso,
        })
        .eq("bucket_key", bucketKey);

      return {
        allowed: true,
        remaining: limit - 1,
        reset: resetTimestampSec,
      };
    }

    // Bucket still active in current window
    if (bucket.tokens <= 0) {
      return {
        allowed: false,
        remaining: 0,
        reset: Math.ceil(bucketExpires / 1000),
      };
    }

    // Decrement tokens
    const newTokens = bucket.tokens - 1;
    await admin
      .from("rate_limit_buckets")
      .update({
        tokens: newTokens,
        last_refill: nowIso,
      })
      .eq("bucket_key", bucketKey);

    return {
      allowed: true,
      remaining: newTokens,
      reset: Math.ceil(bucketExpires / 1000),
    };
  } catch (err) {
    // Graceful fallback to in-memory map if database is not reachable or during isolated unit tests
    const local = localFallbackStore.get(bucketKey);
    if (!local || now > local.resetAt) {
      localFallbackStore.set(bucketKey, {
        tokens: limit - 1,
        resetAt: now + windowSeconds * 1000,
      });
      return {
        allowed: true,
        remaining: limit - 1,
        reset: resetTimestampSec,
      };
    }

    if (local.tokens <= 0) {
      return {
        allowed: false,
        remaining: 0,
        reset: Math.ceil(local.resetAt / 1000),
      };
    }

    local.tokens -= 1;
    return {
      allowed: true,
      remaining: local.tokens,
      reset: Math.ceil(local.resetAt / 1000),
    };
  }
}

/**
 * Checks per-phone rate limit for OTP sends (default 3 per minute)
 */
export async function checkPhoneSendRateLimit(phoneE164: string): Promise<RateLimitResult> {
  const limit = env.RATE_LIMIT_OTP_SEND_PER_PHONE;
  return checkDistributedRateLimit(`send:phone:${phoneE164}`, limit, 60);
}

/**
 * Checks per-IP rate limit for OTP sends (default 10 per minute)
 */
export async function checkIpSendRateLimit(clientIp: string): Promise<RateLimitResult> {
  const limit = env.RATE_LIMIT_OTP_SEND_PER_IP;
  return checkDistributedRateLimit(`send:ip:${clientIp || "unknown"}`, limit, 60);
}

/**
 * Checks per-IP or per-email rate limit for auth login/signup throttling
 */
export async function checkAuthRateLimit(key: string, limit = 5, windowSeconds = 60): Promise<RateLimitResult> {
  return checkDistributedRateLimit(`auth:${key}`, limit, windowSeconds);
}
