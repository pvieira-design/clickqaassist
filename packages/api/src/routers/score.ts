import { router, adminProcedure, leaderProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";

export const scoreRouter = router({
  byAgent: leaderProcedure
    .input(
      z.object({
        agentId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 1);

      const feedbacks = await prisma.feedback.findMany({
        where: {
          agentId: input.agentId,
          deletedAt: null,
          createdAt: { gte: startDate, lt: endDate },
        },
        include: { feedbackType: true },
      });

      const agent = await prisma.user.findUnique({
        where: { id: input.agentId },
        select: { name: true },
      });

      const grouped = new Map<
        string,
        { name: string; category: string; points: number; count: number }
      >();
      let totalPoints = 0;
      let positiveCount = 0;
      let neutralCount = 0;
      let negativeCount = 0;

      for (const fb of feedbacks) {
        const key = fb.feedbackTypeId;
        const existing = grouped.get(key);
        if (existing) {
          existing.count++;
        } else {
          grouped.set(key, {
            name: fb.feedbackType.name,
            category: fb.feedbackType.category,
            points: fb.feedbackType.points,
            count: 1,
          });
        }
        totalPoints += fb.feedbackType.points;
        if (fb.feedbackType.category === "POSITIVE") positiveCount++;
        else if (fb.feedbackType.category === "NEUTRAL") neutralCount++;
        else negativeCount++;
      }

      return {
        agentId: input.agentId,
        agentName: agent?.name ?? "Desconhecido",
        month: input.month,
        year: input.year,
        totalPoints,
        positiveCount,
        neutralCount,
        negativeCount,
        totalFeedbacks: feedbacks.length,
        feedbacks: [...grouped.values()],
      };
    }),

  ranking: leaderProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        departmentId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 1);

      const where = {
        deletedAt: null as null,
        createdAt: { gte: startDate, lt: endDate },
        agentId: { not: null as null },
        ...(input.departmentId
          ? { agent: { departmentId: input.departmentId } }
          : {}),
      };

      const feedbacks = await prisma.feedback.findMany({
        where,
        include: {
          feedbackType: true,
          agent: {
            select: {
              id: true,
              name: true,
              department: { select: { name: true } },
            },
          },
        },
      });

      const agentMap = new Map<
        string,
        {
          agentId: string;
          agentName: string;
          departmentName: string;
          totalPoints: number;
          positiveCount: number;
          neutralCount: number;
          negativeCount: number;
          totalFeedbacks: number;
        }
      >();

      for (const fb of feedbacks) {
        if (!fb.agentId || !fb.agent) continue;
        const existing = agentMap.get(fb.agentId);
        const points = fb.feedbackType.points;
        const cat = fb.feedbackType.category;
        if (existing) {
          existing.totalPoints += points;
          existing.totalFeedbacks++;
          if (cat === "POSITIVE") existing.positiveCount++;
          else if (cat === "NEUTRAL") existing.neutralCount++;
          else existing.negativeCount++;
        } else {
          agentMap.set(fb.agentId, {
            agentId: fb.agentId,
            agentName: fb.agent.name,
            departmentName: fb.agent.department?.name ?? "\u2014",
            totalPoints: points,
            positiveCount: cat === "POSITIVE" ? 1 : 0,
            neutralCount: cat === "NEUTRAL" ? 1 : 0,
            negativeCount: cat === "NEGATIVE" ? 1 : 0,
            totalFeedbacks: 1,
          });
        }
      }

      return [...agentMap.values()].sort(
        (a, b) => b.totalPoints - a.totalPoints,
      );
    }),

  summary: adminProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 1);

      const feedbacks = await prisma.feedback.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: startDate, lt: endDate },
          agentId: { not: null },
        },
        include: {
          feedbackType: true,
          agent: { select: { id: true, name: true } },
        },
      });

      const agentScores = new Map<
        string,
        { name: string; totalPoints: number }
      >();

      for (const fb of feedbacks) {
        if (!fb.agentId || !fb.agent) continue;
        const existing = agentScores.get(fb.agentId);
        if (existing) {
          existing.totalPoints += fb.feedbackType.points;
        } else {
          agentScores.set(fb.agentId, {
            name: fb.agent.name,
            totalPoints: fb.feedbackType.points,
          });
        }
      }

      const agents = [...agentScores.values()];
      const totalAgentsEvaluated = agents.length;
      const totalFeedbacks = feedbacks.length;
      const totalPoints = agents.reduce((sum, a) => sum + a.totalPoints, 0);
      const averageScore =
        totalAgentsEvaluated > 0
          ? Math.round(totalPoints / totalAgentsEvaluated)
          : 0;

      const sorted = agents.sort((a, b) => b.totalPoints - a.totalPoints);

      let topAgent: { name: string; score: number } | null = null;
      let bottomAgent: { name: string; score: number } | null = null;

      if (sorted.length > 0) {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        if (first) {
          topAgent = { name: first.name, score: first.totalPoints };
        }
        if (last) {
          bottomAgent = { name: last.name, score: last.totalPoints };
        }
      }

      return {
        totalFeedbacks,
        totalAgentsEvaluated,
        averageScore,
        topAgent,
        bottomAgent,
      };
    }),

  chatsWithFeedbacks: leaderProcedure
    .input(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number(),
        departmentId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 1);

      const feedbacks = await prisma.feedback.findMany({
        where: {
          deletedAt: null,
          createdAt: { gte: startDate, lt: endDate },
          ...(input.departmentId
            ? { agent: { departmentId: input.departmentId } }
            : {}),
        },
        include: {
          feedbackType: true,
          registeredBy: { select: { name: true } },
          agent: { select: { name: true } },
          message: {
            select: {
              text: true,
              agentName: true,
              chat: {
                select: {
                  id: true,
                  patientName: true,
                  patientPhone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const chatMap = new Map<
        string,
        {
          chatId: string;
          patientName: string;
          patientPhone: string | null;
          positiveCount: number;
          neutralCount: number;
          negativeCount: number;
          totalFeedbacks: number;
          feedbacks: Array<{
            id: string;
            feedbackTypeName: string;
            category: string;
            points: number;
            agentName: string;
            registeredByName: string;
            comment: string | null;
            messageExcerpt: string;
            createdAt: Date;
          }>;
        }
      >();

      for (const fb of feedbacks) {
        const chatId = fb.message.chat.id;
        const cat = fb.feedbackType.category;
        const feedbackDetail = {
          id: fb.id,
          feedbackTypeName: fb.feedbackType.name,
          category: fb.feedbackType.category,
          points: fb.feedbackType.points,
          agentName: fb.agent?.name ?? fb.message.agentName ?? "—",
          registeredByName: fb.registeredBy.name,
          comment: fb.comment,
          messageExcerpt:
            fb.message.text.length > 120
              ? fb.message.text.slice(0, 120) + "..."
              : fb.message.text,
          createdAt: fb.createdAt,
        };

        const existing = chatMap.get(chatId);
        if (existing) {
          existing.totalFeedbacks++;
          if (cat === "POSITIVE") existing.positiveCount++;
          else if (cat === "NEUTRAL") existing.neutralCount++;
          else existing.negativeCount++;
          existing.feedbacks.push(feedbackDetail);
        } else {
          chatMap.set(chatId, {
            chatId,
            patientName: fb.message.chat.patientName ?? "Paciente não identificado",
            patientPhone: fb.message.chat.patientPhone,
            positiveCount: cat === "POSITIVE" ? 1 : 0,
            neutralCount: cat === "NEUTRAL" ? 1 : 0,
            negativeCount: cat === "NEGATIVE" ? 1 : 0,
            totalFeedbacks: 1,
            feedbacks: [feedbackDetail],
          });
        }
      }

      return [...chatMap.values()];
    }),
});
