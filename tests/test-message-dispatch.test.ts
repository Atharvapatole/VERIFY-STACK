import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import crypto from "node:crypto";
import { encryptSecret, decryptSecret } from "../src/lib/crypto/aes";
import { formatPhoneForMeta, buildAuthenticationPayload } from "../src/lib/whatsapp/meta-provider";

// Test Schema
const testSendSchema = z.object({
  integrationId: z.string().uuid().optional().nullable(),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Must be valid E.164 phone number (e.g. +14155552671)"),
  templateName: z.string().min(1, "Template name is required").default("otp_authentication"),
  templateLanguage: z.string().min(2, "Language code is required").default("en_US"),
  isLiveSend: z.boolean().default(false),
});

describe("Verify Stack Test Message Console & Live Dispatch Verification", () => {
  const userA = { id: "11111111-aaaa-4111-8111-111111111111", email: "alice@verifystack.dev" };
  const userB = { id: "22222222-bbbb-4222-8222-222222222222", email: "bob@verifystack.dev" };

  // In-memory data store for testing
  let projects: Map<string, any>;
  let integrations: Map<string, any>;
  let otpChallenges: Map<string, any>;
  let sendAttempts: any[];

  beforeEach(() => {
    projects = new Map();
    integrations = new Map();
    otpChallenges = new Map();
    sendAttempts = [];

    // Project for User A
    const projA = {
      id: "aaaa0000-0000-0000-0000-000000000001",
      user_id: userA.id,
      name: "Alice Main Project",
      is_default: true,
    };
    projects.set(projA.id, projA);

    // Live Integration for User A
    const validTokenA = "EAA_test_access_token_for_user_a";
    const intA = {
      id: "aaaa1111-1111-1111-1111-111111111111",
      project_id: projA.id,
      user_id: userA.id,
      name: "Alice Meta WhatsApp WABA",
      phone_number_id: "109876543210123",
      waba_id: "209876543210123",
      template_name: "otp_authentication",
      template_language: "en_US",
      encrypted_access_token: encryptSecret(validTokenA),
      encrypted_app_secret: encryptSecret("32_character_meta_app_secret_12345"),
      webhook_verify_token: "whsec_0123456789abcdef",
      status: "pending",
      is_sandbox: false,
    };
    integrations.set(intA.id, intA);

    // Sandbox Integration for User A
    const intASandbox = {
      id: "aaaa2222-2222-2222-2222-222222222222",
      project_id: projA.id,
      user_id: userA.id,
      name: "Alice Sandbox Integration",
      phone_number_id: "109876543210999",
      waba_id: "209876543210999",
      template_name: "otp_authentication",
      template_language: "en_US",
      encrypted_access_token: encryptSecret("mock_token"),
      encrypted_app_secret: encryptSecret("mock_secret"),
      webhook_verify_token: "whsec_mock",
      status: "verified",
      is_sandbox: true,
    };
    integrations.set(intASandbox.id, intASandbox);

    // Disabled Integration for User A
    const intADisabled = {
      id: "aaaa3333-3333-3333-3333-333333333333",
      project_id: projA.id,
      user_id: userA.id,
      name: "Alice Disabled WABA",
      phone_number_id: "109876543210888",
      waba_id: "209876543210888",
      template_name: "otp_authentication",
      template_language: "en_US",
      encrypted_access_token: encryptSecret(validTokenA),
      encrypted_app_secret: encryptSecret("secret"),
      webhook_verify_token: "whsec_disabled",
      status: "disabled",
      is_sandbox: false,
    };
    integrations.set(intADisabled.id, intADisabled);

    // Project & Integration for User B
    const projB = {
      id: "bbbb0000-0000-0000-0000-000000000002",
      user_id: userB.id,
      name: "Bob Work Project",
      is_default: true,
    };
    projects.set(projB.id, projB);

    const intB = {
      id: "bbbb1111-1111-1111-1111-111111111112",
      project_id: projB.id,
      user_id: userB.id,
      name: "Bob WhatsApp WABA",
      phone_number_id: "999888777666555",
      waba_id: "888777666555444",
      template_name: "otp_authentication",
      template_language: "en_US",
      encrypted_access_token: encryptSecret("bob_token_12345"),
      encrypted_app_secret: encryptSecret("bob_secret_12345"),
      webhook_verify_token: "whsec_bob",
      status: "verified",
      is_sandbox: false,
    };
    integrations.set(intB.id, intB);
  });

  // Simulated GET /api/dashboard/integrations
  const getDashboardIntegrations = (authUser: { id: string } | null) => {
    if (!authUser) return { status: 401, error: "Unauthorized" };

    const userProjects = Array.from(projects.values()).filter((p) => p.user_id === authUser.id);
    const userProjIds = new Set(userProjects.map((p) => p.id));

    const userIntegrations = Array.from(integrations.values())
      .filter((i) => i.user_id === authUser.id || userProjIds.has(i.project_id))
      .map((item) => {
        const proj = userProjects.find((p) => p.id === item.project_id);
        return {
          ...item,
          project_name: proj?.name || "Workspace",
          webhook_verify_token: "whsec_••••••••••••••••••••••••",
        };
      });

    return { status: 200, integrations: userIntegrations };
  };

  // Simulated POST /api/dashboard/test-message
  const dispatchTestMessage = async (
    authUser: { id: string } | null,
    payload: any,
    mockMetaResponse?: { success: boolean; messageId?: string; error?: any }
  ) => {
    if (!authUser) return { status: 401, error: "Unauthorized" };

    const parsed = testSendSchema.safeParse(payload);
    if (!parsed.success) {
      return { status: 422, error: parsed.error.errors[0]?.message };
    }

    const { integrationId, phone, templateName, templateLanguage, isLiveSend } = parsed.data;

    const userProjects = Array.from(projects.values()).filter((p) => p.user_id === authUser.id);
    const userProjIds = new Set(userProjects.map((p) => p.id));

    // MODE 1: SANDBOX SIMULATOR
    if (!isLiveSend) {
      let targetProjectId = userProjects[0]?.id;
      if (integrationId) {
        const matched = integrations.get(integrationId);
        if (matched && (matched.user_id === authUser.id || userProjIds.has(matched.project_id))) {
          targetProjectId = matched.project_id;
        }
      }

      if (!targetProjectId) {
        return { status: 400, error: "No active project workspace found. Please create a project before testing." };
      }

      const challengeId = crypto.randomUUID();
      otpChallenges.set(challengeId, {
        id: challengeId,
        project_id: targetProjectId,
        phone_e164: phone,
        status: "pending",
        is_sandbox: true,
      });

      sendAttempts.push({
        challenge_id: challengeId,
        status: "simulated",
        is_live: false,
      });

      return {
        status: 200,
        success: true,
        mode: "sandbox_simulated",
        test_code: "123456",
        message: "Sandbox test simulated successfully. No real WhatsApp message was dispatched and zero Meta charges were incurred.",
      };
    }

    // MODE 2: LIVE WHATSAPP CLOUD API DISPATCH
    if (!integrationId || integrationId === "00000000-0000-0000-0000-000000000000") {
      return { status: 400, error: "Please select a connected WhatsApp integration before dispatching live messages." };
    }

    const integration = integrations.get(integrationId);
    if (!integration) {
      return { status: 404, error: "Integration not found or access denied." };
    }

    const isAuthorized = integration.user_id === authUser.id || userProjIds.has(integration.project_id);
    if (!isAuthorized) {
      return { status: 404, error: "Integration not found or access denied." };
    }

    if (integration.status === "disabled") {
      return {
        status: 400,
        error: "The selected integration is currently disabled. Please enable it in the Integrations tab before dispatching live messages.",
      };
    }

    if (integration.is_sandbox) {
      return {
        status: 400,
        error: "The selected integration is marked as a Sandbox integration. Please select a live WhatsApp integration or switch to Sandbox Simulator.",
      };
    }

    if (!integration.phone_number_id || integration.phone_number_id.trim() === "") {
      return { status: 400, error: "The selected integration is missing a Meta Phone Number ID." };
    }

    let decryptedAccessToken: string;
    try {
      decryptedAccessToken = decryptSecret(integration.encrypted_access_token);
      if (!decryptedAccessToken) throw new Error("Empty token");
    } catch {
      return { status: 500, error: "Failed to decrypt integration credentials." };
    }

    // Mocked Meta API send
    const metaRes = mockMetaResponse || {
      success: true,
      messageId: "wamid.HBgLMTIzNDU2Nzg5MA==",
    };

    if (metaRes.success) {
      integration.status = "verified";
      integration.last_tested_at = new Date().toISOString();

      return {
        status: 200,
        success: true,
        mode: "live_meta_api",
        statusText: "accepted",
        provider_message_id: metaRes.messageId,
        message: "Message accepted by Meta WhatsApp Cloud API. Check recipient device.",
      };
    } else {
      let failureCategory = "Provider Rejection";
      const rawMsg = metaRes.error?.message || "Delivery rejected by Meta";
      const code = metaRes.error?.code;

      if (code === 190) failureCategory = "Invalid or Expired Meta System User Access Token";
      else if (code === 131030) failureCategory = "Recipient Phone Number Not Allowed in Meta Development Mode";
      else if (code === 132001) failureCategory = "Authentication Template Not Found or Not Approved";

      return {
        status: 502,
        success: false,
        mode: "live_meta_api",
        category: failureCategory,
        error: `${failureCategory}: ${rawMsg}`,
      };
    }
  };

  // 1. Authenticated user with valid integration sees it in test console
  it("loads an authenticated user's integrations with associated workspace and status", () => {
    const res = getDashboardIntegrations(userA);
    expect(res.status).toBe(200);
    expect(res.integrations?.length).toBe(3); // live, sandbox, disabled
    const liveInt = res.integrations?.find((i) => i.id === "aaaa1111-1111-1111-1111-111111111111");
    expect(liveInt).toBeDefined();
    expect(liveInt?.name).toBe("Alice Meta WhatsApp WABA");
    expect(liveInt?.phone_number_id).toBe("109876543210123");
    expect(liveInt?.project_name).toBe("Alice Main Project");
    expect(liveInt?.webhook_verify_token).toBe("whsec_••••••••••••••••••••••••");
  });

  // 2. Authenticated user with no integration sees empty array
  it("returns an empty array when an authenticated user has zero integrations", () => {
    const newUser = { id: "33333333-3333-4333-8333-333333333333" };
    const res = getDashboardIntegrations(newUser);
    expect(res.status).toBe(200);
    expect(res.integrations).toEqual([]);
  });

  // 3. API failure distinction
  it("distinguishes between unauthenticated failure and an empty integration list", () => {
    const unauth = getDashboardIntegrations(null);
    expect(unauth.status).toBe(401);
    expect(unauth.error).toBe("Unauthorized");
  });

  // 4. Selected integration ID sent correctly (rejection of placeholder UUID)
  it("rejects placeholder or empty integration ID when live send is requested", async () => {
    const dummyIdRes = await dispatchTestMessage(userA, {
      integrationId: "00000000-0000-0000-0000-000000000000",
      phone: "+14155552671",
      isLiveSend: true,
    });
    expect(dummyIdRes.status).toBe(400);
    expect(dummyIdRes.error).toContain("Please select a connected WhatsApp integration");
  });

  // 5. Integration owner can dispatch a live test
  it("allows the verified integration owner to dispatch a live message", async () => {
    const res = await dispatchTestMessage(userA, {
      integrationId: "aaaa1111-1111-1111-1111-111111111111",
      phone: "+14155552671",
      templateName: "otp_authentication",
      templateLanguage: "en_US",
      isLiveSend: true,
    });

    expect(res.status).toBe(200);
    expect(res.success).toBe(true);
    expect(res.mode).toBe("live_meta_api");
    expect(res.provider_message_id).toBe("wamid.HBgLMTIzNDU2Nzg5MA==");
  });

  // 6. Cross-tenant isolation: User B cannot dispatch using User A's integration
  it("blocks User B from dispatching with User A's integration ID", async () => {
    const res = await dispatchTestMessage(userB, {
      integrationId: "aaaa1111-1111-1111-1111-111111111111", // Alice's ID
      phone: "+14155552671",
      isLiveSend: true,
    });

    expect(res.status).toBe(404);
    expect(res.error).toBe("Integration not found or access denied.");
  });

  // 7. Disabled integration cannot dispatch live
  it("rejects live dispatch on a disabled integration", async () => {
    const res = await dispatchTestMessage(userA, {
      integrationId: "aaaa3333-3333-3333-3333-333333333333", // Disabled ID
      phone: "+14155552671",
      isLiveSend: true,
    });

    expect(res.status).toBe(400);
    expect(res.error).toContain("currently disabled");
  });

  // 8. Sandbox integration cannot perform live send
  it("prevents sandbox integrations from executing live dispatch", async () => {
    const res = await dispatchTestMessage(userA, {
      integrationId: "aaaa2222-2222-2222-2222-222222222222", // Sandbox ID
      phone: "+14155552671",
      isLiveSend: true,
    });

    expect(res.status).toBe(400);
    expect(res.error).toContain("marked as a Sandbox integration");
  });

  // 9. Sandbox mode simulator succeeds without integration ID
  it("executes Sandbox simulation successfully without requiring an integration ID", async () => {
    const res = await dispatchTestMessage(userA, {
      phone: "+14155552671",
      isLiveSend: false,
    });

    expect(res.status).toBe(200);
    expect(res.success).toBe(true);
    expect(res.mode).toBe("sandbox_simulated");
    expect(res.test_code).toBe("123456");
  });

  // 10. Provider rejection handling with clear categorization
  it("safely categorizes provider rejections (e.g. invalid template or recipient)", async () => {
    const res = await dispatchTestMessage(
      userA,
      {
        integrationId: "aaaa1111-1111-1111-1111-111111111111",
        phone: "+14155552671",
        isLiveSend: true,
      },
      {
        success: false,
        error: {
          code: 132001,
          message: "Template not found or not approved in requested language",
        },
      }
    );

    expect(res.status).toBe(502);
    expect(res.success).toBe(false);
    expect(res.category).toBe("Authentication Template Not Found or Not Approved");
    expect(res.error).toContain("Authentication Template Not Found or Not Approved");
  });
});
