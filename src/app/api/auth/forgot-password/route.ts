import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkAuthRateLimit } from "@/lib/rate-limit/rate-limiter";
import { env } from "@/lib/env";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = forgotSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const { email } = parsed.data;

  // Rate limit password reset requests
  const rateLimit = await checkAuthRateLimit(`reset:${email.toLowerCase()}:${clientIp}`, 3, 300);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many password reset requests. Please wait a few minutes." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const redirectUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/reset-password`;

  // Always return success even if email does not exist to avoid email enumeration
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  return NextResponse.json({
    success: true,
    message: "If an account exists with this email, a password reset link has been dispatched.",
  });
}
