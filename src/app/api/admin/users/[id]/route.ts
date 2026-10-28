import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession, recordAdminAuditLog } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const deleteSchema = z.object({
  confirm_phrase: z.string().min(1),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Parse confirm phrase
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request payload" }, { status: 400 });
  }

  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmation phrase is required." }, { status: 422 });
  }

  const admin = createAdminClient();

  // Find target user
  const { data: targetUser, error: findError } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", id)
    .maybeSingle();

  if (findError || !targetUser) {
    return NextResponse.json({ error: "User account not found." }, { status: 404 });
  }

  // Prevent self-deletion
  if (targetUser.id === auth.user.id) {
    return NextResponse.json({ error: "Cannot delete your own administrator account." }, { status: 400 });
  }

  // Strong Confirmation check: Typed phrase must match the exact email of the user
  if (parsed.data.confirm_phrase.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
    return NextResponse.json(
      { error: `Confirmation mismatch. You must type "${targetUser.email}" to confirm permanent deletion.` },
      { status: 400 }
    );
  }

  // Cascade delete dependent records
  // 1. Delete integrations
  await admin.from("integrations").delete().eq("user_id", targetUser.id);
  // 2. Delete API keys
  await admin.from("api_keys").delete().eq("user_id", targetUser.id);
  // 3. Delete projects
  await admin.from("projects").delete().eq("user_id", targetUser.id);
  // 4. Delete profile
  await admin.from("profiles").delete().eq("id", targetUser.id);
  // 5. Delete from Supabase Auth admin
  await admin.auth.admin.deleteUser(targetUser.id);

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  await recordAdminAuditLog({
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    action: "user.permanently_deleted",
    targetType: "user",
    targetId: targetUser.id,
    metadata: {
      deleted_email: targetUser.email,
      deleted_name: targetUser.full_name,
    },
    ipAddress: clientIp,
  });

  return NextResponse.json({
    success: true,
    message: `User ${targetUser.email} and all associated resources have been permanently deleted.`,
  });
}
