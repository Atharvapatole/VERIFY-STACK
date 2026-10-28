import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtpCode, hashOtpCode, maskPhoneNumber } from "@/lib/crypto/otp";
import { decryptSecret } from "@/lib/crypto/aes";
import { sendAuthenticationTemplate } from "@/lib/whatsapp/meta-provider";
import { checkPhoneSendRateLimit, checkIpSendRateLimit } from "@/lib/rate-limit/rate-limiter";

const sendSchema = z.object({
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Phone number must be in valid E.164 format (e.g. +14155552671)"),
  purpose: z
    .enum(["login", "signup", "password_reset", "transaction_verification", "account_update"])
    .default("login"),
});

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

  // Authenticate API Key
  const auth = await authenticateApiKey(request, "otp:send");
  if (!auth.success) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.error } },
      { status: auth.status }
    );
  }

  const { project, apiKey, environment, integration } = auth.context;
  const admin = createAdminClient();

  // Check Idempotency Key
  if (idempotencyKey) {
    const { data: existingIdempotency } = await admin
      .from("idempotency_keys")
      .select("response_status, response_body")
      .eq("project_id", project.id)
      .eq("key", idempotencyKey)
      .maybeSingle();

    if (existingIdempotency) {
      return NextResponse.json(existingIdempotency.response_body, {
        status: existingIdempotency.response_status,
      });
    }
  }

  // Parse Body
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "BAD_REQUEST", message: "Malformed JSON payload." } },
      { status: 400 }
    );
  }

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors[0]?.message || "Invalid request payload.",
          details: parsed.error.errors,
        },
      },
      { status: 422 }
    );
  }

  const { phone, purpose } = parsed.data;

  // Rate Limiting: IP Level & Phone Level
  const ipCheck = await checkIpSendRateLimit(clientIp);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many send requests from this IP address. Please slow down.",
          reset: ipCheck.reset,
        },
      },
      { status: 429 }
    );
  }

  const phoneCheck = await checkPhoneSendRateLimit(phone);
  if (!phoneCheck.allowed) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMITED",
          message: "Too many send requests for this destination phone number. Please wait before retrying.",
          reset: phoneCheck.reset,
        },
      },
      { status: 429 }
    );
  }

  // Generate secure OTP
  const rawOtp = generateOtpCode();
  const codeHash = hashOtpCode(rawOtp);
  const phoneMasked = maskPhoneNumber(phone);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry
  const isSandbox = environment === "test";

  // Create OTP Challenge Record in DB
  const { data: challenge, error: challengeError } = await admin
    .from("otp_challenges")
    .insert({
      project_id: project.id,
      api_key_id: apiKey.id,
      phone_e164: phone,
      phone_masked: phoneMasked,
      purpose,
      code_hash: codeHash,
      status: "pending",
      attempts: 0,
      max_attempts: 5,
      expires_at: expiresAt,
      is_sandbox: isSandbox,
    })
    .select()
    .single();

  if (challengeError || !challenge) {
    return NextResponse.json(
      { error: { code: "DATABASE_ERROR", message: "Failed to initialize OTP challenge." } },
      { status: 500 }
    );
  }

  let sendStatus: "simulated" | "accepted" | "failed" = "simulated";
  let providerMessageId: string | null = null;
  let providerError: any = null;

  // Delivery Execution
  if (isSandbox) {
    // Sandbox / Test Key Mode: Never send via live Meta WhatsApp
    sendStatus = "simulated";
    await admin.from("send_attempts").insert({
      challenge_id: challenge.id,
      project_id: project.id,
      integration_id: null,
      status: "simulated",
      provider_message_id: `mock_${challenge.id}`,
    });
  } else {
    // Live Mode: Requires verified integration
    if (!integration) {
      return NextResponse.json(
        {
          error: {
            code: "INTEGRATION_REQUIRED",
            message: "No active, verified WhatsApp Cloud API integration found for this project. Please configure credentials in your dashboard.",
          },
        },
        { status: 400 }
      );
    }

    try {
      const decryptedToken = decryptSecret(integration.encrypted_access_token);
      const metaRes = await sendAuthenticationTemplate({
        phoneNumberId: integration.phone_number_id,
        accessToken: decryptedToken,
        recipientPhone: phone,
        templateName: integration.template_name || "otp_authentication",
        templateLanguage: integration.template_language || "en_US",
        otpCode: rawOtp,
      });

      if (metaRes.success && metaRes.messageId) {
        sendStatus = "accepted";
        providerMessageId = metaRes.messageId;
      } else {
        sendStatus = "failed";
        providerError = metaRes.error;
      }

      await admin.from("send_attempts").insert({
        challenge_id: challenge.id,
        project_id: project.id,
        integration_id: integration.id,
        status: sendStatus,
        provider_message_id: providerMessageId,
        error_code: providerError?.code?.toString() || null,
        error_message: providerError?.message || null,
      });
    } catch (err: any) {
      sendStatus = "failed";
      providerError = { code: "DECRYPTION_ERROR", message: "Failed to access integration secrets." };
    }
  }

  // Record usage event
  await admin.from("usage_events").insert({
    project_id: project.id,
    user_id: project.user_id,
    action: "send",
    is_sandbox: isSandbox,
    status: sendStatus,
  });

  if (sendStatus === "failed") {
    return NextResponse.json(
      {
        error: {
          code: "PROVIDER_DELIVERY_FAILED",
          message: "Meta WhatsApp Cloud API rejected the message request.",
          details: providerError?.message || "Delivery failed",
        },
      },
      { status: 502 }
    );
  }

  const responsePayload: any = {
    challenge_id: challenge.id,
    status: sendStatus,
    phone_masked: phoneMasked,
    expires_at: expiresAt,
    is_sandbox: isSandbox,
  };

  if (isSandbox) {
    responsePayload.sandbox_notice = "Simulated sandbox delivery: no Meta WhatsApp charge incurred.";
    // For local developer DX in test mode only, we surface the test mock code
    responsePayload._test_code_for_sandbox_only = rawOtp;
  }

  // Save Idempotency record if key was provided
  if (idempotencyKey) {
    await admin.from("idempotency_keys").insert({
      key: idempotencyKey,
      project_id: project.id,
      response_status: 200,
      response_body: responsePayload,
    });
  }

  return NextResponse.json(responsePayload, { status: 200 });
}
