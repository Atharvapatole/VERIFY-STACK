import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAdminAuditLog } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    await recordAdminAuditLog({
      adminId: user.id,
      adminEmail: user.email,
      action: "admin.logout",
      targetType: "system",
      ipAddress: clientIp,
    });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ success: true, message: "Logged out from Platform Admin" });
}
