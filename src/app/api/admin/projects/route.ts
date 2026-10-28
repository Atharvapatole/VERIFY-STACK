import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data: projects, error } = await admin
    .from("projects")
    .select(`
      id,
      name,
      slug,
      is_default,
      created_at,
      user_id
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }

  // Enrich with user emails and counts
  const userIds = Array.from(new Set(projects.map((p) => p.user_id)));
  const { data: profiles } = await admin.from("profiles").select("id, email, full_name").in("id", userIds);
  const { data: integrations } = await admin.from("integrations").select("id, project_id");
  const { data: keys } = await admin.from("api_keys").select("id, project_id, revoked_at");
  const { data: challenges } = await admin.from("otp_challenges").select("id, project_id");

  const enriched = (projects || []).map((p) => {
    const owner = profiles?.find((prof) => prof.id === p.user_id);
    const projIntegrations = integrations?.filter((i) => i.project_id === p.id) || [];
    const projKeys = keys?.filter((k) => k.project_id === p.id && !k.revoked_at) || [];
    const projChallenges = challenges?.filter((c) => c.project_id === p.id) || [];

    return {
      ...p,
      owner_email: owner?.email || "Unknown",
      owner_name: owner?.full_name || "Unknown",
      integrations_count: projIntegrations.length,
      active_keys_count: projKeys.length,
      total_challenges_count: projChallenges.length,
    };
  });

  return NextResponse.json({ projects: enriched });
}
