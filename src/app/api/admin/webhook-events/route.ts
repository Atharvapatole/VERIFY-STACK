import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const auth = await verifyAdminSession(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(Math.max(1, Number(searchParams.get("limit") || 50)), 100);

  const admin = createAdminClient();
  const { data: events, error } = await admin
    .from("delivery_events")
    .select("id, project_id, provider_message_id, event_type, created_at, raw_payload")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch webhook events" }, { status: 500 });
  }

  // Sanitize raw payloads if any sensitive headers are stored
  const sanitized = (events || []).map((ev) => ({
    ...ev,
    raw_payload: ev.raw_payload || {},
  }));

  return NextResponse.json({ events: sanitized });
}
