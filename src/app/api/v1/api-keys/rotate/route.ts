import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/crypto/api-key";

const rotateSchema = z.object({
  key_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const auth = await authenticateApiKey(request, "otp:send");
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.error } },
      { status: auth.status }
    );
  }

  const { project } = auth.context;
  const admin = createAdminClient();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = rotateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message } }, { status: 422 });
  }

  const { key_id } = parsed.data;

  // Find target key
  const { data: oldKey, error: findError } = await admin
    .from("api_keys")
    .select("*")
    .eq("id", key_id)
    .eq("project_id", project.id)
    .maybeSingle();

  if (findError || !oldKey) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "API Key not found in this project." } }, { status: 404 });
  }

  // Revoke old key
  await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", oldKey.id);

  // Generate replacement key in the same environment
  const newKey = generateApiKey(oldKey.environment);

  const { data: newRecord, error: insertError } = await admin
    .from("api_keys")
    .insert({
      project_id: project.id,
      user_id: project.user_id,
      name: `${oldKey.name} (Rotated)`,
      key_prefix: newKey.keyPrefix,
      key_hint: newKey.keyHint,
      key_hash: newKey.keyHash,
      environment: oldKey.environment,
      scopes: oldKey.scopes,
    })
    .select("id, name, key_hint, environment, scopes, created_at")
    .single();

  if (insertError || !newRecord) {
    return NextResponse.json({ error: { code: "DATABASE_ERROR", message: "Failed to generate rotated key." } }, { status: 500 });
  }

  // Audit log
  await admin.from("audit_events").insert({
    user_id: project.user_id,
    action: "api_key.rotated",
    resource_type: "api_key",
    resource_id: newRecord.id,
    metadata: { old_key_id: oldKey.id, new_key_id: newRecord.id },
  });

  return NextResponse.json({
    ...newRecord,
    secret_api_key: newKey.plaintextKey,
    notice: "Old key has been revoked. Copy the new key now. It cannot be recovered later.",
  });
}
