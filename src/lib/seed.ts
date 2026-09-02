import { getCollection, getMemoryCollection } from "./db";
import { hashPassword } from "./auth";
import { DEFAULT_PROVIDERS } from "./embed-router";
import { InviteCode, Provider, User } from "@/types";

declare global {
  // eslint-disable-next-line no-var
  var _dbBootstrapped: boolean | undefined;
}

export async function bootstrapDatabase(): Promise<{ message: string; adminCreated: boolean }> {
  if (global._dbBootstrapped) {
    return { message: "Database already initialized", adminCreated: false };
  }
  global._dbBootstrapped = true;

  let adminCreated = false;
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL;
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD;

  // 1. Check or seed Providers
  const providersCol = await getCollection<Provider>("providers");
  if (providersCol) {
    const count = await providersCol.countDocuments();
    if (count === 0) {
      await providersCol.insertMany(DEFAULT_PROVIDERS as any);
      console.log("[Bootstrap] Seeded default providers into MongoDB.");
    }
  } else {
    const memoryProviders = getMemoryCollection<Provider>("providers");
    if (memoryProviders.length === 0) {
      memoryProviders.push(...DEFAULT_PROVIDERS);
    }
  }

  // 2. Check or seed Admin User if credentials are provided
  if (adminEmail && adminPassword) {
    const usersCol = await getCollection<User>("users");
    if (usersCol) {
      const existingAdmin = await usersCol.findOne({ role: "admin" });
      if (!existingAdmin) {
        const passwordHash = await hashPassword(adminPassword);
        await usersCol.insertOne({
          email: adminEmail,
          username: adminEmail.split("@")[0] || "admin",
          passwordHash,
          role: "admin",
          preferences: {
            defaultSubtitleLang: "en",
            autoPlayNext: true,
            theme: "dark",
          },
          isDisabled: false,
          createdAt: new Date().toISOString(),
        } as any);
        adminCreated = true;
        console.log(`[Bootstrap] Created initial admin: ${adminEmail}`);
      }
    } else {
      const memoryUsers = getMemoryCollection<User>("users");
      const existingAdmin = memoryUsers.find((u) => u.role === "admin");
      if (!existingAdmin) {
        const passwordHash = await hashPassword(adminPassword);
        memoryUsers.push({
          _id: "admin-root-id",
          email: adminEmail,
          username: adminEmail.split("@")[0] || "admin",
          passwordHash,
          role: "admin",
          preferences: {
            defaultSubtitleLang: "en",
            autoPlayNext: true,
            theme: "dark",
          },
          isDisabled: false,
          createdAt: new Date().toISOString(),
        });
        adminCreated = true;
      }
    }
  }

  // 3. Seed starter invite codes
  const invitesCol = await getCollection<InviteCode>("invite_codes");
  const defaultCodes = ["VIP-ALPHA-2026", "STREAM-FREE-01", "CINEMA-PASS-99"];
  if (invitesCol) {
    const count = await invitesCol.countDocuments();
    if (count === 0) {
      await invitesCol.insertMany(
        defaultCodes.map((code) => ({
          code,
          createdBy: "system",
          status: "active",
          createdAt: new Date().toISOString(),
        })) as any
      );
      console.log("[Bootstrap] Seeded starter invite codes into MongoDB.");
    }
  } else {
    const memoryInvites = getMemoryCollection<InviteCode>("invite_codes");
    if (memoryInvites.length === 0) {
      memoryInvites.push(
        ...defaultCodes.map((code) => ({
          _id: `code-${code}`,
          code,
          createdBy: "system",
          status: "active" as const,
          createdAt: new Date().toISOString(),
        }))
      );
    }
  }

  return { message: "Database bootstrapped successfully", adminCreated };
}
