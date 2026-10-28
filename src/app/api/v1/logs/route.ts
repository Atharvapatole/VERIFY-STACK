import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await authenticateApiKey(request, "otp:send");
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.error } },
      { status: auth.status }
    );
  }

  const { project } = auth.context;
  const admin = createAdminClient();

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") || 50)), 100);
  const status = searchParams.get("status");

  let query = admin
    .from("otp_challenges")
    .select(`
      id,
      phone_masked,
      purpose,
      status,
      attempts,
      max_attempts,
      is_sandbox,
      created_at,
      verified_at,
      expires_at
    `)
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: logs, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: "Failed to fetch logs." } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    project_id: project.id,
    logs: logs || [],
  });
}
