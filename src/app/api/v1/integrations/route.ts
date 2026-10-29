import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const hasApiKey =
    request.headers.get("x-api-key") ||
    (request.headers.get("authorization") && request.headers.get("authorization")?.startsWith("Bearer vs_"));

  if (hasApiKey) {
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

  // Fallback to active browser session (e.g. from dashboard components)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing API key or active session authorization." } },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const { data: userProjects } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", user.id);

  const projectIds = (userProjects || []).map((p) => p.id);

  let query = admin.from("integrations").select(`
    id,
    project_id,
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
  `);

  if (projectIds.length > 0) {
    query = query.or(`user_id.eq.${user.id},project_id.in.(${projectIds.join(",")})`);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data: integrations, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: "Failed to fetch integrations." } },
      { status: 500 }
    );
  }

  return NextResponse.json({
    integrations: integrations || [],
  });
}
