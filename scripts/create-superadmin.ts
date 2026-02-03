import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/db/prisma/generated/client.js";
import { hashPassword } from "better-auth/crypto";
import crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config({ path: "./apps/web/.env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "superadmin@clickcannabis.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Superadmin already exists:", existing.id);
    await prisma.$disconnect();
    return;
  }

  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const hashedPassword = await hashPassword("super123");

  await prisma.user.create({
    data: {
      id: userId,
      name: "Super Admin",
      email,
      emailVerified: false,
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.account.create({
    data: {
      id: accountId,
      accountId: userId,
      providerId: "credential",
      userId: userId,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log("Superadmin created successfully!");
  console.log("  Email: superadmin@clickcannabis.com");
  console.log("  Password: super123");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
