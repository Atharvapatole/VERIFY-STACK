import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "node:crypto";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: integration, error } = await admin
    .from("integrations")
    .select("id, user_id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !integration) {
    return NextResponse.json({ error: "Integration not found or access denied." }, { status: 404 });
  }

  // Generate a cryptographically secure 32-byte hex token with whsec_ prefix
  const newVerifyToken = "whsec_" + crypto.randomBytes(24).toString("hex");

  const { error: updateError } = await admin
    .from("integrations")
    .update({
      webhook_verify_token: newVerifyToken,
      status: "pending",
      last_webhook_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to rotate webhook verification token." }, { status: 500 });
  }

  // Audit log the rotation
  await admin.from("audit_events").insert({
    user_id: user.id,
    action: "integration.webhook_token_rotated",
    resource_type: "integration",
    resource_id: id,
    metadata: { integration_name: integration.name },
  });

  return NextResponse.json({
    success: true,
    token: newVerifyToken,
    message: "Webhook verification token rotated. Update this in your Meta App Dashboard immediately.",
  });
}
