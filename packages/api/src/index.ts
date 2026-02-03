import { initTRPC, TRPCError } from "@trpc/server";

import type { Context } from "./context";

export type { AppSession, Context } from "./context";

export const t = initTRPC.context<Context>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Autenticação necessária",
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito a administradores",
    });
  }
  return next({ ctx });
});

export const leaderProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = ctx.session.user.role;
  if (role !== "admin" && role !== "leader") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso restrito a administradores e líderes",
    });
  }
  return next({ ctx });
});

export const staffProcedure = protectedProcedure;

export function assertDepartmentAccess(
  userRole: string | null | undefined,
  userDepartmentId: string | null | undefined,
  targetDepartmentId: string,
) {
  if (userRole === "admin") return;
  if (userRole === "leader" && userDepartmentId === targetDepartmentId) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Sem acesso a este departamento",
  });
}
