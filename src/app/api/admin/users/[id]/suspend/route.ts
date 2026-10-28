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
  const { data: user, error: findError } = await admin
    .from("profiles")
    .select("id, email, status")
    .eq("id", id)
    .maybeSingle();

  if (findError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent suspending self
  if (user.id === auth.user.id) {
    return NextResponse.json({ error: "Cannot suspend your own administrator account." }, { status: 400 });
  }

  const newStatus = user.status === "active" ? "suspended" : "active";

  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ status: newStatus })
    .eq("id", user.id)
    .select("id, email, status")
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Failed to update account status." }, { status: 500 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  await recordAdminAuditLog({
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    action: newStatus === "suspended" ? "user.suspended" : "user.unsuspended",
    targetType: "user",
    targetId: user.id,
    metadata: { target_email: user.email, previous_status: user.status, new_status: newStatus },
    ipAddress: clientIp,
  });

  return NextResponse.json({
    success: true,
    message: `User account has been ${newStatus}.`,
    user: updated,
  });
}
