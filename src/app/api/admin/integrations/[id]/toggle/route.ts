import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession, recordAdminAuditLog } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data: integration, error: findError } = await admin
    .from("integrations")
    .select("id, name, status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (findError || !integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  const newStatus = integration.status === "disabled" ? "verified" : "disabled";

  const { data: updated, error: updateError } = await admin
    .from("integrations")
    .update({ status: newStatus })
    .eq("id", integration.id)
    .select("id, name, status")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Failed to update integration status." }, { status: 500 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  await recordAdminAuditLog({
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    action: newStatus === "disabled" ? "integration.disabled" : "integration.enabled",
    targetType: "integration",
    targetId: integration.id,
    metadata: { integration_name: integration.name, previous_status: integration.status, new_status: newStatus },
    ipAddress: clientIp,
  });

  return NextResponse.json({
    success: true,
    message: `Integration has been ${newStatus}.`,
    integration: updated,
  });
}
