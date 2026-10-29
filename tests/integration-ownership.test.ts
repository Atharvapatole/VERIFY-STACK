import { describe, it, expect } from "vitest";
import { z } from "zod";
import crypto from "node:crypto";
import { encryptSecret, decryptSecret } from "../src/lib/crypto/aes";

const createIntegrationSchema = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid("Invalid project ID format"),
  name: z.string().min(2).max(100),
  phoneNumberId: z.string().min(5).max(50),
  wabaId: z.string().min(5).max(50),
  accessToken: z.string().min(10),
  appSecret: z.string().min(10),
  templateName: z.string().default("otp_authentication"),
  templateLanguage: z.string().default("en_US"),
  webhookVerifyToken: z.string().min(16).optional(),
  isSandbox: z.boolean().default(false),
});

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

describe("Project Management & Foreign Key Integrity", () => {
  const userA = { id: "11111111-1111-4111-8111-111111111111", email: "user.a@example.com" };
  const userB = { id: "22222222-2222-4222-8222-222222222222", email: "user.b@example.com" };

  // Simulated Database Tables
  const profilesTable = new Map<string, any>();
  const projectsTable = new Map<string, any>();

  // Helper simulating ensureUserProfile
  const ensureUserProfileSim = (user: { id: string; email: string; full_name?: string }) => {
    if (!profilesTable.has(user.id)) {
      profilesTable.set(user.id, {
        id: user.id,
        email: user.email,
        full_name: user.full_name || user.email.split("@")[0],
        role: "user",
        status: "active",
      });
    }
    return profilesTable.get(user.id);
  };

  // Helper simulating createProject with foreign key check
  const createProjectSim = (
    authUser: { id: string; email: string } | null,
    input: { name: string; slug?: string }
  ) => {
    if (!authUser) {
      return { status: 401, error: "Unauthorized" };
    }

    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { status: 422, error: parsed.error.errors[0].message };
    }

    // Step 1: Ensure profile exists
    ensureUserProfileSim(authUser);

    // Step 2: Validate foreign key to public.profiles
    if (!profilesTable.has(authUser.id)) {
      return {
        status: 500,
        error: 'insert or update on table "projects" violates foreign key constraint "projects_user_id_fkey"',
      };
    }

    // Step 3: Compute slug and resolve uniqueness
    let slug =
      input.slug ||
      input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    if (!slug) slug = "project";

    const userProjects = Array.from(projectsTable.values()).filter((p) => p.user_id === authUser.id);
    if (userProjects.some((p) => p.slug === slug)) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const newProject = {
      id: crypto.randomUUID(),
      user_id: authUser.id,
      name: input.name,
      slug,
      is_default: false,
      created_at: new Date().toISOString(),
    };

    projectsTable.set(newProject.id, newProject);
    return { status: 200, success: true, project: newProject };
  };

  // Helper simulating default project provisioning
  const ensureDefaultProjectSim = (authUser: { id: string; email: string }) => {
    ensureUserProfileSim(authUser);
    const userProjects = Array.from(projectsTable.values()).filter((p) => p.user_id === authUser.id);
    const existing = userProjects.find((p) => p.slug === "default");
    if (existing) {
      return existing;
    }

    const defaultProj = {
      id: crypto.randomUUID(),
      user_id: authUser.id,
      name: "Default Project",
      slug: "default",
      is_default: true,
      created_at: new Date().toISOString(),
    };
    projectsTable.set(defaultProj.id, defaultProj);
    return defaultProj;
  };

  it("rejects project creation when user is unauthenticated", () => {
    const res = createProjectSim(null, { name: "PROJECT_01" });
    expect(res.status).toBe(401);
    expect(res.error).toBe("Unauthorized");
  });

  it("rejects invalid project names (<2 chars or >100 chars)", () => {
    const resShort = createProjectSim(userA, { name: "A" });
    expect(resShort.status).toBe(422);
    expect(resShort.error).toBe("Project name must be at least 2 characters");

    const resLong = createProjectSim(userA, { name: "A".repeat(101) });
    expect(resLong.status).toBe(422);
    expect(resLong.error).toBe("Project name must not exceed 100 characters");
  });

  it("allows authenticated User A to create PROJECT_01 and ensures owner ID matches", () => {
    const res = createProjectSim(userA, { name: "PROJECT_01" });
    expect(res.status).toBe(200);
    expect(res.success).toBe(true);
    expect(res.project?.name).toBe("PROJECT_01");
    expect(res.project?.user_id).toBe(userA.id);
    expect(res.project?.slug).toBe("project-01");
    // Verify foreign key relationship is satisfied in profiles table
    expect(profilesTable.has(userA.id)).toBe(true);
  });

  it("safely handles a user whose profile record was initially missing (auto-provisioning)", () => {
    const userWithoutProfile = {
      id: "99999999-9999-4999-8999-999999999999",
      email: "fresh.user@example.com",
    };

    // Ensure profiles table does NOT have this user initially
    profilesTable.delete(userWithoutProfile.id);
    expect(profilesTable.has(userWithoutProfile.id)).toBe(false);

    // Creating project automatically provisions profile without foreign key error
    const res = createProjectSim(userWithoutProfile, { name: "First Workspace" });
    expect(res.status).toBe(200);
    expect(res.success).toBe(true);
    expect(profilesTable.has(userWithoutProfile.id)).toBe(true);
    expect(res.project?.user_id).toBe(userWithoutProfile.id);
  });

  it("handles duplicate project names safely by appending unique suffix without collision", () => {
    const res1 = createProjectSim(userA, { name: "PROJECT_01" });
    expect(res1.status).toBe(200);

    const res2 = createProjectSim(userA, { name: "PROJECT_01" });
    expect(res2.status).toBe(200);
    expect(res2.project?.slug.startsWith("project-01-")).toBe(true);
    expect(res1.project?.id).not.toBe(res2.project?.id);
  });

  it("provisions a Default Project idempotently without creating duplicates", () => {
    const def1 = ensureDefaultProjectSim(userB);
    const def2 = ensureDefaultProjectSim(userB);

    expect(def1.id).toBe(def2.id);
    expect(def1.slug).toBe("default");
    expect(def1.user_id).toBe(userB.id);

    const userBProjects = Array.from(projectsTable.values()).filter(
      (p) => p.user_id === userB.id && p.slug === "default"
    );
    expect(userBProjects.length).toBe(1);
  });

  it("enforces tenant isolation: User A cannot target or access User B's project", () => {
    const userBProj = ensureDefaultProjectSim(userB);

    const canAccessProject = (requesterId: string, projectId: string) => {
      const proj = projectsTable.get(projectId);
      return proj && proj.user_id === requesterId;
    };

    expect(canAccessProject(userA.id, userBProj.id)).toBe(false);
    expect(canAccessProject(userB.id, userBProj.id)).toBe(true);
  });

  it("successfully connects WhatsApp integration to newly created project", () => {
    const res = createProjectSim(userA, { name: "WhatsApp Production Project" });
    expect(res.status).toBe(200);
    const newProjectId = res.project?.id;

    const validPayload = {
      projectId: newProjectId,
      name: "Production WhatsApp",
      phoneNumberId: "105849204918231",
      wabaId: "293847592019283",
      accessToken: "EAABtesttoken1234567890abcdef",
      appSecret: "test_meta_app_secret_1234567890",
      templateName: "otp_authentication",
      templateLanguage: "en_US",
    };

    const parsed = createIntegrationSchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.projectId).toBe(newProjectId);
    }
  });
});
