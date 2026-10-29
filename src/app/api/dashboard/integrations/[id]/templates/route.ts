import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto/aes";
import { fetchWabaMessageTemplates } from "@/lib/whatsapp/meta-provider";

export async function GET(
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

  // Enforce tenant boundary: verify integration belongs directly to user or to an authorized project
  const { data: userProjects } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", user.id);

  const userProjectIds = new Set((userProjects || []).map((p) => p.id));

  const { data: integration, error } = await admin
    .from("integrations")
    .select("id, project_id, user_id, name, waba_id, phone_number_id, encrypted_access_token, status, is_sandbox")
    .eq("id", id)
    .maybeSingle();

  if (error || !integration) {
    return NextResponse.json({ error: "Integration not found or access denied." }, { status: 404 });
  }

  const isOwner = integration.user_id === user.id || userProjectIds.has(integration.project_id);
  if (!isOwner) {
    return NextResponse.json({ error: "Integration not found or access denied." }, { status: 404 });
  }

  if (integration.is_sandbox) {
    return NextResponse.json({
      success: true,
      integration_id: integration.id,
      waba_id: integration.waba_id,
      templates: [
        {
          name: "otp_authentication",
          status: "APPROVED",
          category: "AUTHENTICATION",
          language: "en_US",
          components: [
            { type: "BODY", text: "Your verification code is {{1}}." },
            { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
          ],
        },
      ],
    });
  }

  if (!integration.waba_id || integration.waba_id.trim() === "") {
    return NextResponse.json(
      { error: "This integration does not have a Meta WhatsApp Business Account (WABA) ID configured." },
      { status: 400 }
    );
  }

  if (!integration.encrypted_access_token) {
    return NextResponse.json(
      { error: "This integration does not have stored Meta access credentials." },
      { status: 400 }
    );
  }

  let decryptedToken = "";
  try {
    decryptedToken = decryptSecret(integration.encrypted_access_token);
    if (!decryptedToken || decryptedToken.trim() === "") {
      throw new Error("Decrypted token is empty.");
    }
  } catch {
    return NextResponse.json(
      {
        error:
          "Failed to decrypt Meta access credentials. The server encryption key may have changed or credentials are corrupted.",
      },
      { status: 500 }
    );
  }

  const result = await fetchWabaMessageTemplates(integration.waba_id, decryptedToken);

  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error?.message || "Failed to retrieve message templates from Meta Cloud API.",
        details: result.error?.details,
        code: result.error?.code,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    integration_id: integration.id,
    waba_id: integration.waba_id,
    templates: result.templates || [],
  });
}
