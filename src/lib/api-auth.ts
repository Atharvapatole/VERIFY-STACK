import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, parseApiKeyPrefix, verifyApiKeyHash } from "@/lib/crypto/api-key";
import { Database } from "@/lib/supabase/types";

export interface AuthenticatedApiContext {
  project: Database["public"]["Tables"]["projects"]["Row"];
  apiKey: Database["public"]["Tables"]["api_keys"]["Row"];
  environment: "live" | "test";
  integration: Database["public"]["Tables"]["integrations"]["Row"] | null;
}

export type AuthResult =
  | { success: true; context: AuthenticatedApiContext }
  | { success: false; status: number; error: string; code: string };

/**
 * Authenticates an incoming API request via Bearer API Key.
 *
 * Enforces:
 * - Proper Authorization header syntax: Bearer vs_live_... or vs_test_...
 * - Prefix and high-entropy structure
 * - Key revocation check
 * - Cryptographic hash match
 * - Required scope check
 */
export async function authenticateApiKey(
  request: NextRequest,
  requiredScope: string = "otp:send"
): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      status: 401,
      code: "UNAUTHORIZED",
      error: "Missing or malformed Authorization header. Expected 'Bearer vs_...'",
    };
  }

  const rawKey = authHeader.slice(7).trim();
  const { valid, environment } = parseApiKeyPrefix(rawKey);

  if (!valid || !environment) {
    return {
      success: false,
      status: 401,
      code: "INVALID_KEY_FORMAT",
      error: "Invalid API key format. Must begin with 'vs_live_' or 'vs_test_'",
    };
  }

  const keyHash = hashApiKey(rawKey);
  const admin = createAdminClient();

  // Query key record by hash
  const { data: apiKeyRecord, error: keyError } = await admin
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (keyError || !apiKeyRecord) {
    return {
      success: false,
      status: 401,
      code: "INVALID_API_KEY",
      error: "Provided API key is invalid or has been revoked.",
    };
  }

  // Double check with constant-time comparison
  if (!verifyApiKeyHash(rawKey, apiKeyRecord.key_hash)) {
    return {
      success: false,
      status: 401,
      code: "INVALID_API_KEY",
      error: "Provided API key verification failed.",
    };
  }

  // Scope check
  if (!apiKeyRecord.scopes.includes(requiredScope)) {
    return {
      success: false,
      status: 403,
      code: "INSUFFICIENT_SCOPES",
      error: `API key lacks required scope: '${requiredScope}'`,
    };
  }

  // Fetch Project
  const { data: project, error: projError } = await admin
    .from("projects")
    .select("*")
    .eq("id", apiKeyRecord.project_id)
    .single();

  if (projError || !project) {
    return {
      success: false,
      status: 404,
      code: "PROJECT_NOT_FOUND",
      error: "Associated project could not be found.",
    };
  }

  // Fetch active WhatsApp integration if live
  let integration: Database["public"]["Tables"]["integrations"]["Row"] | null = null;
  if (environment === "live") {
    const { data: intData } = await admin
      .from("integrations")
      .select("*")
      .eq("project_id", project.id)
      .eq("status", "verified")
      .maybeSingle();

    integration = intData;
  }

  // Asynchronously record last_used_at without blocking request
  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyRecord.id);

  return {
    success: true,
    context: {
      project,
      apiKey: apiKeyRecord,
      environment,
      integration,
    },
  };
}
