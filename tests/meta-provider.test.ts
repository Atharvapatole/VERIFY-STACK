import { describe, it, expect, vi } from "vitest";
import {
  formatPhoneForMeta,
  buildAuthenticationPayload,
  sendAuthenticationTemplate,
} from "../src/lib/whatsapp/meta-provider";

describe("Meta WhatsApp Cloud API Provider Adapter", () => {
  it("formats international E.164 phone numbers for Meta (digits only)", () => {
    expect(formatPhoneForMeta("+1 (415) 555-2671")).toBe("14155552671");
    expect(formatPhoneForMeta("+91 98765 43210")).toBe("919876543210");
  });

  it("builds compliant Meta Authentication Template payload", () => {
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
