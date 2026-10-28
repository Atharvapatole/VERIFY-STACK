import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession, recordAdminAuditLog } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { data: settings, error } = await admin.from("platform_settings").select("*");

  if (error) {
    return NextResponse.json({ error: "Failed to fetch platform settings" }, { status: 500 });
  }

  const settingsMap: Record<string, any> = {};
  for (const s of settings || []) {
    settingsMap[s.key] = s.value;
  }

  return NextResponse.json({
    settings: settingsMap,
    raw: settings || [],
  });
}

export async function POST(request: NextRequest) {
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

  const { key, value, description } = body;
  if (!key || typeof value !== "object") {
    return NextResponse.json({ error: "key and value (JSON object) are required." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: updated, error } = await admin
    .from("platform_settings")
    .upsert({
      key,
      value,
      description: description || null,
      updated_at: new Date().toISOString(),
      updated_by: auth.user.id,
    })
    .select()
    .single();

  if (error || !updated) {
    return NextResponse.json({ error: "Failed to save setting." }, { status: 500 });
  }

  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  await recordAdminAuditLog({
    adminId: auth.user.id,
    adminEmail: auth.user.email,
    action: "platform_settings.updated",
    targetType: "setting",
    targetId: key,
    metadata: { new_value: value },
    ipAddress: clientIp,
  });

  return NextResponse.json({
    success: true,
    setting: updated,
  });
}
