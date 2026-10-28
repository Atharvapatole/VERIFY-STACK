import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") || 50)), 100);
  const status = searchParams.get("status");

  const admin = createAdminClient();
  let query = admin
    .from("otp_challenges")
    .select(`
      id,
      project_id,
      phone_masked,
      purpose,
      status,
      attempts,
      max_attempts,
      is_sandbox,
      expires_at,
      verified_at,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: challenges, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to fetch OTP activity" }, { status: 500 });
  }

  // Get project names
  const projectIds = Array.from(new Set(challenges.map((c) => c.project_id)));
  const { data: projects } = await admin.from("projects").select("id, name").in("id", projectIds);

  const enriched = (challenges || []).map((c) => {
    const proj = projects?.find((p) => p.id === c.project_id);
    return {
      ...c,
      project_name: proj?.name || "Unknown",
    };
  });

  return NextResponse.json({ activity: enriched });
}
