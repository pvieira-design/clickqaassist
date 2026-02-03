import { NextRequest, NextResponse } from "next/server";
import prisma from "@clickqaassist/db";

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

  const types = await prisma.feedbackType.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(types, { headers });
}
