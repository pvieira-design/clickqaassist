import { router, staffProcedure, leaderProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";
import { TRPCError } from "@trpc/server";
import {
  sendContestationNotification,
  sendResolutionNotification,
} from "../services/email";

export const contestationRouter = router({
  create: staffProcedure
    .input(
      z.object({
        feedbackId: z.string(),
        message: z.string().min(10, "Mensagem deve ter no mínimo 10 caracteres"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.feedbackId },
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
          message: "Sem permissão para contestar este feedback",
        });
      }

      if (feedback.status !== "READ" && feedback.status !== "ACKNOWLEDGED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas feedbacks lidos ou compreendidos podem ser contestados",
        });
      }

      const contestation = await prisma.$transaction(async (tx) => {
        const created = await tx.contestation.create({
          data: {
            feedbackId: input.feedbackId,
            messages: {
              create: {
                authorId: ctx.session.user.id,
                content: input.message,
              },
            },
          },
          include: {
            messages: {
              include: {
                author: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        await tx.feedback.update({
          where: { id: input.feedbackId },
          data: { status: "CONTESTED" },
        });

        return created;
      });

      // Fire-and-forget: notify leader about contestation
      prisma.feedback
        .findUnique({
          where: { id: input.feedbackId },
          include: {
            registeredBy: { select: { email: true, name: true } },
            feedbackType: { select: { name: true } },
            agent: { select: { name: true } },
          },
        })
        .then((fb) => {
          if (fb?.registeredBy?.email) {
            sendContestationNotification({
              leaderEmail: fb.registeredBy.email,
              leaderName: fb.registeredBy.name,
              agentName: fb.agent?.name ?? "Atendente",
              feedbackTypeName: fb.feedbackType.name,
              contestationMessage: input.message,
            }).catch(() => {});
          }
        })
        .catch(() => {});

      return contestation;
    }),

  addMessage: staffProcedure
    .input(
      z.object({
        contestationId: z.string(),
        content: z.string().min(1, "Mensagem não pode ser vazia"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const contestation = await prisma.contestation.findUnique({
        where: { id: input.contestationId },
        include: {
          feedback: { select: { agentId: true, registeredById: true } },
        },
      });

      if (!contestation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contestação não encontrada",
        });
      }

      if (contestation.resolvedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Contestação já foi resolvida",
        });
      }

      const userId = ctx.session.user.id;
      const role = ctx.session.user.role;
      const isAgent = contestation.feedback.agentId === userId;
      const isRegisteredBy = contestation.feedback.registeredById === userId;
      const isAdmin = role === "admin";

      if (!isAgent && !isRegisteredBy && !isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sem permissão para enviar mensagem nesta contestação",
        });
      }

      return prisma.contestationMessage.create({
        data: {
          contestationId: input.contestationId,
          authorId: userId,
          content: input.content,
        },
        include: {
          author: { select: { name: true } },
        },
      });
    }),

  resolve: leaderProcedure
    .input(
      z.object({
        contestationId: z.string(),
        resolution: z.enum(["MAINTAINED", "CHANGED", "REMOVED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const contestation = await prisma.contestation.findUnique({
        where: { id: input.contestationId },
        include: { feedback: { select: { id: true } } },
      });

      if (!contestation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contestação não encontrada",
        });
      }

      if (contestation.resolvedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Contestação já foi resolvida",
        });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const resolved = await tx.contestation.update({
          where: { id: input.contestationId },
          data: {
            resolvedAt: new Date(),
            resolvedById: ctx.session.user.id,
            resolution: input.resolution,
          },
        });

        await tx.feedback.update({
          where: { id: contestation.feedback.id },
          data: { status: "RESOLVED" },
        });

        if (input.resolution === "REMOVED") {
          await tx.feedback.update({
            where: { id: contestation.feedback.id },
            data: { deletedAt: new Date() },
          });
        }

        return resolved;
      });

      // Fire-and-forget: notify agent about resolution
      prisma.feedback
        .findUnique({
          where: { id: contestation.feedback.id },
          include: {
            agent: { select: { email: true, name: true } },
            feedbackType: { select: { name: true } },
          },
        })
        .then((fb) => {
          if (fb?.agent?.email) {
            sendResolutionNotification({
              agentEmail: fb.agent.email,
              agentName: fb.agent.name,
              feedbackTypeName: fb.feedbackType.name,
              resolution: input.resolution,
            }).catch(() => {});
          }
        })
        .catch(() => {});

      return updated;
    }),

  getByFeedback: staffProcedure
    .input(z.object({ feedbackId: z.string() }))
    .query(async ({ ctx, input }) => {
      const feedback = await prisma.feedback.findUnique({
        where: { id: input.feedbackId },
        select: { agentId: true },
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
          message: "Sem permissão para visualizar esta contestação",
        });
      }

      return prisma.contestation.findUnique({
        where: { feedbackId: input.feedbackId },
        include: {
          messages: {
            include: {
              author: { select: { name: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }),
});
