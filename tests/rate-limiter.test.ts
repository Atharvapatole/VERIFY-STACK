import { describe, it, expect } from "vitest";
import { checkDistributedRateLimit } from "../src/lib/rate-limit/rate-limiter";

describe("Rate Limiter Resilience & Distributed Behavior", () => {
  it("allows requests under the configured threshold", async () => {
    const key = `test:ip:10.0.0.${Date.now()}`;
    const limit = 3;
    const windowSec = 2;

    const r1 = await checkDistributedRateLimit(key, limit, windowSec);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await checkDistributedRateLimit(key, limit, windowSec);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await checkDistributedRateLimit(key, limit, windowSec);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th request must be rejected
    const r4 = await checkDistributedRateLimit(key, limit, windowSec);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });
});
