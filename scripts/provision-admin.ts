/**
 * Verify Stack — Secure One-Time Platform Admin Provisioning Script
 *
 * Usage:
 *   npx tsx scripts/provision-admin.ts --email=admin@yourdomain.com --name="Platform Admin"
 *
 * This script securely provisions or promotes an administrator in Supabase Auth and the profiles table
 * using the server-side SUPABASE_SERVICE_ROLE_KEY. It never commits passwords to Git.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const prefix = `--${name}=`;
    const arg = args.find((a) => a.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : null;
  };

  const email = getArg("email");
  const password = getArg("password");
  const fullName = getArg("name") || "Platform Administrator";

  if (!email) {
    console.log(`
Verify Stack Admin Provisioning
===============================
Usage:
  npx tsx scripts/provision-admin.ts --email=admin@yourdomain.com [--password=YourSecurePassword] [--name="Platform Admin"]

If an account already exists with that email, it will be promoted to admin role ('admin').
If it does not exist, a new user will be created (requires --password).
`);
    process.exit(0);
  }

  console.log(`Checking account status for: ${email}...`);

  // Check if profile exists
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    console.log(`Existing user found (ID: ${existingProfile.id}). Promoting to role: 'admin'...`);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ role: "admin", status: "active" })
      .eq("id", existingProfile.id);

    if (updateErr) {
      console.error("Failed to promote user in database:", updateErr.message);
      process.exit(1);
    }

    // Update Supabase Auth app_metadata so middleware recognizes admin session
    const updateAuthPayload: any = {
      app_metadata: { role: "admin" },
    };
    if (password && password.length >= 8) {
      updateAuthPayload.password = password;
      console.log("Updated password for existing administrator account.");
    }

    const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(
      existingProfile.id,
      updateAuthPayload
    );

    if (authUpdateErr) {
      console.warn("Warning: Could not update Supabase Auth app_metadata:", authUpdateErr.message);
    }

    console.log(`\nSuccess! User ${email} has been promoted to platform administrator.`);
    console.log(`Recommended: Add ${email} to ADMIN_EMAIL_ALLOWLIST in your Vercel environment variables.`);
    console.log(`Sign in at: https://verifystack-lyart.vercel.app/platform-admin/login`);
    return;
  }

  // If user does not exist, create new Supabase Auth user
  if (!password || password.length < 8) {
    console.error("Error: Account does not exist yet. Please supply --password with at least 8 characters.");
    process.exit(1);
  }

  console.log(`Creating new administrator account for: ${email}...`);
  const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: "admin" },
    user_metadata: { full_name: fullName },
  });

  if (createErr || !newUser.user) {
    console.error("Failed to create admin user in Supabase Auth:", createErr?.message);
    process.exit(1);
  }

  // Create admin profile
  await supabase.from("profiles").upsert(
    {
      id: newUser.user.id,
      email,
      full_name: fullName,
      role: "admin",
      status: "active",
    },
    { onConflict: "id" }
  );

  console.log(`\nAdministrator provisioned successfully!`);
  console.log(`User ID: ${newUser.user.id}`);
  console.log(`Email:   ${email}`);
  console.log(`Role:    admin`);
  console.log(`\nNext steps:`);
  console.log(`1. Add ${email} to ADMIN_EMAIL_ALLOWLIST in Vercel.`);
  console.log(`2. Sign in at https://verifystack-lyart.vercel.app/platform-admin/login`);
}

main().catch(console.error);
