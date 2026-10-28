import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const auth = await verifyAdminSession();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  return NextResponse.json({
    authorized: true,
    user: auth.user,
    profile: auth.profile,
  });
}
