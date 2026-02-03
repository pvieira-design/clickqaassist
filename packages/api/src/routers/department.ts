import { router, adminProcedure, leaderProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";

export const departmentRouter = router({
  list: leaderProcedure.query(async () => {
    return prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { users: true } },
      },
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.department.create({
        data: { name: input.name },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Nome é obrigatório"),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.department.update({
        where: { id: input.id },
        data: { name: input.name },
      });
    }),
});
