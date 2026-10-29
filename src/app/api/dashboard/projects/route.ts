import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const createProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").optional(),
});

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { name } = parsed.data;
  let slug = parsed.data.slug;
  if (!slug) {
    slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!slug) slug = "project";
    // Append random suffix to prevent collisions
    slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
  }

  const admin = createAdminClient();
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
    return NextResponse.json(
      { error: "Failed to create project: " + (insertError?.message || "") },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    project: newProject,
  });
}
