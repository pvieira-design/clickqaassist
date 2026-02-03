import { router, adminProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";
import {
  getVectorStoreStats,
  uploadCorrection,
  removeCorrection,
  type CorrectionData,
} from "../services/vector-store";

const configKeySchema = z.enum(["system_prompt", "calibration_examples"]);

export const aiSettingsRouter = router({
  getConfig: adminProcedure
    .input(z.object({ key: configKeySchema }))
    .query(async ({ input }) => {
      const config = await prisma.aiConfig.findUnique({
        where: { key: input.key },
        include: { updatedBy: { select: { name: true } } },
      });
      return config;
    }),

  getAllConfigs: adminProcedure.query(async () => {
    return prisma.aiConfig.findMany({
      include: { updatedBy: { select: { name: true } } },
      orderBy: { key: "asc" },
    });
  }),

  updateConfig: adminProcedure
    .input(
      z.object({
        key: configKeySchema,
        value: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return prisma.aiConfig.upsert({
        where: { key: input.key },
        update: {
          value: input.value,
          updatedById: ctx.session.user.id,
        },
        create: {
          key: input.key,
          value: input.value,
          updatedById: ctx.session.user.id,
        },
      });
    }),

  resetConfig: adminProcedure
    .input(z.object({ key: configKeySchema }))
    .mutation(async ({ input }) => {
      await prisma.aiConfig
        .delete({ where: { key: input.key } })
        .catch(() => {});
      return { success: true };
    }),

  vectorStoreStats: adminProcedure.query(async () => {
    return getVectorStoreStats();
  }),

  recentCorrections: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const corrections = await prisma.aiSuggestion.findMany({
        where: {
          outcome: { in: ["ACCEPTED", "EDITED", "REJECTED"] },
          vectorStoreFileId: { not: null },
        },
        orderBy: { resolvedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          outcome: true,
          suggestedFeedbackTypeName: true,
          suggestedCategory: true,
          reasoning: true,
          correctionNote: true,
          vectorStoreFileId: true,
          resolvedAt: true,
          message: { select: { text: true, agentName: true } },
          appliedFeedbackType: { select: { name: true } },
        },
      });

      const hasMore = corrections.length > input.limit;
      const items = hasMore ? corrections.slice(0, -1) : corrections;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return { items, nextCursor };
    }),

  removeCorrectionFromVectorStore: adminProcedure
    .input(z.object({ suggestionId: z.string() }))
    .mutation(async ({ input }) => {
      const suggestion = await prisma.aiSuggestion.findUniqueOrThrow({
        where: { id: input.suggestionId },
        select: { vectorStoreFileId: true },
      });

      if (!suggestion.vectorStoreFileId) {
        throw new Error("Correção não tem arquivo no vector store");
      }

      await removeCorrection(suggestion.vectorStoreFileId);

      await prisma.aiSuggestion.update({
        where: { id: input.suggestionId },
        data: { vectorStoreFileId: null },
      });

      return { success: true };
    }),

  backfillCorrections: adminProcedure.mutation(async () => {
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

  accuracyByFeedbackType: adminProcedure.query(async () => {
    const resolved = await prisma.aiSuggestion.findMany({
      where: { outcome: { not: "PENDING" } },
      select: {
        outcome: true,
        suggestedFeedbackTypeName: true,
      },
    });

    const byType = new Map<
      string,
      { total: number; accepted: number; edited: number; rejected: number }
    >();

    for (const s of resolved) {
      const name = s.suggestedFeedbackTypeName;
      if (!byType.has(name)) {
        byType.set(name, { total: 0, accepted: 0, edited: 0, rejected: 0 });
      }
      const entry = byType.get(name)!;
      entry.total++;
      if (s.outcome === "ACCEPTED") entry.accepted++;
      if (s.outcome === "EDITED") entry.edited++;
      if (s.outcome === "REJECTED") entry.rejected++;
    }

    return Array.from(byType.entries())
      .map(([name, stats]) => ({
        feedbackTypeName: name,
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
      }))
      .sort((a, b) => b.total - a.total);
  }),

  topRejectionReasons: adminProcedure.query(async () => {
    const rejected = await prisma.aiSuggestion.findMany({
      where: {
        outcome: "REJECTED",
        correctionNote: { not: null },
      },
      select: {
        correctionNote: true,
        suggestedFeedbackTypeName: true,
      },
      orderBy: { resolvedAt: "desc" },
      take: 50,
    });

    return rejected.map((r) => ({
      reason: r.correctionNote!,
      suggestedType: r.suggestedFeedbackTypeName,
    }));
  }),
});
