import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await authenticateApiKey(request, "otp:send");
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.error } },
      { status: auth.status }
    );
  }

  const { project } = auth.context;
  const admin = createAdminClient();

  // Revoke key
  const { data: updated, error } = await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("project_id", project.id)
    .select("id, name, revoked_at")
    .maybeSingle();

  if (error || !updated) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "API key not found." } },
      { status: 404 }
    );
  }

  // Audit log
  await admin.from("audit_events").insert({
    user_id: project.user_id,
    action: "api_key.revoked",
    resource_type: "api_key",
    resource_id: updated.id,
  });

  return NextResponse.json({
    success: true,
    message: "API key has been revoked successfully.",
    key_id: updated.id,
  });
}
