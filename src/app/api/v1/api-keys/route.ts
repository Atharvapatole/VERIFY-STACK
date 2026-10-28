import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey } from "@/lib/crypto/api-key";

const createKeySchema = z.object({
  name: z.string().min(1).max(50).default("Default API Key"),
  environment: z.enum(["live", "test"]),
  scopes: z.array(z.string()).default(["otp:send", "otp:verify"]),
});

export async function POST(request: NextRequest) {
  // Requires an existing valid API key to call programmatic management,
  // or is called via authenticated session from dashboard
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

  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: parsed.error.errors[0]?.message } }, { status: 422 });
  }

  const { name, environment, scopes } = parsed.data;
  const newKey = generateApiKey(environment);

  const { data: createdRecord, error: insertError } = await admin
    .from("api_keys")
    .insert({
      project_id: project.id,
      user_id: project.user_id,
      name,
      key_prefix: newKey.keyPrefix,
      key_hint: newKey.keyHint,
      key_hash: newKey.keyHash,
      environment,
      scopes,
    })
    .select("id, name, key_hint, environment, scopes, created_at")
    .single();

  if (insertError || !createdRecord) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: "Failed to store API key." } },
      { status: 500 }
    );
  }

  // Audit log
  await admin.from("audit_events").insert({
    user_id: project.user_id,
    action: "api_key.created",
    resource_type: "api_key",
    resource_id: createdRecord.id,
    metadata: { environment, key_hint: newKey.keyHint },
  });

  // RETURN PLAINTEXT KEY ONLY ONCE
  return NextResponse.json(
    {
      ...createdRecord,
      secret_api_key: newKey.plaintextKey,
      notice: "Please copy this secret API key immediately. It cannot and will not be displayed again.",
    },
    { status: 201 }
  );
}
