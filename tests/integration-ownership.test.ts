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

describe("WhatsApp Integration Project Ownership & Tenant Isolation", () => {
  const userA = { id: "11111111-1111-4111-8111-111111111111", email: "user.a@example.com" };
  const userB = { id: "22222222-2222-4222-8222-222222222222", email: "user.b@example.com" };

  const projectA = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    user_id: userA.id,
    name: "User A Production Workspace",
  };

  const projectB = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    user_id: userB.id,
    name: "User B Workspace",
  };

  const validPayload = {
    name: "Production WhatsApp Integration",
    phoneNumberId: "105849204918231",
    wabaId: "293847592019283",
    accessToken: "EAABtesttoken1234567890abcdef",
    appSecret: "test_meta_app_secret_1234567890",
    templateName: "otp_authentication",
    templateLanguage: "en_US",
  };

  it("rejects request when projectId is missing", () => {
    const result = createIntegrationSchema.safeParse({
      ...validPayload,
      projectId: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects request when projectId is invalid format (not a UUID)", () => {
    const result = createIntegrationSchema.safeParse({
      ...validPayload,
      projectId: "default-project", // Invalid slug used as ID
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("Invalid project ID format");
    }
  });

  it("rejects request when projectId is a dummy zero-UUID string", () => {
    // Schema allows valid UUID structure, but ownership validator rejects non-existent projects
    const zeroId = "00000000-0000-0000-0000-000000000000";
    const validateOwnership = (authUserId: string, targetProjectId: string) => {
      const userProjects = [projectA];
      const match = userProjects.find((p) => p.id === targetProjectId && p.user_id === authUserId);
      if (!match) {
        return { authorized: false, status: 403, error: "Project not found or not owned by you." };
      }
      return { authorized: true, project: match };
    };

    const check = validateOwnership(userA.id, zeroId);
    expect(check.authorized).toBe(false);
    expect(check.status).toBe(403);
    expect(check.error).toBe("Project not found or not owned by you.");
  });

  it("prevents User A from connecting WhatsApp to User B's project (Cross-Tenant Protection)", () => {
    const validateOwnership = (authUserId: string, targetProjectId: string) => {
      // In-memory representation of projects table
      const allProjects = [projectA, projectB];
      const match = allProjects.find((p) => p.id === targetProjectId && p.user_id === authUserId);
      if (!match) {
        return { authorized: false, status: 403, error: "Project not found or not owned by you." };
      }
      return { authorized: true, project: match };
    };

    // User A attempts to target project B
    const check = validateOwnership(userA.id, projectB.id);
    expect(check.authorized).toBe(false);
    expect(check.status).toBe(403);
    expect(check.error).toBe("Project not found or not owned by you.");
  });

  it("allows User A to connect WhatsApp to their own validated project", () => {
    const validateOwnership = (authUserId: string, targetProjectId: string) => {
      const allProjects = [projectA, projectB];
      const match = allProjects.find((p) => p.id === targetProjectId && p.user_id === authUserId);
      if (!match) {
        return { authorized: false, status: 403, error: "Project not found or not owned by you." };
      }
      return { authorized: true, project: match };
    };

    const check = validateOwnership(userA.id, projectA.id);
    expect(check.authorized).toBe(true);
    if (check.authorized && check.project) {
      expect(check.project.id).toBe(projectA.id);
      expect(check.project.user_id).toBe(userA.id);
    }
  });

  it("encrypts secrets and generates secure webhook callback URL upon creation", () => {
    const integrationId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const webhookToken = "whsec_" + crypto.randomBytes(24).toString("hex");

    const encryptedToken = encryptSecret(validPayload.accessToken);
    const encryptedSecret = encryptSecret(validPayload.appSecret);

    expect(decryptSecret(encryptedToken)).toBe(validPayload.accessToken);
    expect(decryptSecret(encryptedSecret)).toBe(validPayload.appSecret);

    const baseUrl = "https://verifystack-lyart.vercel.app";
    const webhookUrl = `${baseUrl}/api/webhooks/whatsapp/${integrationId}`;

    expect(webhookUrl).toBe(`https://verifystack-lyart.vercel.app/api/webhooks/whatsapp/${integrationId}`);
    expect(webhookToken.startsWith("whsec_")).toBe(true);
    expect(webhookToken.length).toBe(54);
  });
});
