import { router, adminProcedure, leaderProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";

export const feedbackTypeRouter = router({
  list: leaderProcedure.query(async () => {
    return prisma.feedbackType.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }),

  listAll: adminProcedure.query(async () => {
    return prisma.feedbackType.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        category: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
        points: z.number().int("Pontos deve ser número inteiro"),
      }),
    )
    .mutation(async ({ input }) => {
      return prisma.feedbackType.create({
        data: {
          name: input.name,
          category: input.category,
          points: input.points,
        },
      });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Nome é obrigatório").optional(),
        category: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]).optional(),
        points: z.number().int("Pontos deve ser número inteiro").optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.feedbackType.update({
        where: { id },
        data,
      });
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const feedbackType = await prisma.feedbackType.findUniqueOrThrow({
        where: { id: input.id },
      });
      return prisma.feedbackType.update({
        where: { id: input.id },
        data: { isActive: !feedbackType.isActive },
      });
    }),
});
