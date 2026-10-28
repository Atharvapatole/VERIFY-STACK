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

  // Return masked integrations only (NEVER return encrypted_access_token or encrypted_app_secret!)
  const { data: integrations, error } = await admin
    .from("integrations")
    .select(`
      id,
      name,
      phone_number_id,
      waba_id,
      template_name,
      template_language,
      status,
      is_sandbox,
      last_tested_at,
      created_at,
      updated_at
    `)
    .eq("project_id", project.id);

  if (error) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: "Failed to fetch integrations." } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    project_id: project.id,
    integrations: integrations || [],
  });
}
