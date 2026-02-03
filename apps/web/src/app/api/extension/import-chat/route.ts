import { NextRequest, NextResponse } from "next/server";
import prisma from "@clickqaassist/db";
import type { ChatGuruMessage } from "@clickqaassist/api/services/chatguru";
import { parseChatGuruUrl } from "@clickqaassist/api/services/chatguru";

const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY;
const MAX_MESSAGES = 50000;
function getAllowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env.CORS_ORIGIN) origins.push(process.env.CORS_ORIGIN);
  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://localhost:3001");
  }
  return origins;
}

function corsHeaders(origin: string | null) {
  const allowed = getAllowedOrigins();
  const match = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": match ?? "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    if (!EXTENSION_API_KEY) {
      return NextResponse.json(
        { error: "EXTENSION_API_KEY não configurada no servidor" },
        { status: 500, headers },
      );
    }

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== EXTENSION_API_KEY) {
      return NextResponse.json(
        { error: "API key inválida" },
        { status: 401, headers },
      );
    }

    const body = await req.json();
    const { userEmail, chatUrl, messages } = body as {
      userEmail: string;
      chatUrl: string;
      messages: ChatGuruMessage[];
    };

    if (!userEmail || !chatUrl || !messages?.length) {
      return NextResponse.json(
        { error: "Campos obrigatórios: userEmail, chatUrl, messages" },
        { status: 400, headers },
      );
    }

    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Máximo de ${MAX_MESSAGES} mensagens por importação` },
        { status: 400, headers },
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: userEmail, role: { in: ["admin", "leader"] } },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuário não encontrado ou sem permissão (precisa ser admin/leader)" },
        { status: 403, headers },
      );
    }

    const chatGuruId = parseChatGuruUrl(chatUrl);

    const uniqueAgentNames = [
      ...new Set(
        messages
          .map((msg) => msg.agentName)
          .filter((name): name is string => name !== null && name !== ""),
      ),
    ];

    const agents = await prisma.user.findMany({
      where: {
        OR: [
          { chatGuruName: { in: uniqueAgentNames } },
          { name: { in: uniqueAgentNames } },
        ],
      },
    });

    const agentMap = new Map<string, string>();
    for (const agent of agents) {
      if (agent.chatGuruName) agentMap.set(agent.chatGuruName, agent.id);
      agentMap.set(agent.name, agent.id);
    }

    const firstMsg = messages[0]!;

    const result = await prisma.$transaction(async (tx) => {
      const existingChat = await tx.chat.findUnique({
        where: { chatGuruId },
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

        await tx.chat.delete({ where: { id: existingChat.id } });
      }

      const newChat = await tx.chat.create({
        data: {
          chatGuruId,
          chatGuruStatus: firstMsg.chatStatus,
          chatGuruUrl: firstMsg.chatUrl,
          patientName: firstMsg.leadName,
          patientPhone: firstMsg.leadPhone,
          importedById: user.id,
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

      return { chat: newChat, isExisting: !!existingChat, feedbacksRestored: previousFeedbacksByMessageId.size };
    });

    return NextResponse.json(
      {
        success: true,
        chatId: result.chat.id,
        totalMessages: result.chat.totalMessages,
        isExisting: result.isExisting,
        feedbacksRestored: result.feedbacksRestored,
      },
      { status: 200, headers },
    );
  } catch (error) {
    console.error("[Extension Import]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500, headers },
    );
  }
}
