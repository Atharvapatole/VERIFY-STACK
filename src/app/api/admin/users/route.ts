import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.toLowerCase().trim();
  const status = searchParams.get("status");

  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select(`
      id,
      full_name,
      email,
      role,
      status,
      admin_notes,
      monthly_otp_limit,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: users, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to fetch user profiles" }, { status: 500 });
  }

  // Filter by search string if provided
  let filtered = users || [];
  if (search) {
    filtered = filtered.filter(
      (u) => u.email.toLowerCase().includes(search) || u.full_name.toLowerCase().includes(search)
    );
  }

  // Fetch count aggregations for each user
  const userIds = filtered.map((u) => u.id);
  const { data: projects } = await admin.from("projects").select("id, user_id").in("user_id", userIds);
  const { data: integrations } = await admin.from("integrations").select("id, user_id").in("user_id", userIds);
  const { data: usageEvents } = await admin.from("usage_events").select("id, user_id").in("user_id", userIds);

  const enrichedUsers = filtered.map((u) => {
    const userProjects = projects?.filter((p) => p.user_id === u.id) || [];
    const userIntegrations = integrations?.filter((i) => i.user_id === u.id) || [];
    const userUsage = usageEvents?.filter((us) => us.user_id === u.id) || [];

    return {
      ...u,
      projects_count: userProjects.length,
      integrations_count: userIntegrations.length,
      total_requests: userUsage.length,
    };
  });

  return NextResponse.json({
    users: enrichedUsers,
  });
}
