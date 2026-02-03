import { NextRequest, NextResponse } from "next/server";
import prisma from "@clickqaassist/db";
import { parseChatGuruUrl } from "@clickqaassist/api/services/chatguru";

const EXTENSION_API_KEY = process.env.EXTENSION_API_KEY;

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
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  try {
    if (!EXTENSION_API_KEY) {
      return NextResponse.json({ error: "EXTENSION_API_KEY não configurada" }, { status: 500, headers });
    }

    const apiKey = req.headers.get("x-api-key");
    if (!apiKey || apiKey !== EXTENSION_API_KEY) {
      return NextResponse.json({ error: "API key inválida" }, { status: 401, headers });
    }

    const body = await req.json();
    const { userEmail, chatUrl, chatGuruMessageId, feedbackTypeId, comment, agentName } = body as {
      userEmail: string;
      chatUrl: string;
      chatGuruMessageId: string;
      feedbackTypeId: string;
      comment?: string;
      agentName?: string;
    };

    if (!userEmail || !chatUrl || !chatGuruMessageId || !feedbackTypeId) {
      return NextResponse.json(
        { error: "Campos obrigatórios: userEmail, chatUrl, chatGuruMessageId, feedbackTypeId" },
        { status: 400, headers },
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: userEmail, role: { in: ["admin", "leader"] } },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuário sem permissão" }, { status: 403, headers });
    }

    const chatGuruId = parseChatGuruUrl(chatUrl);

    const chat = await prisma.chat.findUnique({
      where: { chatGuruId },
      select: { id: true },
    });
    if (!chat) {
      return NextResponse.json(
        { error: "Chat não importado. Importe o chat primeiro." },
        { status: 404, headers },
      );
    }

    const message = await prisma.message.findFirst({
      where: { chatId: chat.id, chatGuruMessageId },
      select: { id: true, agentId: true, agentName: true },
    });
    if (!message) {
      return NextResponse.json(
        { error: "Mensagem não encontrada neste chat" },
        { status: 404, headers },
      );
    }

    let resolvedAgentId = message.agentId;

    if (!resolvedAgentId) {
      const nameToMatch = agentName || message.agentName;
      if (nameToMatch) {
        const matchedAgent = await prisma.user.findFirst({
          where: {
            OR: [
              { chatGuruName: nameToMatch },
              { name: nameToMatch },
            ],
          },
          select: { id: true },
        });
        if (matchedAgent) {
          resolvedAgentId = matchedAgent.id;
          await prisma.message.update({
            where: { id: message.id },
            data: { agentId: resolvedAgentId },
          });
        }
      }
    }

    const feedbackType = await prisma.feedbackType.findUnique({
      where: { id: feedbackTypeId },
    });
    if (!feedbackType || !feedbackType.isActive) {
      return NextResponse.json({ error: "Tipo de feedback inválido" }, { status: 400, headers });
    }

    const feedback = await prisma.feedback.create({
      data: {
        messageId: message.id,
        feedbackTypeId,
        agentId: resolvedAgentId,
        registeredById: user.id,
        comment: comment || null,
        status: "PENDING",
      },
      include: {
        feedbackType: { select: { name: true, category: true, points: true } },
      },
    });

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        feedbackTypeName: feedback.feedbackType.name,
        category: feedback.feedbackType.category,
        points: feedback.feedbackType.points,
      },
    }, { headers });
  } catch (error) {
    console.error("[Extension CreateFeedback]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500, headers },
    );
  }
}
