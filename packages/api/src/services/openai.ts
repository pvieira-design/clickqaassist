import OpenAI from "openai";
import { env } from "@clickqaassist/env/server";
import prisma from "@clickqaassist/db";
import { ensureAssistantHasFileSearch } from "./vector-store";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

let assistantConfigured = false;

export type AnalysisMode = "ALL" | "POSITIVE" | "NEUTRAL" | "NEGATIVE";

interface ChatMessageForAI {
  id: string;
  direction: string;
  agentName: string | null;
  text: string;
  messageType: string;
  timestamp: Date | string;
  isTemplate: boolean;
  isDeleted: boolean;
}

interface FeedbackTypeForAI {
  id: string;
  name: string;
  category: string;
  points: number;
}

export interface AISuggestionRaw {
  messageId: string;
  feedbackTypeName: string;
  feedbackTypeId: string;
  category: string;
  reasoning: string;
  comment: string;
}

export interface AIAnalysisResult {
  prompt: string;
  rawResponse: string;
  suggestions: AISuggestionRaw[];
}

interface CalibrationExample {
  condition: string;
  feedbackType: string;
  points: string;
  note: string;
}

const DEFAULT_SYSTEM_PROMPT = `Analise o seguinte chat de atendimento da Click Cannabis e identifique mensagens dos AGENTES que precisam de feedback.

INSTRUÇÕES:
1. Analise APENAS mensagens do AGENTE (não do paciente, não de templates/bots)
2. Identifique mensagens que merecem feedback (positivo, neutro ou negativo)
3. Para cada mensagem identificada, sugira o tipo de feedback mais adequado da lista disponível
4. Forneça uma justificativa breve e um comentário construtivo
5. Não force feedbacks — se o atendimento foi adequado sem destaques, retorne lista vazia`;

const DEFAULT_CALIBRATION_EXAMPLES: CalibrationExample[] = [
  {
    condition:
      "Se um atendente responde rápido e de forma personalizada ao paciente",
    feedbackType: "Resposta rápida",
    points: "+2",
    note: "mas apenas se a resposta for realmente ágil no contexto do chat",
  },
  {
    condition: "Se um atendente comete um erro de ortografia claro",
    feedbackType: "Erro ortográfico",
    points: "0",
    note: "mas não marque gírias ou abreviações comuns como erro",
  },
  {
    condition:
      "Se um atendente ignora detalhes mencionados pelo paciente (nome do produto, dosagem, etc)",
    feedbackType: "Falta de observar detalhes",
    points: "-4",
    note: "",
  },
  {
    condition: "Se o atendimento foi adequado sem destaques especiais",
    feedbackType: "Nenhum",
    points: "0",
    note: "NÃO force feedbacks — retorne lista vazia",
  },
  {
    condition: "Mensagens de TEMPLATE/BOT",
    feedbackType: "Nenhum",
    points: "0",
    note: "nunca recebem feedback — são automáticas",
  },
];

async function getAiConfig(
  key: string,
): Promise<string | null> {
  try {
    const config = await prisma.aiConfig.findUnique({ where: { key } });
    return config?.value ?? null;
  } catch {
    return null;
  }
}

async function loadSystemPrompt(): Promise<string> {
  const saved = await getAiConfig("system_prompt");
  return saved || DEFAULT_SYSTEM_PROMPT;
}

async function loadCalibrationExamples(): Promise<CalibrationExample[]> {
  const saved = await getAiConfig("calibration_examples");
  if (saved) {
    try {
      return JSON.parse(saved) as CalibrationExample[];
    } catch {
      return DEFAULT_CALIBRATION_EXAMPLES;
    }
  }
  return DEFAULT_CALIBRATION_EXAMPLES;
}

function getModeInstructions(mode: AnalysisMode): string {
  switch (mode) {
    case "NEGATIVE":
      return `\nFOCO DA ANÁLISE: APENAS ERROS E PROBLEMAS
Analise SOMENTE erros, falhas e problemas no atendimento. Foque em mensagens que demonstram falta de empatia, erros ortográficos, demora, falta de personalização, falta de atenção a detalhes, etc. Use APENAS tipos de feedback NEGATIVOS ou NEUTROS da lista disponível. Ignore acertos — nesta análise queremos encontrar o que precisa melhorar.`;
    case "POSITIVE":
      return `\nFOCO DA ANÁLISE: APENAS ACERTOS E PONTOS POSITIVOS
Analise SOMENTE acertos e boas práticas no atendimento. Foque em mensagens que demonstram empatia, uso correto de scripts, respostas rápidas, boa pronúncia em áudios, etc. Use APENAS tipos de feedback POSITIVOS da lista disponível. Ignore erros — nesta análise queremos reconhecer o que foi feito bem.`;
    case "NEUTRAL":
      return `\nFOCO DA ANÁLISE: APENAS PONTOS DE ATENÇÃO
Analise SOMENTE pontos de atenção no atendimento. Foque em mensagens com pequenas falhas que não são graves mas merecem atenção — erros ortográficos, oportunidades de melhoria, coisas que poderiam ser melhores. Use APENAS tipos de feedback NEUTROS da lista disponível. Ignore erros graves e acertos.`;
    case "ALL":
    default:
      return "";
  }
}

