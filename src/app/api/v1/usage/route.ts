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

  // Aggregate usage for the project
  const { data: usage, error } = await admin
    .from("usage_events")
    .select("action, is_sandbox, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: "Failed to retrieve usage stats." } },
      { status: 500 }
    );
  }

  const totalSends = usage.filter((u) => u.action === "send").length;
  const totalVerifications = usage.filter((u) => u.action === "verify").length;
  const sandboxSends = usage.filter((u) => u.action === "send" && u.is_sandbox).length;
  const liveSends = usage.filter((u) => u.action === "send" && !u.is_sandbox).length;

  return NextResponse.json({
    project_id: project.id,
    project_name: project.name,
    summary: {
      total_sends: totalSends,
      total_verifications: totalVerifications,
      live_sends: liveSends,
      sandbox_sends: sandboxSends,
    },
    recent_events: usage.slice(0, 50),
  });
}
