import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyOtpCode } from "@/lib/crypto/otp";

const verifySchema = z.object({
  challenge_id: z.string().uuid("challenge_id must be a valid UUID"),
  code: z.string().regex(/^\d{4,8}$/, "code must be 4 to 8 numeric digits"),
});

export async function POST(request: NextRequest) {
  // Authenticate API Key
  const auth = await authenticateApiKey(request, "otp:verify");
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.error } },
      { status: auth.status }
    );
  }

  const { project, environment } = auth.context;
  const admin = createAdminClient();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Malformed JSON payload." } },
      { status: 400 }
    );
  }

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid payload.",
        },
      },
      { status: 422 }
    );
  }

  const { challenge_id, code } = parsed.data;

  // Fetch challenge belonging strictly to this project
  const { data: challenge, error: challengeErr } = await admin
    .from("otp_challenges")
    .select("*")
    .eq("id", challenge_id)
    .eq("project_id", project.id)
    .maybeSingle();

  if (challengeErr || !challenge) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "OTP challenge not found or does not belong to this project." } },
      { status: 404 }
    );
  }

  // Check if sandbox isolation matches API key environment
  if (challenge.is_sandbox !== (environment === "test")) {
    return NextResponse.json(
      {
        error: {
          code: "ENVIRONMENT_MISMATCH",
          message: "Sandbox challenges cannot be verified with live keys and vice versa.",
        },
      },
      { status: 403 }
    );
  }

  // Check Expiration
  const isExpired = new Date() > new Date(challenge.expires_at);
  if (isExpired || challenge.status === "expired") {
    if (challenge.status !== "expired") {
      await admin.from("otp_challenges").update({ status: "expired" }).eq("id", challenge.id);
    }
    return NextResponse.json(
      {
        verified: false,
        status: "expired",
        error: { code: "CHALLENGE_EXPIRED", message: "This OTP challenge has expired. Please request a new code." },
      },
      { status: 410 }
    );
  }

  // Check Lockout (5 attempts)
  if (challenge.attempts >= challenge.max_attempts || challenge.status === "failed") {
    return NextResponse.json(
      {
        verified: false,
        status: "failed",
        error: {
          code: "MAX_ATTEMPTS_EXCEEDED",
          message: "Maximum verification attempts exceeded. Challenge is locked.",
        },
      },
      { status: 429 }
    );
  }

  // Check Replay (already verified)
  if (challenge.status === "verified") {
    return NextResponse.json(
      {
        verified: false,
        status: "already_verified",
        error: { code: "ALREADY_VERIFIED", message: "This OTP has already been verified and cannot be reused." },
      },
      { status: 409 }
    );
  }

  // Constant-time HMAC verification
  const isValid = verifyOtpCode(code, challenge.code_hash);

  if (!isValid) {
    const updatedAttempts = challenge.attempts + 1;
    const isNowLocked = updatedAttempts >= challenge.max_attempts;

    await admin
      .from("otp_challenges")
      .update({
        attempts: updatedAttempts,
        status: isNowLocked ? "failed" : "pending",
      })
      .eq("id", challenge.id);

    return NextResponse.json(
      {
        verified: false,
        status: isNowLocked ? "failed" : "pending",
        remaining_attempts: Math.max(0, challenge.max_attempts - updatedAttempts),
        error: {
          code: isNowLocked ? "MAX_ATTEMPTS_EXCEEDED" : "INVALID_CODE",
          message: isNowLocked ? "Maximum attempts exceeded. Challenge locked." : "Incorrect OTP code.",
        },
      },
      { status: 400 }
    );
  }

  // Valid Code! Atomically mark verified with conditional check to prevent race condition replay
  const { data: updatedChallenge, error: updateError } = await admin
    .from("otp_challenges")
    .update({
      status: "verified",
      verified_at: new Date().toISOString(),
      attempts: challenge.attempts + 1,
    })
    .eq("id", challenge.id)
    .eq("status", "pending") // Atomic conditional update
    .select()
    .maybeSingle();

  if (updateError || !updatedChallenge) {
    // Concurrent request already verified or updated this challenge
    return NextResponse.json(
      {
        verified: false,
        status: "already_verified",
        error: { code: "RACE_CONDITION_DETECTED", message: "Challenge state changed concurrently." },
      },
      { status: 409 }
    );
  }

  // Record usage event
  await admin.from("usage_events").insert({
    project_id: project.id,
    user_id: project.user_id,
    action: "verify",
    is_sandbox: challenge.is_sandbox,
    status: "verified",
  });

  return NextResponse.json(
    {
      verified: true,
      status: "verified",
      challenge_id: challenge.id,
    },
    { status: 200 }
  );
}
