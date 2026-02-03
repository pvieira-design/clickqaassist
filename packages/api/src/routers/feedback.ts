import { router, staffProcedure, leaderProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";
import { TRPCError } from "@trpc/server";
import { sendFeedbackNotification } from "../services/email";

export const feedbackRouter = router({
  listByAgent: staffProcedure
    .input(
      z
        .object({
          agentId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const role = ctx.session.user.role;
      const userId = ctx.session.user.id;

      let agentId: string;

      if (role === "staff") {
        agentId = userId;
      } else {
        agentId = input?.agentId ?? userId;
      }

      return prisma.feedback.findMany({
        where: {
          agentId,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        include: {
          feedbackType: true,
          registeredBy: { select: { name: true } },
          message: {
            select: {
              id: true,
              text: true,
              agentName: true,
              timestamp: true,
              direction: true,
              chat: { select: { id: true, patientName: true } },
            },
          },
          contestation: { select: { id: true, resolution: true } },
        },
      });
    }),

  getById: staffProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.id },
        include: {
          feedbackType: true,
          registeredBy: { select: { name: true } },
          message: {
            select: {
              id: true,
              text: true,
              agentName: true,
              timestamp: true,
              direction: true,
              chat: { select: { id: true, patientName: true } },
            },
          },
          contestation: {
            select: {
              id: true,
              resolution: true,
              messages: {
                select: {
                  id: true,
                  content: true,
                  createdAt: true,
                  author: { select: { name: true } },
                },
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      });

      if (!feedback) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback não encontrado",
        });
      }

      const role = ctx.session.user.role;
      if (role === "staff" && feedback.agentId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para visualizar este feedback",
        });
      }

      return feedback;
    }),

  markAsRead: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.id },
      });

      if (!feedback) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback não encontrado",
        });
      }

      const role = ctx.session.user.role;
      if (role === "staff" && feedback.agentId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para alterar este feedback",
        });
      }

      if (feedback.status !== "PENDING") {
        return feedback;
      }

      return prisma.feedback.update({
        where: { id: input.id },
        data: {
          status: "READ",
          readAt: new Date(),
        },
      });
    }),

  acknowledge: staffProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.id },
      });

      if (!feedback) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback não encontrado",
        });
      }

      const role = ctx.session.user.role;
      if (role === "staff" && feedback.agentId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para alterar este feedback",
        });
      }

      if (feedback.status !== "READ") {
        return feedback;
      }

      return prisma.feedback.update({
        where: { id: input.id },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
        },
      });
    }),

  create: leaderProcedure
    .input(
      z.object({
        messageId: z.string(),
        feedbackTypeId: z.string(),
        agentId: z.string().nullable(),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const feedback = await prisma.feedback.create({
        data: {
          messageId: input.messageId,
          feedbackTypeId: input.feedbackTypeId,
          agentId: input.agentId,
          registeredById: ctx.session.user.id,
          comment: input.comment,
          status: "PENDING",
        },
        include: {
          feedbackType: true,
        },
      });

      // Fire-and-forget email notification
      if (input.agentId) {
        prisma.user
          .findUnique({
            where: { id: input.agentId },
            select: { email: true, name: true },
          })
          .then((agent) => {
            if (agent?.email) {
              sendFeedbackNotification({
                agentEmail: agent.email,
                agentName: agent.name,
                feedbackTypeName: feedback.feedbackType.name,
                category: feedback.feedbackType.category,
                points: feedback.feedbackType.points,
                comment: input.comment,
                evaluatorName: ctx.session.user.name,
              }).catch(() => {});
            }
          })
          .catch(() => {});
      }

      return feedback;
    }),

  update: leaderProcedure
    .input(
      z.object({
        id: z.string(),
        feedbackTypeId: z.string().optional(),
        comment: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.id },
      });

      if (!feedback) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback não encontrado",
        });
      }

      const role = ctx.session.user.role;
      if (role !== "admin" && feedback.registeredById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para alterar este feedback",
        });
      }

      return prisma.feedback.update({
        where: { id: input.id },
        data: {
          feedbackTypeId: input.feedbackTypeId,
          comment: input.comment,
        },
        include: {
          feedbackType: true,
        },
      });
    }),

  softDelete: leaderProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.id },
      });

      if (!feedback) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Feedback não encontrado",
        });
      }

      const role = ctx.session.user.role;
      if (role !== "admin" && feedback.registeredById !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para remover este feedback",
        });
      }

      return prisma.feedback.update({
        where: { id: input.id },
        data: {
          deletedAt: new Date(),
        },
      });
    }),

  listByChat: leaderProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ input }) => {
      return prisma.feedback.findMany({
        where: {
          deletedAt: null,
          message: {
            chatId: input.chatId,
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          feedbackType: true,
          registeredBy: { select: { name: true } },
          message: {
            select: {
              id: true,
              text: true,
            },
          },
        },
      });
    }),
});
