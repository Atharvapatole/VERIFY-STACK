import { describe, it, expect } from "vitest";
import { generateOtpCode, hashOtpCode, verifyOtpCode } from "../src/lib/crypto/otp";

describe("OTP Lifecycle & Security Logic", () => {
  const secret = "otp-lifecycle-secret-key-1234567890abcdef";

  interface MockChallenge {
    id: string;
    codeHash: string;
    attempts: number;
    maxAttempts: number;
    status: "pending" | "verified" | "failed" | "expired";
    expiresAt: number;
    isSandbox: boolean;
  }

  function verifyChallenge(challenge: MockChallenge, candidateCode: string, now: number) {
    if (now > challenge.expiresAt || challenge.status === "expired") {
      challenge.status = "expired";
      return { success: false, status: "expired", reason: "CHALLENGE_EXPIRED" };
    }

    if (challenge.attempts >= challenge.maxAttempts || challenge.status === "failed") {
      return { success: false, status: "failed", reason: "MAX_ATTEMPTS_EXCEEDED" };
    }

    if (challenge.status === "verified") {
      return { success: false, status: "already_verified", reason: "ALREADY_VERIFIED" };
    }

    const isValid = verifyOtpCode(candidateCode, challenge.codeHash, secret);

    if (!isValid) {
      challenge.attempts += 1;
      if (challenge.attempts >= challenge.maxAttempts) {
        challenge.status = "failed";
      }
      return {
        success: false,
        status: challenge.status,
        remainingAttempts: Math.max(0, challenge.maxAttempts - challenge.attempts),
        reason: challenge.status === "failed" ? "MAX_ATTEMPTS_EXCEEDED" : "INVALID_CODE",
      };
    }

    // Success
    challenge.status = "verified";
    challenge.attempts += 1;
    return { success: true, status: "verified" };
  }

  it("successfully verifies valid code within expiry window", () => {
    const rawOtp = "451290";
    const now = Date.now();
    const challenge: MockChallenge = {
      id: "ch-1",
      codeHash: hashOtpCode(rawOtp, secret),
      attempts: 0,
      maxAttempts: 5,
      status: "pending",
      expiresAt: now + 5 * 60 * 1000,
      isSandbox: false,
    };

    const res = verifyChallenge(challenge, "451290", now + 1000);
    expect(res.success).toBe(true);
    expect(res.status).toBe("verified");
    expect(challenge.status).toBe("verified");
  });

  it("locks out challenge after 5 failed verification attempts", () => {
    const rawOtp = "998811";
    const now = Date.now();
    const challenge: MockChallenge = {
      id: "ch-2",
      codeHash: hashOtpCode(rawOtp, secret),
      attempts: 0,
      maxAttempts: 5,
      status: "pending",
      expiresAt: now + 5 * 60 * 1000,
      isSandbox: false,
    };

    // Attempts 1 to 4
    for (let i = 1; i <= 4; i++) {
      const res = verifyChallenge(challenge, "000000", now);
      expect(res.success).toBe(false);
      expect(res.status).toBe("pending");
      expect(res.remainingAttempts).toBe(5 - i);
    }

    // 5th failed attempt triggers lockout
    const res5 = verifyChallenge(challenge, "000000", now);
    expect(res5.success).toBe(false);
    expect(res5.status).toBe("failed");
    expect(res5.reason).toBe("MAX_ATTEMPTS_EXCEEDED");

    // 6th attempt is blocked even if correct code is provided!
    const res6 = verifyChallenge(challenge, rawOtp, now);
    expect(res6.success).toBe(false);
    expect(res6.status).toBe("failed");
    expect(res6.reason).toBe("MAX_ATTEMPTS_EXCEEDED");
  });

  it("prevents replay attacks on already verified challenges", () => {
    const rawOtp = "334455";
    const now = Date.now();
    const challenge: MockChallenge = {
      id: "ch-3",
      codeHash: hashOtpCode(rawOtp, secret),
      attempts: 0,
      maxAttempts: 5,
      status: "pending",
      expiresAt: now + 5 * 60 * 1000,
      isSandbox: false,
    };

    const firstVerify = verifyChallenge(challenge, rawOtp, now);
    expect(firstVerify.success).toBe(true);

    // Immediate replay attempt with exact same code
    const replayVerify = verifyChallenge(challenge, rawOtp, now + 500);
    expect(replayVerify.success).toBe(false);
    expect(replayVerify.reason).toBe("ALREADY_VERIFIED");
  });

  it("rejects expired OTP challenges", () => {
    const rawOtp = "123456";
    const now = Date.now();
    const challenge: MockChallenge = {
      id: "ch-4",
      codeHash: hashOtpCode(rawOtp, secret),
      attempts: 0,
      maxAttempts: 5,
      status: "pending",
      expiresAt: now - 1000, // expired 1 sec ago
      isSandbox: false,
    };

    const res = verifyChallenge(challenge, rawOtp, now);
    expect(res.success).toBe(false);
    expect(res.status).toBe("expired");
    expect(res.reason).toBe("CHALLENGE_EXPIRED");
  });
});
