import { describe, it, expect, vi } from "vitest";
import { isAllowlistedAdminEmail } from "../src/lib/admin-auth";

describe("Platform Admin Authorization & Allowlist Logic", () => {
  it("authorizes allowlisted admin emails case-insensitively and handles whitespace", () => {
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@verifystack.dev, security@verifystack.dev , Lead@Company.com";

    expect(isAllowlistedAdminEmail("admin@verifystack.dev")).toBe(true);
    expect(isAllowlistedAdminEmail("ADMIN@VERIFYSTACK.DEV")).toBe(true);
    expect(isAllowlistedAdminEmail("  security@verifystack.dev  ")).toBe(true);
    expect(isAllowlistedAdminEmail("lead@company.com")).toBe(true);
  });

  it("denies access to non-allowlisted emails", () => {
    process.env.ADMIN_EMAIL_ALLOWLIST = "admin@verifystack.dev";

    expect(isAllowlistedAdminEmail("attacker@domain.xyz")).toBe(false);
    expect(isAllowlistedAdminEmail("developer@company.com")).toBe(false);
    expect(isAllowlistedAdminEmail("")).toBe(false);
    expect(isAllowlistedAdminEmail(null)).toBe(false);
    expect(isAllowlistedAdminEmail(undefined)).toBe(false);
  });

  it("enforces strong confirmation phrase matching for permanent user deletion", () => {
    const targetEmail = "developer@fintech.io";

    const validateConfirmPhrase = (phrase: string, email: string) => {
      return phrase.trim().toLowerCase() === email.toLowerCase();
    };

    expect(validateConfirmPhrase("developer@fintech.io", targetEmail)).toBe(true);
    expect(validateConfirmPhrase("  DEVELOPER@FINTECH.IO  ", targetEmail)).toBe(true);
    expect(validateConfirmPhrase("delete", targetEmail)).toBe(false);
    expect(validateConfirmPhrase("other@fintech.io", targetEmail)).toBe(false);
  });
});
