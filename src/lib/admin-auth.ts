import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";

export interface AdminAuthSuccess {
  authorized: true;
  user: {
    id: string;
    email: string;
  };
  profile: {
    id: string;
    full_name: string;
    email: string;
    role: "admin" | "user";
    status?: "active" | "suspended";
  };
}

export interface AdminAuthFailure {
  authorized: false;
  status: 401 | 403;
  error: string;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

/**
 * Checks whether an email is included in the ADMIN_EMAIL_ALLOWLIST.
 */
export function isAllowlistedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAIL_ALLOWLIST || env.ADMIN_EMAIL_ALLOWLIST || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowlist.includes(email.toLowerCase().trim());
}

/**
 * Verifies that the current session belongs to an authorized platform administrator.
 * Validates against both ADMIN_EMAIL_ALLOWLIST and database profile role ('admin').
 */
export async function verifyAdminSession(request?: NextRequest): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return {
      authorized: false,
      status: 401,
      error: "Authentication required. Please sign in with an administrator account.",
    };
  }

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("id", user.id)
    .maybeSingle();

  const isAllowlisted = isAllowlistedAdminEmail(user.email);
  const hasAdminRole = profile?.role === "admin";

  if (!isAllowlisted && !hasAdminRole) {
    return {
      authorized: false,
      status: 403,
      error: "Access denied. Your account does not possess platform administrator privileges.",
    };
  }

  if (profile?.status === "suspended") {
    return {
      authorized: false,
      status: 403,
      error: "Account has been suspended by platform administration.",
    };
  }

  return {
    authorized: true,
    user: {
      id: user.id,
      email: user.email,
    },
    profile: {
      id: user.id,
      full_name: profile?.full_name || user.email.split("@")[0],
      email: user.email,
      role: "admin",
      status: profile?.status || "active",
    },
  };
}

export interface AdminAuditParams {
  adminId?: string | null;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Appends an entry into the immutable admin audit log.
 * Never stores passwords, access tokens, API keys, or raw OTP codes.
 */
export async function recordAdminAuditLog(params: AdminAuditParams) {
  try {
    const adminClient = createAdminClient();
    await adminClient.from("admin_audit_logs").insert({
      admin_id: params.adminId || null,
      admin_email: params.adminEmail,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
    });
  } catch (err) {
    console.error("Failed to write to admin_audit_logs:", err);
  }
}
