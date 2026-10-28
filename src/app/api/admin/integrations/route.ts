import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  // Strictly select SAFE masked columns only (NEVER select encrypted_access_token or encrypted_app_secret)
  const { data: integrations, error } = await admin
    .from("integrations")
    .select(`
      id,
      project_id,
      user_id,
      name,
      phone_number_id,
      waba_id,
      template_name,
      template_language,
      webhook_verify_token,
      status,
      is_sandbox,
      last_tested_at,
      last_webhook_received_at,
      last_webhook_verified_at,
      last_webhook_error,
      webhook_events_received,
      webhook_events_processed,
      webhook_events_ignored,
      webhook_events_failed,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }

  // Enrich with owner email & project name
  const userIds = Array.from(new Set(integrations.map((i) => i.user_id)));
  const projectIds = Array.from(new Set(integrations.map((i) => i.project_id)));

  const { data: profiles } = await admin.from("profiles").select("id, email").in("id", userIds);
  const { data: projects } = await admin.from("projects").select("id, name").in("id", projectIds);

  const enriched = (integrations || []).map((item) => {
    const owner = profiles?.find((p) => p.id === item.user_id);
    const proj = projects?.find((p) => p.id === item.project_id);

    return {
      ...item,
      owner_email: owner?.email || "Unknown",
      project_name: proj?.name || "Unknown",
      // Safe masked phone number id hint
      phone_number_id_masked: item.phone_number_id.slice(0, 4) + "..." + item.phone_number_id.slice(-4),
      waba_id_masked: item.waba_id.slice(0, 4) + "..." + item.waba_id.slice(-4),
      webhook_token_hint: item.webhook_verify_token.slice(0, 6) + "...",
    };
  });

  return NextResponse.json({ integrations: enriched });
}
