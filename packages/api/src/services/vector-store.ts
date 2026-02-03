import OpenAI, { toFile } from "openai";
import { env } from "@clickqaassist/env/server";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

let cachedVectorStoreId: string | null = null;

/**
 * Resolves the vector store ID — uses env var if set, otherwise creates a new one.
 * Result is cached in memory for the process lifetime.
 */
export async function ensureVectorStore(): Promise<string> {
  if (cachedVectorStoreId) return cachedVectorStoreId;

  if (env.OPENAI_VECTOR_STORE_ID) {
    try {
      await openai.vectorStores.retrieve(env.OPENAI_VECTOR_STORE_ID);
      cachedVectorStoreId = env.OPENAI_VECTOR_STORE_ID;
      return cachedVectorStoreId;
    } catch {
      console.warn(
        `[vector-store] OPENAI_VECTOR_STORE_ID "${env.OPENAI_VECTOR_STORE_ID}" not found, creating new one`,
      );
    }
  }

  const vs = await openai.vectorStores.create({
    name: "Click QA - Correções de Análise",
    metadata: {
      project: "clickqaassist",
      purpose: "ai_correction_examples",
    },
  });

  cachedVectorStoreId = vs.id;
  console.log(
    `[vector-store] Created vector store: ${vs.id}. Add OPENAI_VECTOR_STORE_ID=${vs.id} to your .env for persistence.`,
  );
  return cachedVectorStoreId;
}

export async function ensureAssistantHasFileSearch(): Promise<void> {
  const vectorStoreId = await ensureVectorStore();
  const assistant = await openai.beta.assistants.retrieve(
    env.OPENAI_ASSISTANT_ID,
  );

  const currentTools = assistant.tools.map((t) => t.type);
  const currentVectorStores =
    assistant.tool_resources?.file_search?.vector_store_ids || [];

  if (
    currentTools.includes("file_search") &&
    currentVectorStores.includes(vectorStoreId)
  ) {
    return;
  }

  const tools = [...assistant.tools];
  if (!currentTools.includes("file_search")) {
    tools.push({ type: "file_search" });
  }

  await openai.beta.assistants.update(env.OPENAI_ASSISTANT_ID, {
    tools,
    tool_resources: {
      ...assistant.tool_resources,
      file_search: {
        vector_store_ids: [vectorStoreId],
      },
    },
  });

  console.log(
    `[vector-store] Assistant updated with file_search + vector store ${vectorStoreId}`,
  );
}

export interface CorrectionData {
  suggestionId: string;
  outcome: "ACCEPTED" | "EDITED" | "REJECTED";
  messageText: string;
  agentName: string | null;
  suggestedFeedbackTypeName: string;
  suggestedCategory: string;
  reasoning: string;
  suggestedComment: string;
  correctionNote: string | null;
  appliedFeedbackTypeName: string | null;
  appliedCategory: string | null;
  resolvedAt: Date;
}

function formatCorrectionDocument(data: CorrectionData): string {
  const outcomeLabel = {
    ACCEPTED: "ACEITO (IA acertou)",
    EDITED: "EDITADO (IA parcialmente correta)",
    REJECTED: "REJEITADO (IA errou)",
  }[data.outcome];

  let doc = `CORREÇÃO DE ANÁLISE DE QA
===========================
Data: ${data.resolvedAt.toLocaleDateString("pt-BR")}
Resultado: ${outcomeLabel}

MENSAGEM DO ATENDENTE:
"${data.messageText}"
${data.agentName ? `(Atendente: ${data.agentName})` : ""}

SUGESTÃO DA IA:
- Tipo de feedback: ${data.suggestedFeedbackTypeName} (${data.suggestedCategory})
- Raciocínio: ${data.reasoning}
- Comentário sugerido: ${data.suggestedComment}
`;

  if (data.outcome === "EDITED" && data.appliedFeedbackTypeName) {
    doc += `
CORREÇÃO DO LÍDER:
- Feedback correto aplicado: ${data.appliedFeedbackTypeName} (${data.appliedCategory || data.suggestedCategory})
${data.correctionNote ? `- Motivo da edição: ${data.correctionNote}` : ""}
- LIÇÃO: Quando encontrar mensagens semelhantes, use "${data.appliedFeedbackTypeName}" ao invés de "${data.suggestedFeedbackTypeName}"
`;
  }

  if (data.outcome === "REJECTED") {
    doc += `
CORREÇÃO DO LÍDER:
${data.correctionNote ? `- Motivo da rejeição: ${data.correctionNote}` : "- Nenhum feedback era necessário para esta mensagem"}
- LIÇÃO: Mensagens como esta NÃO devem receber o feedback "${data.suggestedFeedbackTypeName}". ${data.correctionNote || "Não force feedbacks quando o atendimento está adequado."}
`;
  }

  if (data.outcome === "ACCEPTED") {
    doc += `
CONFIRMAÇÃO: A sugestão "${data.suggestedFeedbackTypeName}" foi correta para este tipo de mensagem.
`;
  }

  return doc;
}

/**
 * Uploads a resolved correction to the vector store.
 * Returns the OpenAI file ID for tracking, or null on failure.
 */
export async function uploadCorrection(
  data: CorrectionData,
): Promise<string | null> {
  try {
    const vectorStoreId = await ensureVectorStore();
    const content = formatCorrectionDocument(data);
    const filename = `correction_${data.outcome.toLowerCase()}_${data.suggestionId}.txt`;

    const file = await openai.files.create({
      file: await toFile(Buffer.from(content, "utf-8"), filename),
      purpose: "assistants",
    });

    const vsFile = await openai.vectorStores.files.createAndPoll(
      vectorStoreId,
      { file_id: file.id },
    );

    if (vsFile.status !== "completed") {
      console.error(
        `[vector-store] File indexing failed for ${filename}: ${vsFile.status}`,
        vsFile.last_error,
      );
      return null;
    }

    return file.id;
  } catch (error) {
    console.error("[vector-store] Failed to upload correction:", error);
    return null;
  }
}

export async function removeCorrection(fileId: string): Promise<void> {
  try {
    const vectorStoreId = await ensureVectorStore();
    await openai.vectorStores.files.delete(fileId, {
      vector_store_id: vectorStoreId,
    });
    await openai.files.delete(fileId);
  } catch (error) {
    console.error("[vector-store] Failed to remove correction:", error);
  }
}

export async function getVectorStoreStats(): Promise<{
  id: string;
  fileCount: number;
  status: string;
  usageBytes: number;
} | null> {
  try {
    const vectorStoreId = await ensureVectorStore();
    const vs = await openai.vectorStores.retrieve(vectorStoreId);

    return {
      id: vs.id,
      fileCount: vs.file_counts.completed,
      status: vs.status,
      usageBytes: vs.usage_bytes,
    };
  } catch (error) {
    console.error("[vector-store] Failed to get stats:", error);
    return null;
  }
}