function formatChatForAI(
  messages: ChatMessageForAI[],
  patientName: string | null,
  feedbackTypes: FeedbackTypeForAI[],
  mode: AnalysisMode,
  systemPrompt: string,
  calibrationExamples: CalibrationExample[],
): string {
  const chatLines = messages.map((msg) => {
    const direction = msg.direction === "AGENT" ? "AGENTE" : "PACIENTE";
    const agent = msg.agentName ? ` (${msg.agentName})` : "";
    const time = new Date(msg.timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const deleted = msg.isDeleted ? " [DELETADA]" : "";
    const template = msg.isTemplate ? " [TEMPLATE/BOT]" : "";
    return `[${msg.id}] ${time} ${direction}${agent}${template}${deleted}: ${msg.text}`;
  });

  const filteredTypes =
    mode === "ALL"
      ? feedbackTypes
      : feedbackTypes.filter((ft) => ft.category === mode);

  const feedbackTypesList = filteredTypes
    .map(
      (ft) =>
        `- "${ft.name}" (${ft.category}, ${ft.points > 0 ? `+${ft.points}` : ft.points} pts) [ID: ${ft.id}]`,
    )
    .join("\n");

  const examplesBlock = calibrationExamples
    .map(
      (ex, i) =>
        `${i + 1}. ${ex.condition} → considere "${ex.feedbackType}" (${ex.points} pts)${ex.note ? ` — ${ex.note}` : ""}`,
    )
    .join("\n");

  const modeInstructions = getModeInstructions(mode);

  return `${systemPrompt}
${modeInstructions}

PACIENTE: ${patientName || "Não identificado"}

=== CHAT ===
${chatLines.join("\n")}
=== FIM DO CHAT ===

TIPOS DE FEEDBACK DISPONÍVEIS:
${feedbackTypesList}

IMPORTANTE: Consulte sua base de conhecimento de correções anteriores (file_search) para calibrar suas sugestões. As correções armazenadas mostram casos onde líderes de QA aceitaram, editaram ou rejeitaram suas sugestões passadas. Use essas correções como referência para entender o padrão de qualidade esperado.

EXEMPLOS DE CALIBRAÇÃO:
${examplesBlock}

RESPONDA EXCLUSIVAMENTE com um JSON válido no seguinte formato (sem markdown, sem texto extra, sem code blocks):
[
  {
    "messageId": "o ID entre colchetes no início da mensagem",
    "feedbackTypeName": "Nome exato do tipo de feedback da lista acima",
    "category": "POSITIVE ou NEUTRAL ou NEGATIVE",
    "reasoning": "Por que esta mensagem merece este feedback",
    "comment": "Comentário construtivo para o atendente"
  }
]

Se nenhuma mensagem precisar de feedback, retorne: []`;
}

export async function analyzeChatWithAI(
  messages: ChatMessageForAI[],
  feedbackTypes: FeedbackTypeForAI[],
  patientName: string | null,
  mode: AnalysisMode = "ALL",
): Promise<AIAnalysisResult> {
  if (!assistantConfigured) {
    await ensureAssistantHasFileSearch();
    assistantConfigured = true;
  }

  const [systemPrompt, calibrationExamples] = await Promise.all([
    loadSystemPrompt(),
    loadCalibrationExamples(),
  ]);

  const prompt = formatChatForAI(
    messages,
    patientName,
    feedbackTypes,
    mode,
    systemPrompt,
    calibrationExamples,
  );

  const thread = await openai.beta.threads.create({
    messages: [{ role: "user", content: prompt }],
  });

  const threadId = thread.id;

  try {
    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: env.OPENAI_ASSISTANT_ID,
    });

    if (run.status === "failed") {
      throw new Error(
        `Análise da IA falhou: ${run.last_error?.message || "erro desconhecido"}`,
      );
    }

    if (run.status !== "completed") {
      throw new Error(`Análise da IA encerrou com status: ${run.status}`);
    }

    const responseMessages = await openai.beta.threads.messages.list(
      threadId,
      { order: "desc", limit: 1 },
    );

    const assistantMessage = responseMessages.data[0];
    if (!assistantMessage || assistantMessage.role !== "assistant") {
      throw new Error("Nenhuma resposta do assistente recebida");
    }

    const textBlock = assistantMessage.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Resposta do assistente não contém texto");
    }

    const rawResponse = textBlock.text.value.trim();

    let jsonText = rawResponse;
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?\s*```$/, "");
    }

    const parsed = JSON.parse(jsonText) as Array<{
      messageId: string;
      feedbackTypeName: string;
      category: string;
      reasoning: string;
      comment: string;
    }>;

    if (!Array.isArray(parsed)) {
      throw new Error("Resposta da IA não é um array válido");
    }

    const feedbackTypeMap = new Map(
      feedbackTypes.map((ft) => [ft.name.toLowerCase(), ft]),
    );
    const messageIdSet = new Set(messages.map((m) => m.id));

    const suggestions: AISuggestionRaw[] = [];

    for (const item of parsed) {
      if (!messageIdSet.has(item.messageId)) {
        continue;
      }

      const matchedType = feedbackTypeMap.get(
        item.feedbackTypeName.toLowerCase(),
      );

      suggestions.push({
        messageId: item.messageId,
        feedbackTypeName: matchedType?.name || item.feedbackTypeName,
        feedbackTypeId: matchedType?.id || "",
        category: matchedType?.category || item.category,
        reasoning: item.reasoning,
        comment: item.comment,
      });
    }

    return { prompt, rawResponse, suggestions };
  } finally {
    openai.beta.threads.delete(threadId).catch(() => {});
  }
}
