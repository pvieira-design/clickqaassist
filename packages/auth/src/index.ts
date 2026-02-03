import prisma from "@clickqaassist/db";
import { env } from "@clickqaassist/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, customSession } from "better-auth/plugins";
import { APIError } from "better-auth/api";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [env.CORS_ORIGIN],

  emailAndPassword: {
    enabled: true,
  },

  user: {
    additionalFields: {
      departmentId: {
        type: "string",
        required: false,
        input: false,
      },
      chatGuruName: {
        type: "string",
        required: false,
        input: false,
      },
      externalUserId: {
        type: "string",
        required: false,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: false,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (_user, ctx) => {
          // Block public sign-up — only admin can create users via admin API
          // Check if request comes from admin plugin (has x-admin-request header or internal call)
          const isInternalCall = ctx?.request?.headers?.get?.("x-internal-seed") === "true";
          if (isInternalCall) return;

          // Allow if the request is from the admin plugin (setRole, createUser, etc.)
          // The admin plugin internally creates users, so we need to allow that
          // We check if there's an active admin session
          const session = ctx?.context?.session;
          if (session?.user?.role === "admin") return;

          // For seed script, allow creation (no request context)
          if (!ctx?.request) return;

          throw new APIError("FORBIDDEN", {
            message: "Cadastro público desabilitado. Contate o administrador.",
          });
        },
      },
    },
  },

  plugins: [
    nextCookies(),
    admin({
      defaultRole: "staff",
      adminRoles: ["admin"],
    }),
    customSession(async ({ user, session }) => {
      return {
        user,
        session,
      };
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
