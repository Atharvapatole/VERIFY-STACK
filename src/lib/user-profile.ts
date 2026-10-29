import { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "suspended";
}

/**
 * Ensures that a public.profiles record exists for the given authenticated Supabase user.
 * If the profile does not exist (e.g. user was created directly in auth.users without a trigger),
 * it safely and idempotently provisions the profile to satisfy foreign key relationships.
 */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const admin = createAdminClient();

  // Check if profile exists
  const { data: existingProfile, error: fetchError } = await admin
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (existingProfile && !fetchError) {
    return existingProfile as UserProfile;
  }

  // Derive profile attributes from Supabase Auth user
  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Developer";

  const email = user.email || `${user.id}@verifystack.local`;
  const role = (user.app_metadata?.role === "admin" ? "admin" : "user") as "user" | "admin";

  const { data: createdProfile, error: upsertError } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: fullName,
        email: email,
        role: role,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("id, full_name, email, role, status")
    .single();

  if (upsertError || !createdProfile) {
    // In case of conflict on email with identical ID
    const { data: profileByEmail } = await admin
      .from("profiles")
      .select("id, full_name, email, role, status")
      .eq("email", email)
      .maybeSingle();

    if (profileByEmail && profileByEmail.id === user.id) {
      return profileByEmail as UserProfile;
    }

    console.error("Failed to ensure user profile:", upsertError);
    throw new Error("Unable to initialize user profile record in database.");
  }

  return createdProfile as UserProfile;
}
