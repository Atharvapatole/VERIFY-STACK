import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminSession, recordAdminAuditLog } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const notesSchema = z.object({
  admin_notes: z.string().max(2000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = notesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("profiles")
    .update({ admin_notes: parsed.data.admin_notes })
    .eq("id", id)
    .select("id, email, admin_notes")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json({ error: "User not found or failed to update notes." }, { status: 404 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  await recordAdminAuditLog({
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    action: "user.notes_updated",
    targetType: "user",
    targetId: updated.id,
    metadata: { target_email: updated.email },
    ipAddress: clientIp,
  });

  return NextResponse.json({
    success: true,
    user: updated,
  });
}
