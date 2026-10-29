import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtpCode, hashOtpCode, maskPhoneNumber } from "@/lib/crypto/otp";
import { decryptSecret } from "@/lib/crypto/aes";
import { sendAuthenticationTemplate } from "@/lib/whatsapp/meta-provider";
import { checkPhoneSendRateLimit } from "@/lib/rate-limit/rate-limiter";
import { ensureUserProfile } from "@/lib/user-profile";

const testSendSchema = z.object({
  integrationId: z.string().uuid().optional().nullable(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be valid E.164 phone number (e.g. +14155552671)"),
  templateName: z.string().min(1, "Template name is required").default("otp_authentication"),
  templateLanguage: z.string().min(2, "Language code is required").default("en_US"),
  isLiveSend: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureUserProfile(user);
  } catch (err) {
    console.error("Profile synchronization in test-message:", err);
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

  // Fetch all projects owned by the user to verify tenant boundaries
  const { data: userProjects } = await admin
    .from("projects")
    .select("id, name, is_default")
    .eq("user_id", user.id);

  const userProjectIds = new Set((userProjects || []).map((p) => p.id));

  // =========================================================================
  // MODE 1: SANDBOX SIMULATOR (No real Meta Cloud API dispatch)
  // =========================================================================
  if (!isLiveSend) {
    let targetProjectId: string | null = null;
    let targetIntegrationId: string | null = null;

    if (integrationId && integrationId !== "00000000-0000-0000-0000-000000000000") {
      const { data: matchedIntegration } = await admin
        .from("integrations")
        .select("id, project_id, user_id")
        .eq("id", integrationId)
        .maybeSingle();

      if (
        matchedIntegration &&
        (matchedIntegration.user_id === user.id || userProjectIds.has(matchedIntegration.project_id))
      ) {
        targetProjectId = matchedIntegration.project_id;
        targetIntegrationId = matchedIntegration.id;
      }
    }

    // If no integration or placeholder was provided, associate with default user project
    if (!targetProjectId) {
      const defaultProj =
        userProjects?.find((p) => p.is_default) || (userProjects && userProjects.length > 0 ? userProjects[0] : null);
      if (defaultProj) {
        targetProjectId = defaultProj.id;
      } else {
        // Fallback: create default project if missing
        const { data: newProj } = await admin
          .from("projects")
          .insert({
            user_id: user.id,
            name: "Default Project",
            slug: "default-" + Math.random().toString(36).substring(2, 8),
            is_default: true,
          })
          .select("id")
          .single();
        targetProjectId = newProj?.id || null;
      }
    }

    if (!targetProjectId) {
      return NextResponse.json(
        { error: "No active project workspace found. Please create a project before testing." },
        { status: 400 }
      );
    }

    const testOtp = generateOtpCode();
    const codeHash = hashOtpCode(testOtp);
    const phoneMasked = maskPhoneNumber(phone);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data: challenge } = await admin
      .from("otp_challenges")
      .insert({
        project_id: targetProjectId,
        phone_e164: phone,
        phone_masked: phoneMasked,
        purpose: "test_message",
        code_hash: codeHash,
        status: "pending",
        expires_at: expiresAt,
        is_sandbox: true,
      })
      .select()
      .single();

    if (challenge) {
      await admin.from("send_attempts").insert({
        challenge_id: challenge.id,
        project_id: targetProjectId,
        integration_id: targetIntegrationId,
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
      message:
        "Sandbox test simulated successfully. No real WhatsApp message was dispatched and zero Meta charges were incurred.",
    });
  }

  // =========================================================================
  // MODE 2: LIVE WHATSAPP CLOUD API DISPATCH
  // =========================================================================
  // 1. Live send requires a non-empty, non-placeholder integration ID
  if (!integrationId || integrationId === "00000000-0000-0000-0000-000000000000") {
    return NextResponse.json(
      { error: "Please select a connected WhatsApp integration before dispatching live messages." },
      { status: 400 }
    );
  }

  // 2. Query integration and enforce tenant isolation
  const { data: integration, error: intError } = await admin
    .from("integrations")
    .select("*")
    .eq("id", integrationId)
    .maybeSingle();

  if (intError || !integration) {
    return NextResponse.json({ error: "Integration not found or access denied." }, { status: 404 });
  }

  const isAuthorized = integration.user_id === user.id || userProjectIds.has(integration.project_id);
  if (!isAuthorized) {
    return NextResponse.json({ error: "Integration not found or access denied." }, { status: 404 });
  }

  // 3. Status checks: disabled or sandbox mode cannot perform live dispatch
  if (integration.status === "disabled") {
    return NextResponse.json(
      {
        error:
          "The selected integration is currently disabled. Please enable it in the Integrations tab before dispatching live messages.",
      },
      { status: 400 }
    );
  }

  if (integration.is_sandbox) {
    return NextResponse.json(
      {
        error:
          "The selected integration is marked as a Sandbox integration. Please select a live WhatsApp integration or switch to Sandbox Simulator.",
      },
      { status: 400 }
    );
  }

  // 4. Validate credentials presence
  if (!integration.phone_number_id || integration.phone_number_id.trim() === "") {
    return NextResponse.json(
      {
        error:
          "The selected integration is missing a Meta Phone Number ID. Please check your credentials in the Integrations tab.",
      },
      { status: 400 }
    );
  }

  if (!integration.encrypted_access_token) {
    return NextResponse.json(
      { error: "The selected integration has no stored credentials. Please update it in the Integrations tab." },
      { status: 400 }
    );
  }

  // 5. Securely decrypt access token (never confuse with webhook_verify_token)
  let accessToken: string;
  try {
    accessToken = decryptSecret(integration.encrypted_access_token);
    if (!accessToken || accessToken.trim() === "") {
      throw new Error("Decrypted token is empty.");
    }
  } catch (decryptErr: any) {
    return NextResponse.json(
      {
        error:
          "Failed to decrypt integration credentials. The server encryption key may have changed or stored credentials are malformed.",
      },
      { status: 500 }
    );
  }

  // 6. Create OTP challenge record
  const testOtp = generateOtpCode();
  const codeHash = hashOtpCode(testOtp);
  const phoneMasked = maskPhoneNumber(phone);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

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
      is_sandbox: false,
    })
    .select()
    .single();

  // 7. Dispatch via Meta WhatsApp Cloud API
  try {
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
      // Update integration last_tested_at and status if pending
      await admin
        .from("integrations")
        .update({
          status: integration.status === "disabled" ? "disabled" : "verified",
          last_tested_at: new Date().toISOString(),
        })
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
      // Categorize provider failure clearly for actionable debugging
      let failureCategory = "Provider Rejection";
      const rawMsg = metaRes.error?.message || "Delivery rejected by Meta";
      const code = metaRes.error?.code;

      if (code === 190 || rawMsg.includes("OAuthException") || rawMsg.includes("expired")) {
        failureCategory = "Invalid or Expired Meta System User Access Token";
      } else if (
        code === 131030 ||
        rawMsg.includes("recipient") ||
        rawMsg.includes("not in allowed list")
      ) {
        failureCategory = "Recipient Phone Number Not Allowed in Meta Development Mode";
      } else if (code === 132001 || rawMsg.includes("template")) {
        failureCategory = "Authentication Template Not Found or Not Approved";
      } else if (code === 131000 || rawMsg.includes("permission")) {
        failureCategory = "Missing whatsapp_business_messaging Permission";
      }

      return NextResponse.json(
        {
          success: false,
          mode: "live_meta_api",
          status: "failed",
          category: failureCategory,
          error: `${failureCategory}: ${rawMsg}`,
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
