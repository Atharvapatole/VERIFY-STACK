import { describe, it, expect, vi } from "vitest";
import {
  formatPhoneForMeta,
  buildAuthenticationPayload,
  sendAuthenticationTemplate,
  fetchWabaMessageTemplates,
  MetaTemplateComponent,
} from "../src/lib/whatsapp/meta-provider";

describe("Meta WhatsApp Cloud API Provider Adapter", () => {
  it("formats international E.164 phone numbers for Meta (digits only)", () => {
    expect(formatPhoneForMeta("+1 (415) 555-2671")).toBe("14155552671");
    expect(formatPhoneForMeta("+91 98765 43210")).toBe("919876543210");
  });

  it("builds compliant Meta Authentication Template payload with copy-code button", () => {
    const payload = buildAuthenticationPayload(
      "+14155552671",
      "otp_authentication",
      "en_US",
      "654321",
      true
    );

    expect(payload.messaging_product).toBe("whatsapp");
    expect(payload.to).toBe("14155552671");
    expect(payload.type).toBe("template");
    expect(payload.template.name).toBe("otp_authentication");
    expect(payload.template.language.code).toBe("en_US");

    // Body component with OTP
    const bodyComp = payload.template.components.find((c: any) => c.type === "body");
    expect(bodyComp).toBeDefined();
    expect(bodyComp.parameters[0].text).toBe("654321");

    // Copy code button component
    const buttonComp = payload.template.components.find((c: any) => c.type === "button");
    expect(buttonComp).toBeDefined();
    expect(buttonComp.parameters[0].text).toBe("654321");
  });

  it("omits button component when template components have zero buttons (prevents #100)", () => {
    const componentsWithoutButton: MetaTemplateComponent[] = [
      { type: "BODY", text: "Your login code is {{1}}." },
    ];

    const payload = buildAuthenticationPayload(
      "+14155552671",
      "simple_otp",
      "en",
      "998877",
      componentsWithoutButton
    );

    const buttonComp = payload.template.components.find((c: any) => c.type === "button");
    expect(buttonComp).toBeUndefined();
    expect(payload.template.components.length).toBe(1);
    expect(payload.template.components[0].type).toBe("body");
  });

  it("detects and includes button component when template components have OTP button", () => {
    const componentsWithButton: MetaTemplateComponent[] = [
      { type: "BODY", text: "Your login code is {{1}}." },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE" }] },
    ];

    const payload = buildAuthenticationPayload(
      "+14155552671",
      "custom_auth_template",
      "hi",
      "554433",
      componentsWithButton
    );

    const buttonComp = payload.template.components.find((c: any) => c.type === "button");
    expect(buttonComp).toBeDefined();
    expect(buttonComp.sub_type).toBe("url");
    expect(buttonComp.parameters[0].text).toBe("554433");
  });

  it("enriches error 132001 when template is not found in WABA", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: "(#132001) Template name does not exist in the translation — template name (otp_authentication) does not exist in en_US",
          type: "OAuthException",
          code: 132001,
          error_subcode: 2388040,
        },
      }),
    } as any);

    const res = await sendAuthenticationTemplate({
      phoneNumberId: "1234567890",
      accessToken: "SECRET_BEARER_TOKEN",
      recipientPhone: "+14155552671",
      templateName: "otp_authentication",
      templateLanguage: "en_US",
      otpCode: "123456",
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe("failed");
    expect(res.error?.code).toBe(132001);
    expect(res.error?.message).toContain("Template Not Found or Not Approved");
    expect(res.error?.message).toContain("otp_authentication");
    expect(res.error?.message).toContain("en_US");

    globalThis.fetch = originalFetch;
  });

  it("fetches message templates from Meta WABA and handles pagination", async () => {
    const originalFetch = globalThis.fetch;

    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: "tpl_1",
                name: "verified_auth_code",
                status: "APPROVED",
                category: "AUTHENTICATION",
                language: "en_US",
                components: [{ type: "BODY", text: "Your code is {{1}}" }],
              },
            ],
            paging: {
              next: "https://graph.facebook.com/v22.0/WABA_123/message_templates?limit=100&after=CURSOR_NEXT",
            },
          }),
        };
      } else {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                id: "tpl_2",
                name: "welcome_code",
                status: "APPROVED",
                category: "UTILITY",
                language: "es",
                components: [{ type: "BODY", text: "Tu codigo es {{1}}" }],
              },
            ],
          }),
        };
      }
    });

    const result = await fetchWabaMessageTemplates("WABA_123", "TEST_ACCESS_TOKEN");
    expect(result.success).toBe(true);
    expect(result.templates?.length).toBe(2);
    expect(result.templates?.[0].name).toBe("verified_auth_code");
    expect(result.templates?.[1].name).toBe("welcome_code");
    expect(callCount).toBe(2);

    globalThis.fetch = originalFetch;
  });

  it("sanitizes 4xx client errors and never leaks Bearer tokens", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: "(#100) Param template['name'] does not exist.",
          type: "OAuthException",
          code: 100,
          error_subcode: 2388040,
        },
      }),
    } as any);

    const res = await sendAuthenticationTemplate({
      phoneNumberId: "1234567890",
      accessToken: "SECRET_BEARER_TOKEN_NEVER_LEAK",
      recipientPhone: "+14155552671",
      templateName: "non_existent_template",
      otpCode: "123456",
    });

    expect(res.success).toBe(false);
    expect(res.status).toBe("failed");
    expect(res.error?.code).toBe(100);
    expect(res.error?.message).toContain("Param template['name'] does not exist.");
    // Ensure secret token is NOT leaked anywhere in the response
    expect(JSON.stringify(res)).not.toContain("SECRET_BEARER_TOKEN_NEVER_LEAK");

    globalThis.fetch = originalFetch;
  });
});
