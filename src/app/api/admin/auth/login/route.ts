import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isAllowlistedAdminEmail, recordAdminAuditLog } from "@/lib/admin-auth";
import { checkAuthRateLimit } from "@/lib/rate-limit/rate-limiter";
import { createAdminClient } from "@/lib/supabase/admin";

const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const userAgent = request.headers.get("user-agent") || undefined;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
  }

  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const { email, password } = parsed.data;

  // Rate Limiting: 5 attempts per min for admin login attempts
  const rateLimit = await checkAuthRateLimit(`admin_login:${clientIp}:${email.toLowerCase()}`, 5, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many failed attempts. Please wait 60 seconds before trying again." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    await recordAdminAuditLog({
      adminEmail: email,
      action: "admin.login_failed",
      targetType: "system",
      metadata: { reason: "Invalid credentials" },
      ipAddress: clientIp,
      userAgent,
    });
    // Return generic error message to prevent account enumeration
    return NextResponse.json({ error: "Invalid admin credentials." }, { status: 401 });
  }

  const user = authData.user;
  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("id", user.id)
    .maybeSingle();

  const isAllowlisted = isAllowlistedAdminEmail(user.email);
  const hasAdminRole = profile?.role === "admin";

  if (!isAllowlisted && !hasAdminRole) {
    // Explicitly sign out non-admin session immediately
    await supabase.auth.signOut();

    await recordAdminAuditLog({
      adminId: user.id,
      adminEmail: user.email || email,
      action: "admin.unauthorized_attempt",
      targetType: "system",
      metadata: { reason: "Account is not in ADMIN_EMAIL_ALLOWLIST and lacks admin role" },
      ipAddress: clientIp,
      userAgent,
    });

    return NextResponse.json(
      { error: "Access denied. This account does not possess platform administrator privileges." },
      { status: 403 }
    );
  }

  if (profile?.status === "suspended") {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Account has been suspended. Please contact platform security." },
      { status: 403 }
    );
  }

  // Audit log successful admin sign-in
  await recordAdminAuditLog({
    adminId: user.id,
    adminEmail: user.email || email,
    action: "admin.login_success",
    targetType: "system",
    metadata: { role: profile?.role || "allowlisted_admin" },
    ipAddress: clientIp,
    userAgent,
  });

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      fullName: profile?.full_name || user.email?.split("@")[0],
    },
  });
}
