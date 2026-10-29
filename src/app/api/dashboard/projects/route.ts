import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureUserProfile } from "@/lib/user-profile";

const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(100, "Project name must not exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user profile exists in public.profiles to satisfy all foreign key relationships
  try {
    await ensureUserProfile(user);
  } catch (err) {
    console.error("Failed to ensure user profile:", err);
  }

  // Query projects belonging to the authenticated user using RLS-enabled client
  const { data: userProjects, error } = await supabase
    .from("projects")
    .select("id, name, slug, is_default, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to retrieve projects" }, { status: 500 });
  }

  // If user has zero projects, idempotently provision an initial Default Project
  if (!userProjects || userProjects.length === 0) {
    const admin = createAdminClient();

    // Check again to prevent race conditions
    const { data: existingDefault } = await admin
      .from("projects")
      .select("id, name, slug, is_default, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("slug", "default")
      .maybeSingle();

    if (existingDefault) {
      return NextResponse.json({
        success: true,
        projects: [existingDefault],
      });
    }

    const { data: defaultProject, error: seedError } = await admin
      .from("projects")
      .insert({
        user_id: user.id,
        name: "Default Project",
        slug: "default",
        is_default: true,
      })
      .select("id, name, slug, is_default, created_at, updated_at")
      .single();

    if (!seedError && defaultProject) {
      return NextResponse.json({
        success: true,
        projects: [defaultProject],
      });
    }
  }

  return NextResponse.json({
    success: true,
    projects: userProjects || [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 422 });
  }

  // Ensure user profile exists in public.profiles to satisfy projects_user_id_fkey
  try {
    await ensureUserProfile(user);
  } catch (err: any) {
    console.error("Profile synchronization error during project creation:", err);
    return NextResponse.json(
      { error: "Could not initialize user profile workspace. Please try again." },
      { status: 500 }
    );
  }

  const { name } = parsed.data;
  let slug = parsed.data.slug;
  if (!slug) {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    slug = baseSlug || "project";
  }

  const admin = createAdminClient();

  // Check if a project with the identical slug already exists for this user
  const { data: existingWithSlug } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("slug", slug)
    .maybeSingle();

  if (existingWithSlug) {
    // Append unique 4-character suffix to make it distinctive
    slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const { data: newProject, error: insertError } = await admin
    .from("projects")
    .insert({
      user_id: user.id,
      name,
      slug,
      is_default: false,
    })
    .select("id, name, slug, is_default, created_at, updated_at")
    .single();

  if (insertError || !newProject) {
    // Handle uniqueness violation gracefully without leaking PostgreSQL details
    if (insertError?.code === "23505" || insertError?.message?.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { error: "A project with this name or slug already exists in your account." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create project. Please verify your input and try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    project: newProject,
  });
}
