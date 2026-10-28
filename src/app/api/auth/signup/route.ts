import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAuthRateLimit } from "@/lib/rate-limit/rate-limiter";

const signupSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

  // Throttling
  const rateLimit = await checkAuthRateLimit(`signup:${clientIp}`, 5, 60);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please wait a minute before retrying." },
      { status: 429 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const { fullName, email, password } = parsed.data;
  const admin = createAdminClient();

  // Create user in Supabase Auth via Admin Client with email_confirm: true
  // This explicitly bypasses email confirmation at signup so developers can start immediately
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authError) {
    // If user already registered, return clear sanitized error without leaking internal details
    if (authError.message.toLowerCase().includes("already registered")) {
      return NextResponse.json({ error: "An account with this email address already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message || "Failed to create account." }, { status: 400 });
  }

  const user = authData.user;
  if (!user) {
    return NextResponse.json({ error: "User creation failed." }, { status: 500 });
  }

  // Idempotently create profile record
  await admin.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      email,
      role: "user",
    },
    { onConflict: "id" }
  );

  // Idempotently create initial default project
  const { data: existingProject } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existingProject) {
    await admin.from("projects").insert({
      user_id: user.id,
      name: "Default Project",
      slug: "default",
      is_default: true,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Account created successfully. You can now sign in.",
    user: {
      id: user.id,
      email: user.email,
      fullName,
    },
  });
}
