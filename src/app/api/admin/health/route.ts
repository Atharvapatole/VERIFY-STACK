import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const startTime = Date.now();

  const healthReport: {
    overall: "healthy" | "degraded" | "unavailable";
    timestamp: string;
    services: Record<string, { status: "healthy" | "degraded" | "unavailable"; latency_ms?: number; message?: string }>;
    environment: {
      supabase_configured: boolean;
      service_role_configured: boolean;
      encryption_key_configured: boolean;
      api_key_secret_configured: boolean;
      otp_hmac_secret_configured: boolean;
      graph_api_version: string;
    };
  } = {
    overall: "healthy",
    timestamp: new Date().toISOString(),
    services: {},
    environment: {
      supabase_configured: !env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder"),
      service_role_configured: !env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder"),
      encryption_key_configured: env.INTEGRATION_ENCRYPTION_KEY.length >= 32,
      api_key_secret_configured: env.API_KEY_HASH_SECRET.length >= 32,
      otp_hmac_secret_configured: env.OTP_HMAC_SECRET.length >= 32,
      graph_api_version: env.META_GRAPH_API_VERSION,
    },
  };

  // 1. Check Database Connectivity
  const dbStart = Date.now();
  try {
    const { error: dbErr } = await admin.from("platform_settings").select("key").limit(1);
    const dbLatency = Date.now() - dbStart;
    if (dbErr && !dbErr.message.includes("does not exist")) {
      healthReport.services.database = {
        status: "degraded",
        latency_ms: dbLatency,
        message: "Database returned query warning",
      };
      healthReport.overall = "degraded";
    } else {
      healthReport.services.database = {
        status: "healthy",
        latency_ms: dbLatency,
        message: "PostgreSQL connected and responsive",
      };
    }
  } catch (err: any) {
    healthReport.services.database = {
      status: "unavailable",
      message: "Database unreachable",
    };
    healthReport.overall = "unavailable";
  }

  // 2. Check Meta Graph API connectivity (safe unauthenticated ping to meta status/version)
  try {
    const metaController = new AbortController();
    const metaTimeout = setTimeout(() => metaController.abort(), 4000);
    const metaRes = await fetch(`https://graph.facebook.com/${env.META_GRAPH_API_VERSION}`, {
      method: "GET",
      signal: metaController.signal,
    });
    clearTimeout(metaTimeout);

    // Meta responds with 400/OAuthException when no token is passed, which proves connectivity and active version!
    healthReport.services.meta_graph_api = {
      status: "healthy",
      message: `Meta Graph API reachable (${env.META_GRAPH_API_VERSION})`,
    };
  } catch (e) {
    healthReport.services.meta_graph_api = {
      status: "degraded",
      message: "Network request to Meta Graph API timed out or failed",
    };
  }

  // 3. Webhook Pipeline Health
  const { data: errorIntegrations } = await admin
    .from("integrations")
    .select("id")
    .not("last_webhook_error", "is", null);

  healthReport.services.webhook_pipeline = {
    status: (errorIntegrations?.length || 0) > 0 ? "degraded" : "healthy",
    message: `${errorIntegrations?.length || 0} integrations reporting webhook errors`,
  };

  return NextResponse.json(healthReport);
}
