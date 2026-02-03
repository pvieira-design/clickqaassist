import type { NextRequest } from "next/server";

import { auth } from "@clickqaassist/auth";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  role: string;
  banned: boolean | null;
  departmentId: string | null;
  chatGuruName: string | null;
  externalUserId: string | null;
  phone: string | null;
  isActive: boolean;
}

interface SessionData {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AppSession {
  user: SessionUser;
  session: SessionData;
}

export async function createContext(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return {
    session: session as AppSession | null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
