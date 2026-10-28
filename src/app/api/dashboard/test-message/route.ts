import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtpCode, hashOtpCode, maskPhoneNumber } from "@/lib/crypto/otp";
import { decryptSecret } from "@/lib/crypto/aes";
import { sendAuthenticationTemplate } from "@/lib/whatsapp/meta-provider";
import { checkPhoneSendRateLimit } from "@/lib/rate-limit/rate-limiter";

const testSendSchema = z.object({
  integrationId: z.string().uuid(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be valid E.164 phone number"),
  templateName: z.string().default("otp_authentication"),
  templateLanguage: z.string().default("en_US"),
  isLiveSend: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = testSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  const { integrationId, phone, templateName, templateLanguage, isLiveSend } = parsed.data;

  // Rate limit test message sends to 3/min per destination phone
  const rateLimit = await checkPhoneSendRateLimit(phone);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded for this destination phone number. Please wait a minute." },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  const { data: integration, error: intError } = await admin
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (intError || !integration) {
    return NextResponse.json({ error: "Integration not found or access denied." }, { status: 404 });
  }

  const testOtp = generateOtpCode();
  const codeHash = hashOtpCode(testOtp);
  const phoneMasked = maskPhoneNumber(phone);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Create challenge record
  const { data: challenge } = await admin
    .from("otp_challenges")
    .insert({
      project_id: integration.project_id,
      phone_e164: phone,
      phone_masked: phoneMasked,
      purpose: "test_message",
      code_hash: codeHash,
      status: "pending",
      expires_at: expiresAt,
      is_sandbox: !isLiveSend,
    })
    .select()
    .single();

  if (!isLiveSend || integration.is_sandbox) {
    // Sandbox / Simulated send
    if (challenge) {
      await admin.from("send_attempts").insert({
        challenge_id: challenge.id,
        project_id: integration.project_id,
        integration_id: integration.id,
        status: "simulated",
        provider_message_id: `simulated_test_${Date.now()}`,
      });
    }

    return NextResponse.json({
      success: true,
      mode: "sandbox_simulated",
      status: "simulated",
      phone_masked: phoneMasked,
      test_code: testOtp,
      message: "Sandbox test simulated successfully. No real WhatsApp message was dispatched and no Meta charges were incurred.",
    });
  }

  // Live WhatsApp Meta Cloud API send
  try {
    const accessToken = decryptSecret(integration.encrypted_access_token);
    const metaRes = await sendAuthenticationTemplate({
      phoneNumberId: integration.phone_number_id,
      accessToken,
      recipientPhone: phone,
      templateName,
      templateLanguage,
      otpCode: testOtp,
    });

    if (challenge) {
      await admin.from("send_attempts").insert({
        challenge_id: challenge.id,
        project_id: integration.project_id,
        integration_id: integration.id,
        status: metaRes.success ? "accepted" : "failed",
        provider_message_id: metaRes.messageId || null,
        error_code: metaRes.error?.code?.toString() || null,
        error_message: metaRes.error?.message || null,
      });
    }

    if (metaRes.success) {
      // Update integration last_tested_at
      await admin
        .from("integrations")
        .update({ status: "verified", last_tested_at: new Date().toISOString() })
        .eq("id", integration.id);

      return NextResponse.json({
        success: true,
        mode: "live_meta_api",
        status: "accepted",
        provider_message_id: metaRes.messageId,
        phone_masked: phoneMasked,
        message: "Message accepted by Meta WhatsApp Cloud API. Check recipient device.",
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          mode: "live_meta_api",
          status: "failed",
          error: metaRes.error?.message || "Delivery rejected by Meta.",
          details: metaRes.error?.details,
        },
        { status: 502 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: "Failed to dispatch message: " + (err.message || "Unknown error") },
      { status: 500 }
    );
  }
}
