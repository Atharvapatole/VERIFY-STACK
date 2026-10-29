import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/crypto/aes";
import { ensureUserProfile } from "@/lib/user-profile";

const createIntegrationSchema = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  name: z.string().min(2).max(100),
  phoneNumberId: z.string().min(5).max(50),
  wabaId: z.string().min(5).max(50),
  accessToken: z.string().min(10),
  appSecret: z.string().min(10),
  templateName: z.string().default("otp_authentication"),
  templateLanguage: z.string().default("en_US"),
  webhookVerifyToken: z.string().min(16).optional(),
  isSandbox: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserProfile(user);
  } catch (err) {
    console.error("Profile synchronization error in integrations GET:", err);
  }

  const admin = createAdminClient();

  // 1. Fetch all projects owned by the user
  const { data: userProjects } = await admin
    .from("projects")
    .select("id, name")
    .eq("user_id", user.id);

  const projectIds = (userProjects || []).map((p) => p.id);

  // 2. Query integrations owned directly by user OR belonging to their authorized projects
  let query = admin
    .from("integrations")
    .select(`
      id,
      project_id,
      user_id,
      name,
      phone_number_id,
      waba_id,
      template_name,
      template_language,
      webhook_verify_token,
      status,
      is_sandbox,
      last_tested_at,
      last_webhook_received_at,
      last_webhook_verified_at,
      last_webhook_error,
      webhook_events_received,
      webhook_events_processed,
      webhook_events_ignored,
      webhook_events_failed,
      created_at,
      updated_at
    `);

  if (projectIds.length > 0) {
    query = query.or(`user_id.eq.${user.id},project_id.in.(${projectIds.join(",")})`);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data: integrations, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }

  const allProjects = userProjects || [];

  const sanitizedIntegrations = (integrations || []).map((item) => {
    const proj = allProjects.find((p) => p.id === item.project_id);
    return {
      ...item,
      project_name: proj?.name || "Project Workspace",
      // Never expose stored verification tokens in plaintext after initial creation
      webhook_verify_token: item.webhook_verify_token ? "whsec_••••••••••••••••••••••••" : null,
      has_webhook_verify_token: Boolean(item.webhook_verify_token),
    };
  });

  return NextResponse.json({
    integrations: sanitizedIntegrations,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserProfile(user);
  } catch (err) {
    console.error("Profile synchronization error in integrations GET:", err);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createIntegrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const {
    projectId,
    name,
    phoneNumberId,
    wabaId,
    accessToken,
    appSecret,
    templateName,
    templateLanguage,
    isSandbox,
  } = parsed.data;

  // Verify that the user owns the project
  const admin = createAdminClient();
  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (projErr || !project) {
    return NextResponse.json({ error: "Project not found or not owned by you." }, { status: 403 });
  }

  // Encrypt secrets at rest using authenticated AES-256-GCM
  let encryptedAccessToken: string;
  let encryptedAppSecret: string;
  try {
    encryptedAccessToken = encryptSecret(accessToken);
    encryptedAppSecret = encryptSecret(appSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server encryption is not properly configured. Cannot store live credentials securely." },
      { status: 500 }
    );
  }

  // Generate or accept pre-allocated strong random webhook verification token
  const finalVerifyToken = parsed.data.webhookVerifyToken || ("whsec_" + crypto.randomBytes(24).toString("hex"));

  const insertPayload: any = {
    project_id: projectId,
    user_id: user.id,
    name,
    phone_number_id: phoneNumberId,
    waba_id: wabaId,
    template_name: templateName,
    template_language: templateLanguage,
    webhook_verify_token: finalVerifyToken,
    encrypted_access_token: encryptedAccessToken,
    encrypted_app_secret: encryptedAppSecret,
    key_version: 1,
    status: isSandbox ? "verified" : "pending",
    is_sandbox: isSandbox,
  };

  if (parsed.data.id) {
    insertPayload.id = parsed.data.id;
  }

  const { data: integration, error: insertError } = await admin
    .from("integrations")
    .insert(insertPayload)
    .select("id, name, phone_number_id, waba_id, template_name, template_language, webhook_verify_token, status, is_sandbox, created_at")
    .single();

  if (insertError || !integration) {
    return NextResponse.json({ error: "Failed to save integration: " + (insertError?.message || "") }, { status: 500 });
  }

  // Audit log
  await admin.from("audit_events").insert({
    user_id: user.id,
    action: "integration.created",
    resource_type: "integration",
    resource_id: integration.id,
    metadata: { name, phone_number_id: phoneNumberId, is_sandbox: isSandbox },
  });

  return NextResponse.json({
    success: true,
    integration: {
      ...integration,
      webhook_verify_token: "whsec_••••••••••••••••••••••••",
      raw_webhook_verify_token: finalVerifyToken, // Exposed once upon creation
    },
    raw_webhook_verify_token: finalVerifyToken,
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserProfile(user);
  } catch (err) {
    console.error("Profile synchronization error in integrations GET:", err);
  }

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing integration ID" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: deleted, error } = await admin
    .from("integrations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name")
    .maybeSingle();

  if (error || !deleted) {
    return NextResponse.json({ error: "Integration not found or could not be deleted." }, { status: 404 });
  }

  await admin.from("audit_events").insert({
    user_id: user.id,
    action: "integration.deleted",
    resource_type: "integration",
    resource_id: deleted.id,
  });

  return NextResponse.json({ success: true, message: "Integration deleted." });
}
