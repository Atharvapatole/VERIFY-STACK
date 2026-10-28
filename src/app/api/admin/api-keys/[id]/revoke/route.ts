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
  const { data: updated, error } = await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, name, key_hint, revoked_at")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: "API key not found." }, { status: 404 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  await recordAdminAuditLog({
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    action: "api_key.revoked",
    targetType: "api_key",
    targetId: updated.id,
    metadata: { key_hint: updated.key_hint, key_name: updated.name },
    ipAddress: clientIp,
  });

  return NextResponse.json({
    success: true,
    message: "API key has been revoked by platform administrator.",
    key: updated,
  });
}
