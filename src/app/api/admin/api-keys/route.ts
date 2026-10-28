import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data: keys, error } = await admin
    .from("api_keys")
    .select(`
      id,
      project_id,
      user_id,
      name,
      key_prefix,
      key_hint,
      environment,
      scopes,
      last_used_at,
      revoked_at,
      created_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }

  const userIds = Array.from(new Set(keys.map((k) => k.user_id)));
  const projectIds = Array.from(new Set(keys.map((k) => k.project_id)));

  const { data: profiles } = await admin.from("profiles").select("id, email").in("id", userIds);
  const { data: projects } = await admin.from("projects").select("id, name").in("id", projectIds);

  const enriched = (keys || []).map((k) => {
    const owner = profiles?.find((p) => p.id === k.user_id);
    const proj = projects?.find((p) => p.id === k.project_id);

    return {
      ...k,
      owner_email: owner?.email || "Unknown",
      project_name: proj?.name || "Unknown",
      status: k.revoked_at ? "revoked" : "active",
    };
  });

  return NextResponse.json({ keys: enriched });
}
