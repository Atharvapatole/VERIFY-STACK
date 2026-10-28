import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const searchParams = request.nextUrl.searchParams;
  const timeRange = searchParams.get("range") || "30d"; // 'today', '7d', '30d', 'all'

  let dateFilter: Date | null = null;
  const now = new Date();
  if (timeRange === "today") {
    dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeRange === "7d") {
    dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeRange === "30d") {
    dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // 1. Users metrics
  const { data: users, error: userErr } = await admin.from("profiles").select("id, status, created_at");
  const totalUsers = users?.length || 0;
  const activeUsers = users?.filter((u) => u.status === "active").length || 0;
  const suspendedUsers = users?.filter((u) => u.status === "suspended").length || 0;

  // 2. Projects & Integrations
  const { data: projects } = await admin.from("projects").select("id");
  const totalProjects = projects?.length || 0;

  const { data: integrations } = await admin.from("integrations").select("id, status, last_webhook_error");
  const totalIntegrations = integrations?.length || 0;
  const verifiedIntegrations = integrations?.filter((i) => i.status === "verified").length || 0;
  const errorIntegrations = integrations?.filter((i) => i.status === "failed" || !!i.last_webhook_error).length || 0;

  // 3. OTP Challenges
  let otpQuery = admin.from("otp_challenges").select("id, status, is_sandbox, created_at");
  if (dateFilter) {
    otpQuery = otpQuery.gte("created_at", dateFilter.toISOString());
  }
  const { data: challenges } = await otpQuery;
  const totalChallenges = challenges?.length || 0;
  const verifiedChallenges = challenges?.filter((c) => c.status === "verified").length || 0;
  const failedChallenges = challenges?.filter((c) => c.status === "failed").length || 0;
  const liveChallenges = challenges?.filter((c) => !c.is_sandbox).length || 0;
  const sandboxChallenges = challenges?.filter((c) => c.is_sandbox).length || 0;

  // 4. Send attempts & Webhook events
  const { data: sendAttempts } = await admin.from("send_attempts").select("id, status");
  const totalSends = sendAttempts?.length || 0;
  const successfulSends = sendAttempts?.filter((s) => s.status === "accepted" || s.status === "delivered").length || 0;

  const { data: deliveryEvents } = await admin.from("delivery_events").select("id, event_type");
  const totalWebhookEvents = deliveryEvents?.length || 0;

  // 5. Estimated Costs (Based on live delivered messages * $0.035 USD estimate)
  const estimatedCostUsd = Number((liveChallenges * 0.035).toFixed(2));

  // 6. Recent Audit Logs
  const { data: recentLogs } = await admin
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(8);

  return NextResponse.json({
    metrics: {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
      },
      infrastructure: {
        projects: totalProjects,
        integrations: totalIntegrations,
        verified_integrations: verifiedIntegrations,
        error_integrations: errorIntegrations,
      },
      otp: {
        total: totalChallenges,
        verified: verifiedChallenges,
        failed: failedChallenges,
        conversion_rate: totalChallenges > 0 ? Math.round((verifiedChallenges / totalChallenges) * 100) : 0,
        live: liveChallenges,
        sandbox: sandboxChallenges,
      },
      delivery: {
        total_sends: totalSends,
        successful_sends: successfulSends,
        webhook_events: totalWebhookEvents,
      },
      costs: {
        estimated_usd: estimatedCostUsd,
        currency: "USD",
        note: "Estimated wholesale Meta conversation rate ($0.035/auth avg). Billed directly by Meta.",
      },
      recent_activity: recentLogs || [],
    },
  });
}
