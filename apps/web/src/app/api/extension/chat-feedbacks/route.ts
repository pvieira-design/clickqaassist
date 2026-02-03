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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function GET(req: NextRequest) {
  const headers = corsHeaders(req.headers.get("origin"));

  if (!EXTENSION_API_KEY) {
    return NextResponse.json({ error: "EXTENSION_API_KEY não configurada" }, { status: 500, headers });
  }

  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== EXTENSION_API_KEY) {
    return NextResponse.json({ error: "API key inválida" }, { status: 401, headers });
  }

  const chatUrl = req.nextUrl.searchParams.get("chatUrl");
  if (!chatUrl) {
    return NextResponse.json({ error: "chatUrl obrigatório" }, { status: 400, headers });
  }

  const chatGuruId = parseChatGuruUrl(chatUrl);

  const chat = await prisma.chat.findUnique({
    where: { chatGuruId },
    select: {
      id: true,
      messages: {
        select: {
          chatGuruMessageId: true,
          feedbacks: {
            where: { deletedAt: null },
            select: {
              id: true,
              feedbackTypeId: true,
              comment: true,
              createdAt: true,
              feedbackType: { select: { name: true, category: true, points: true } },
              registeredBy: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  if (!chat) {
    return NextResponse.json({ imported: false, feedbacks: {} }, { headers });
  }

  const feedbacksByMessageId: Record<string, Array<{
    id: string;
    feedbackTypeId: string;
    feedbackTypeName: string;
    category: string;
    points: number;
    comment: string | null;
    registeredBy: string;
    createdAt: string;
  }>> = {};

  for (const msg of chat.messages) {
    if (msg.feedbacks.length > 0) {
      feedbacksByMessageId[msg.chatGuruMessageId] = msg.feedbacks.map((fb) => ({
        id: fb.id,
        feedbackTypeId: fb.feedbackTypeId,
        feedbackTypeName: fb.feedbackType.name,
        category: fb.feedbackType.category,
        points: fb.feedbackType.points,
        comment: fb.comment,
        registeredBy: fb.registeredBy.name,
        createdAt: fb.createdAt.toISOString(),
      }));
    }
  }

  return NextResponse.json({ imported: true, feedbacks: feedbacksByMessageId }, { headers });
}
