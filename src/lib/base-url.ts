/**
 * Canonical production URL of the Verify Stack application on Vercel.
 */
export const CANONICAL_PRODUCTION_URL = "https://verifystack-lyart.vercel.app";

/**
 * Returns the canonical public URL for webhook callbacks and external links.
 * 
 * Rules:
 * 1. Never return localhost in production.
 * 2. Never return the non-existent 'verifystack.vercel.app' alias.
 * 3. Use NEXT_PUBLIC_APP_URL if explicitly configured and valid.
 * 4. In client browser, use window.location.origin if it's on vercel.app (excluding verifystack.vercel.app).
 * 5. Default to https://verifystack-lyart.vercel.app.
 */
export function getCanonicalAppUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  // If envUrl is set to the broken non-existent verifystack.vercel.app, reject it
  if (envUrl && envUrl.includes("verifystack.vercel.app")) {
    return CANONICAL_PRODUCTION_URL;
  }

  // If envUrl is a valid production domain (and not localhost)
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl.replace(/\/+$/, "");
  }

  // Client-side browser check
  if (typeof window !== "undefined" && window.location?.origin) {
    const origin = window.location.origin.trim();
    if (
      origin.includes("vercel.app") &&
      !origin.includes("verifystack.vercel.app")
    ) {
      return origin.replace(/\/+$/, "");
    }
  }

  return CANONICAL_PRODUCTION_URL;
}
