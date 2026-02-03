import { router, leaderProcedure } from "../index";
import prisma from "@clickqaassist/db";
import z from "zod";
import { parseChatGuruUrl, fetchChatExport } from "../services/chatguru";

export const chatRouter = router({
  import: leaderProcedure
    .input(z.object({ url: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const chatId = parseChatGuruUrl(input.url);

      const existingChat = await prisma.chat.findUnique({
        where: { chatGuruId: chatId },
        include: {
          messages: {
            include: {
              feedbacks: {
                where: { deletedAt: null },
                include: {
                  contestation: {
                    include: { messages: true },
                  },
                },
              },
            },
          },
        },
      });

      const previousFeedbacksByMessageId = new Map<
        string,
        Array<{
          feedbackTypeId: string;
          agentId: string | null;
          registeredById: string;
          comment: string | null;
          status: "PENDING" | "READ" | "ACKNOWLEDGED" | "CONTESTED" | "RESOLVED";
          readAt: Date | null;
          acknowledgedAt: Date | null;
          createdAt: Date;
          contestation: {
            resolvedAt: Date | null;
            resolvedById: string | null;
            resolution: "MAINTAINED" | "CHANGED" | "REMOVED" | null;
            createdAt: Date;
            messages: Array<{
              authorId: string;
              content: string;
              createdAt: Date;
            }>;
          } | null;
        }>
      >();

      if (existingChat) {
        for (const msg of existingChat.messages) {
          if (msg.feedbacks.length > 0) {
            previousFeedbacksByMessageId.set(
              msg.chatGuruMessageId,
              msg.feedbacks.map((fb) => ({
                feedbackTypeId: fb.feedbackTypeId,
                agentId: fb.agentId,
                registeredById: fb.registeredById,
                comment: fb.comment,
                status: fb.status,
                readAt: fb.readAt,
                acknowledgedAt: fb.acknowledgedAt,
                createdAt: fb.createdAt,
                contestation: fb.contestation
                  ? {
                      resolvedAt: fb.contestation.resolvedAt,
                      resolvedById: fb.contestation.resolvedById,
                      resolution: fb.contestation.resolution,
                      createdAt: fb.contestation.createdAt,
                      messages: fb.contestation.messages.map((cm) => ({
                        authorId: cm.authorId,
                        content: cm.content,
                        createdAt: cm.createdAt,
                      })),
                    }
                  : null,
              })),
            );
          }
        }

        await prisma.chat.delete({ where: { id: existingChat.id } });
      }

      const messages = await fetchChatExport(chatId);

      if (messages.length === 0) {
        throw new Error("Nenhuma mensagem encontrada para este chat");
      }

      const firstMsg = messages[0]!;

      const uniqueAgentNames = [
        ...new Set(
          messages
            .map((msg) => msg.agentName)
            .filter((name): name is string => name !== null && name !== ""),
        ),
      ];

      const agents = await prisma.user.findMany({
        where: { chatGuruName: { in: uniqueAgentNames } },
      });

      const agentMap = new Map(
        agents.map((agent) => [agent.chatGuruName, agent.id]),
      );

      const chat = await prisma.$transaction(async (tx) => {
        const newChat = await tx.chat.create({
          data: {
            chatGuruId: chatId,
            chatGuruStatus: firstMsg.chatStatus,
            chatGuruUrl: firstMsg.chatUrl,
            patientName: firstMsg.leadName,
            patientPhone: firstMsg.leadPhone,
            importedById: ctx.session.user.id,
            totalMessages: messages.length,
            messages: {
              create: messages.map((msg) => ({
                chatGuruMessageId: msg.messageId,
                direction: msg.direction === "patient" ? "PATIENT" as const : "AGENT" as const,
                agentName: msg.agentName,
                agentId: msg.agentName ? agentMap.get(msg.agentName) ?? null : null,
                text: msg.text || "",
                messageType: msg.messageType,
                isTemplate: msg.isTemplate,
                templateName: msg.templateName,
                timestamp: new Date(msg.timestamp),
                isDeleted: msg.deleted,
                wasTranscribed: msg.transcribed,
              })),
            },
          },
          include: { messages: true },
        });

        if (previousFeedbacksByMessageId.size > 0) {
          const newMessageMap = new Map(
            newChat.messages.map((m) => [m.chatGuruMessageId, m.id]),
          );

          for (const [chatGuruMessageId, feedbacks] of previousFeedbacksByMessageId) {
            const newMessageId = newMessageMap.get(chatGuruMessageId);
            if (!newMessageId) continue;

            for (const fb of feedbacks) {
              const newFeedback = await tx.feedback.create({
                data: {
                  messageId: newMessageId,
                  feedbackTypeId: fb.feedbackTypeId,
                  agentId: fb.agentId,
                  registeredById: fb.registeredById,
                  comment: fb.comment,
                  status: fb.status,
                  readAt: fb.readAt,
                  acknowledgedAt: fb.acknowledgedAt,
                  createdAt: fb.createdAt,
                },
              });

              if (fb.contestation) {
                await tx.contestation.create({
                  data: {
                    feedbackId: newFeedback.id,
                    resolvedAt: fb.contestation.resolvedAt,
                    resolvedById: fb.contestation.resolvedById,
                    resolution: fb.contestation.resolution,
                    createdAt: fb.contestation.createdAt,
                    messages: {
                      create: fb.contestation.messages.map((cm) => ({
                        authorId: cm.authorId,
                        content: cm.content,
                        createdAt: cm.createdAt,
                      })),
                    },
                  },
                });
              }
            }
          }
        }

        return newChat;
      });

      return { chat, isExisting: !!existingChat };
    }),

  list: leaderProcedure
    .input(z.object({ departmentId: z.string().optional() }).optional())
    .query(async ({ input, ctx }) => {
      const role = ctx.session.user.role;
      const userId = ctx.session.user.id;

      const where =
        role === "admin"
          ? input?.departmentId
            ? { importedBy: { departmentId: input.departmentId } }
            : {}
          : { importedById: userId };

      return prisma.chat.findMany({
        where,
        orderBy: { importedAt: "desc" },
        include: {
          importedBy: { select: { name: true } },
          _count: { select: { messages: true } },
        },
      });
    }),

  getById: leaderProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.chat.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          messages: {
            orderBy: { timestamp: "asc" },
            include: {
              feedbacks: {
                where: { deletedAt: null },
                include: {
                  feedbackType: true,
                  registeredBy: { select: { name: true } },
                },
              },
              agent: { select: { id: true, name: true } },
            },
          },
          importedBy: { select: { name: true } },
        },
      });
    }),
});
