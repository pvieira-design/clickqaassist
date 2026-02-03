import { router, leaderProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";
import { analyzeChatWithAI, type AnalysisMode } from "../services/openai";
import {
  uploadCorrection,
  getVectorStoreStats,
  type CorrectionData,
} from "../services/vector-store";

export const aiRouter = router({
  analyzeChat: leaderProcedure
    .input(
      z.object({
        chatId: z.string(),
        mode: z
          .enum(["ALL", "POSITIVE", "NEUTRAL", "NEGATIVE"])
          .default("ALL"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const chat = await prisma.chat.findUniqueOrThrow({
        where: { id: input.chatId },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
          },
        },
      });

      const feedbackTypes = await prisma.feedbackType.findMany({
        where: { isActive: true },
      });

      const result = await analyzeChatWithAI(
        chat.messages.map((msg) => ({
          id: msg.id,
          direction: msg.direction,
          agentName: msg.agentName,
          text: msg.text,
          messageType: msg.messageType,
          timestamp: msg.timestamp,
          isTemplate: msg.isTemplate,
          isDeleted: msg.isDeleted,
        })),
        feedbackTypes.map((ft) => ({
          id: ft.id,
          name: ft.name,
          category: ft.category,
          points: ft.points,
        })),
        chat.patientName,
        input.mode as AnalysisMode,
      );

      const analysis = await prisma.aiAnalysis.create({
        data: {
          chatId: input.chatId,
          requestedById: ctx.session.user.id,
          prompt: result.prompt,
          rawResponse: result.rawResponse,
          totalSuggestions: result.suggestions.length,
          analysisMode: input.mode,
          suggestions: {
            create: result.suggestions.map((s) => ({
              messageId: s.messageId,
              suggestedFeedbackTypeId: s.feedbackTypeId || null,
              suggestedFeedbackTypeName: s.feedbackTypeName,
              suggestedCategory: s.category,
              reasoning: s.reasoning,
              suggestedComment: s.comment,
            })),
          },
        },
        include: {
          suggestions: true,
        },
      });

      return {
        analysisId: analysis.id,
        mode: input.mode,
        suggestions: analysis.suggestions.map((s) => ({
          id: s.id,
          messageId: s.messageId,
          feedbackTypeName: s.suggestedFeedbackTypeName,
          feedbackTypeId: s.suggestedFeedbackTypeId,
          category: s.suggestedCategory,
          reasoning: s.reasoning,
          comment: s.suggestedComment,
        })),
      };
    }),

  resolveSuggestion: leaderProcedure
    .input(
      z.object({
        suggestionId: z.string(),
        outcome: z.enum(["ACCEPTED", "EDITED", "REJECTED"]),
        correctionNote: z.string().optional(),
        appliedFeedbackTypeId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const updated = await prisma.aiSuggestion.update({
        where: { id: input.suggestionId },
        data: {
          outcome: input.outcome,
          correctionNote: input.correctionNote || null,
          appliedFeedbackTypeId: input.appliedFeedbackTypeId || null,
          resolvedAt: new Date(),
        },
        include: {
          message: { select: { text: true, agentName: true } },
          suggestedFeedbackType: { select: { name: true, category: true } },
          appliedFeedbackType: { select: { name: true, category: true } },
        },
      });

      const correctionData: CorrectionData = {
        suggestionId: updated.id,
        outcome: input.outcome,
        messageText: updated.message.text,
        agentName: updated.message.agentName,
        suggestedFeedbackTypeName:
          updated.suggestedFeedbackType?.name ||
          updated.suggestedFeedbackTypeName,
        suggestedCategory: updated.suggestedCategory,
        reasoning: updated.reasoning,
        suggestedComment: updated.suggestedComment,
        correctionNote: updated.correctionNote,
        appliedFeedbackTypeName: updated.appliedFeedbackType?.name || null,
        appliedCategory: updated.appliedFeedbackType?.category || null,
        resolvedAt: updated.resolvedAt || new Date(),
      };

      uploadCorrection(correctionData).then((fileId) => {
        if (fileId) {
          prisma.aiSuggestion
            .update({
              where: { id: updated.id },
              data: { vectorStoreFileId: fileId },
            })
            .catch((err: unknown) => {
              console.error(
                "[ai-router] Failed to save vectorStoreFileId:",
                err,
              );
            });
        }
      });

      return updated;
    }),

  getAnalysis: leaderProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ input }) => {
      return prisma.aiAnalysis.findMany({
        where: { chatId: input.chatId },
        orderBy: { createdAt: "desc" },
        include: {
          requestedBy: { select: { name: true } },
          suggestions: {
            include: {
              suggestedFeedbackType: {
                select: { name: true, category: true, points: true },
              },
              appliedFeedbackType: {
                select: { name: true, category: true, points: true },
              },
            },
          },
        },
      });
    }),

  accuracyStats: leaderProcedure.query(async () => {
    const resolved = await prisma.aiSuggestion.findMany({
      where: {
        outcome: { not: "PENDING" },
      },
      select: {
        outcome: true,
        suggestedCategory: true,
      },
    });

    const total = resolved.length;
    const accepted = resolved.filter((s) => s.outcome === "ACCEPTED").length;
    const edited = resolved.filter((s) => s.outcome === "EDITED").length;
    const rejected = resolved.filter((s) => s.outcome === "REJECTED").length;

    const byCategory = new Map<
      string,
      { total: number; accepted: number; edited: number; rejected: number }
    >();
    for (const s of resolved) {
      const cat = s.suggestedCategory;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, { total: 0, accepted: 0, edited: 0, rejected: 0 });
      }
      const entry = byCategory.get(cat)!;
      entry.total++;
      if (s.outcome === "ACCEPTED") entry.accepted++;
      if (s.outcome === "EDITED") entry.edited++;
      if (s.outcome === "REJECTED") entry.rejected++;
    }

    const categoryStats = Object.fromEntries(
      Array.from(byCategory.entries()).map(([cat, stats]) => [
        cat,
        {
          ...stats,
          accuracyRate:
            stats.total > 0
              ? Math.round((stats.accepted / stats.total) * 100)
              : 0,
          usefulRate:
            stats.total > 0
              ? Math.round(
                  ((stats.accepted + stats.edited) / stats.total) * 100,
                )
              : 0,
        },
      ]),
    );

    const vectorStoreInfo = await getVectorStoreStats();

    return {
      total,
      accepted,
      edited,
      rejected,
      accuracyRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
      usefulRate:
        total > 0 ? Math.round(((accepted + edited) / total) * 100) : 0,
      categoryStats,
      vectorStore: vectorStoreInfo,
    };
  }),

  backfillCorrections: leaderProcedure.mutation(async () => {
    const unsynced = await prisma.aiSuggestion.findMany({
      where: {
        outcome: { in: ["ACCEPTED", "EDITED", "REJECTED"] },
        vectorStoreFileId: null,
      },
      include: {
        message: { select: { text: true, agentName: true } },
        suggestedFeedbackType: { select: { name: true, category: true } },
        appliedFeedbackType: { select: { name: true, category: true } },
      },
    });

    let synced = 0;
    let failed = 0;

    for (const suggestion of unsynced) {
      const correctionData: CorrectionData = {
        suggestionId: suggestion.id,
        outcome: suggestion.outcome as "ACCEPTED" | "EDITED" | "REJECTED",
        messageText: suggestion.message.text,
        agentName: suggestion.message.agentName,
        suggestedFeedbackTypeName:
          suggestion.suggestedFeedbackType?.name ||
          suggestion.suggestedFeedbackTypeName,
        suggestedCategory: suggestion.suggestedCategory,
        reasoning: suggestion.reasoning,
        suggestedComment: suggestion.suggestedComment,
        correctionNote: suggestion.correctionNote,
        appliedFeedbackTypeName:
          suggestion.appliedFeedbackType?.name || null,
        appliedCategory: suggestion.appliedFeedbackType?.category || null,
        resolvedAt: suggestion.resolvedAt || new Date(),
      };

      const fileId = await uploadCorrection(correctionData);
      if (fileId) {
        await prisma.aiSuggestion.update({
          where: { id: suggestion.id },
          data: { vectorStoreFileId: fileId },
        });
        synced++;
      } else {
        failed++;
      }
    }

    return { total: unsynced.length, synced, failed };
  }),
});
