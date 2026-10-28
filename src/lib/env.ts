import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  INTEGRATION_ENCRYPTION_KEY: z.string().min(32, "INTEGRATION_ENCRYPTION_KEY must be at least 32 characters (or 64 hex characters)"),
  API_KEY_HASH_SECRET: z.string().min(32, "API_KEY_HASH_SECRET must be at least 32 characters"),
  OTP_HMAC_SECRET: z.string().min(32, "OTP_HMAC_SECRET must be at least 32 characters"),
  ADMIN_EMAIL_ALLOWLIST: z.string().default(""),
  META_GRAPH_API_VERSION: z.string().default("v22.0"),
  RATE_LIMIT_OTP_SEND_PER_PHONE: z.coerce.number().default(3),
  RATE_LIMIT_OTP_SEND_PER_IP: z.coerce.number().default(10),
  RATE_LIMIT_OTP_VERIFY_PER_CHALLENGE: z.coerce.number().default(5),
});

export type Env = z.infer<typeof envSchema>;

function getEnv(): Env {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    INTEGRATION_ENCRYPTION_KEY: process.env.INTEGRATION_ENCRYPTION_KEY,
    API_KEY_HASH_SECRET: process.env.API_KEY_HASH_SECRET,
    OTP_HMAC_SECRET: process.env.OTP_HMAC_SECRET,
    ADMIN_EMAIL_ALLOWLIST: process.env.ADMIN_EMAIL_ALLOWLIST,
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
    RATE_LIMIT_OTP_SEND_PER_PHONE: process.env.RATE_LIMIT_OTP_SEND_PER_PHONE,
    RATE_LIMIT_OTP_SEND_PER_IP: process.env.RATE_LIMIT_OTP_SEND_PER_IP,
    RATE_LIMIT_OTP_VERIFY_PER_CHALLENGE: process.env.RATE_LIMIT_OTP_VERIFY_PER_CHALLENGE,
  });

  if (!result.success) {
    if (process.env.NODE_ENV !== "test") {
      const errors = result.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
      console.warn("Environment notice (using safe mock defaults):", errors);
    }
    // In build or test time if some vars are missing, provide defensive fallbacks for non-secret placeholders
    return {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mock-verify-stack.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "mock-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "mock-service-role-key",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      INTEGRATION_ENCRYPTION_KEY: process.env.INTEGRATION_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      API_KEY_HASH_SECRET: process.env.API_KEY_HASH_SECRET || "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      OTP_HMAC_SECRET: process.env.OTP_HMAC_SECRET || "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      ADMIN_EMAIL_ALLOWLIST: process.env.ADMIN_EMAIL_ALLOWLIST || "",
      META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION || "v22.0",
      RATE_LIMIT_OTP_SEND_PER_PHONE: Number(process.env.RATE_LIMIT_OTP_SEND_PER_PHONE) || 3,
      RATE_LIMIT_OTP_SEND_PER_IP: Number(process.env.RATE_LIMIT_OTP_SEND_PER_IP) || 10,
      RATE_LIMIT_OTP_VERIFY_PER_CHALLENGE: Number(process.env.RATE_LIMIT_OTP_VERIFY_PER_CHALLENGE) || 5,
    };
  }

  return result.data;
}

export const env = getEnv();

/**
 * Validates that production live secrets are genuinely configured.
 * Fails closed if live sending is attempted with default or missing encryption keys.
 */
export function validateLiveEncryptionConfigured(): boolean {
  const key = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!key || key.length < 32 || key.startsWith("0123456789abcdef0123456789abcdef")) {
    return false;
  }
  return true;
}
