"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Badge } from "@/components/base/badges/badges";
import Loader from "@/components/loader";
import { useRouter } from "next/navigation";
import { cx } from "@/utils/cx";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/base/buttons/button";
import { toast } from "sonner";

const categoryBadgeColor: Record<string, "success" | "warning" | "error"> = {
  POSITIVE: "success",
  NEUTRAL: "warning",
  NEGATIVE: "error",
};

function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  return String(points);
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isSameDay(a: Date | string, b: Date | string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function ChatView({ chatId }: { chatId: string }) {
  const chat = useQuery(trpc.chat.getById.queryOptions({ id: chatId }));
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const [feedbackModal, setFeedbackModal] = useState<{
    messageId: string;
    agentId: string | null;
    agentName: string | null;
    messageText: string;
    preSelectedCategory: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  } | null>(null);
  const [selectedFeedbackTypeId, setSelectedFeedbackTypeId] = useState("");
  const [comment, setComment] = useState("");

  const feedbackTypes = useQuery(trpc.feedbackType.list.queryOptions());

  const createFeedbackMutation = useMutation(
    trpc.feedback.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getById.queryOptions({ id: chatId }).queryKey,
        });
        toast.success("Feedback registrado com sucesso");
        setFeedbackModal(null);
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao registrar feedback");
      },
    }),
  );

  const deleteFeedbackMutation = useMutation(
    trpc.feedback.softDelete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.chat.getById.queryOptions({ id: chatId }).queryKey,
        });
        toast.success("Feedback removido");
      },
    }),
  );

  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (!hasScrolledRef.current && chat.data) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      hasScrolledRef.current = true;
    }
  }, [chat.data]);

  if (chat.isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl items-center justify-center p-6">
        <Loader />
      </div>
    );
  }

  if (chat.isError) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-secondary bg-primary p-12 text-center">
          <p className="text-sm font-medium text-error-primary">
            Erro ao carregar chat
          </p>
          <Button color="secondary" size="sm" onClick={() => chat.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!chat.data) return null;

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <Button color="tertiary" size="sm" onClick={() => router.back()}>
          &larr; Voltar
        </Button>
        <div className="mt-4">
          <h1 className="text-display-xs font-semibold text-primary">
            {chat.data.patientName || "Paciente n\u00e3o identificado"}
          </h1>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-tertiary">
            {chat.data.patientPhone && (
              <span>{"\uD83D\uDCF1"} {chat.data.patientPhone}</span>
            )}
            <span>Status: {chat.data.chatGuruStatus}</span>
            <span>Mensagens: {chat.data.messages.length}</span>
            <span>Importado por: {chat.data.importedBy.name}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-secondary bg-secondary p-4">
        {chat.data.messages.map((msg, index) => {
          const isAgent = msg.direction === "AGENT";
          const isBot = isAgent && !msg.agentName;
          const showDateSeparator =
            index === 0 ||
            !isSameDay(
              msg.timestamp,
              chat.data.messages[index - 1].timestamp,
            );

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 py-2">
                  <div className="h-px flex-1 bg-tertiary/20" />
                  <span className="text-xs text-tertiary">
                    {formatDate(msg.timestamp)}
                  </span>
                  <div className="h-px flex-1 bg-tertiary/20" />
                </div>
              )}

              <div
                className={cx(
                  "flex",
                  isAgent ? "justify-end" : "justify-start",
                )}
              >
                <div className="group relative max-w-[75%]">
                  <div
                    className={cx(
                      "rounded-xl px-4 py-2.5",
                      isAgent
                        ? "rounded-tr-sm bg-utility-success-50"
                        : "rounded-tl-sm bg-primary",
                    )}
                  >
                    {isAgent && (
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-semibold text-utility-success-700">
                          {msg.agentName || "Sistema"}
                        </span>
                        {isBot && (
                          <Badge color="blue" size="sm">
                            BOT
                          </Badge>
                        )}
                        {msg.isTemplate && (
                          <Badge color="purple" size="sm">
                            TEMPLATE
                          </Badge>
                        )}
                      </div>
                    )}

                    {msg.isDeleted && (
                      <p className="text-xs italic text-tertiary">
                        {"\uD83D\uDEAB"} Mensagem apagada
                      </p>
                    )}

                    {msg.messageType === "text" ? (
                      <p
                        className={cx(
                          "whitespace-pre-wrap break-words text-sm text-primary",
                          msg.isDeleted && "line-through opacity-60",
                        )}
                      >
                        {msg.text}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-sm italic text-tertiary">
                        <span>[{msg.messageType.toUpperCase()}]</span>
                        {msg.text && <span>{msg.text}</span>}
                      </div>
                    )}

                    <p
                      className={cx(
                        "mt-1 text-xs",
                        isAgent
                          ? "text-right text-utility-success-600"
                          : "text-tertiary",
                      )}
                    >
                      {formatTime(msg.timestamp)}
                    </p>

                    {msg.feedbacks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 border-t border-secondary pt-2">
                        {msg.feedbacks.map((fb) => (
                          <div key={fb.id} className="flex items-center gap-1">
                            <Badge
                              size="sm"
                              color={categoryBadgeColor[fb.feedbackType.category]}
                            >
                              {fb.feedbackType.name} (
                              {formatPoints(fb.feedbackType.points)})
                            </Badge>
                            <button
                              type="button"
                              onClick={() =>
                                deleteFeedbackMutation.mutate({ id: fb.id })
                              }
                              className="hidden rounded p-0.5 text-tertiary transition hover:bg-error-secondary hover:text-error-primary group-hover:inline-flex"
                              title="Remover feedback"
                            >
                              <span className="text-xs">&times;</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {isAgent && (
                    <div className="mt-1.5 hidden items-center gap-2 group-hover:flex">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full bg-error-secondary px-3 py-1 text-xs font-medium text-error-primary shadow-sm transition hover:bg-error-primary hover:text-white"
                        onClick={() => {
                          setSelectedFeedbackTypeId("");
                          setComment("");
                          setFeedbackModal({
                            messageId: msg.id,
                            agentId: msg.agent?.id ?? null,
                            agentName: msg.agentName,
                            messageText: msg.text.substring(0, 150),
                            preSelectedCategory: "NEGATIVE",
                          });
                        }}
                      >
                        <span className="text-sm">●</span> Erro
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full bg-warning-secondary px-3 py-1 text-xs font-medium text-warning-primary shadow-sm transition hover:bg-warning-primary hover:text-white"
                        onClick={() => {
                          setSelectedFeedbackTypeId("");
                          setComment("");
                          setFeedbackModal({
                            messageId: msg.id,
                            agentId: msg.agent?.id ?? null,
                            agentName: msg.agentName,
                            messageText: msg.text.substring(0, 150),
                            preSelectedCategory: "NEUTRAL",
                          });
                        }}
                      >
                        <span className="text-sm">●</span> Ponto de Atenção
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-full bg-success-secondary px-3 py-1 text-xs font-medium text-success-primary shadow-sm transition hover:bg-success-primary hover:text-white"
                        onClick={() => {
                          setSelectedFeedbackTypeId("");
                          setComment("");
                          setFeedbackModal({
                            messageId: msg.id,
                            agentId: msg.agent?.id ?? null,
                            agentName: msg.agentName,
                            messageText: msg.text.substring(0, 150),
                            preSelectedCategory: "POSITIVE",
                          });
                        }}
                      >
                        <span className="text-sm">●</span> Acerto
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {feedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-primary p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-primary">
              Registrar Feedback
              {feedbackModal.preSelectedCategory === "NEGATIVE" && (
                <span className="ml-2 text-sm font-normal text-error-primary">— Erro</span>
              )}
              {feedbackModal.preSelectedCategory === "NEUTRAL" && (
                <span className="ml-2 text-sm font-normal text-warning-primary">— Ponto de Atenção</span>
              )}
              {feedbackModal.preSelectedCategory === "POSITIVE" && (
                <span className="ml-2 text-sm font-normal text-success-primary">— Acerto</span>
              )}
            </h2>
            <p className="mb-4 text-sm text-tertiary">
              {feedbackModal.agentName || "Sistema"}:{" "}
              &ldquo;{feedbackModal.messageText}...&rdquo;
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!selectedFeedbackTypeId || !feedbackModal) return;
                createFeedbackMutation.mutate({
                  messageId: feedbackModal.messageId,
                  feedbackTypeId: selectedFeedbackTypeId,
                  agentId: feedbackModal.agentId,
                  comment: comment || undefined,
                });
              }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">
                  Tipo de Feedback
                </label>
                <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
                  <select
                    value={selectedFeedbackTypeId}
                    onChange={(e) =>
                      setSelectedFeedbackTypeId(e.target.value)
                    }
                    className="m-0 w-full rounded-lg bg-transparent px-3 py-2 text-md text-primary outline-hidden"
                  >
                    <option value="">Selecione o tipo...</option>
                    {feedbackModal.preSelectedCategory ? (
                      feedbackTypes.data
                        ?.filter((ft) => ft.category === feedbackModal.preSelectedCategory)
                        .map((ft) => (
                          <option key={ft.id} value={ft.id}>
                            {ft.name} ({formatPoints(ft.points)})
                          </option>
                        ))
                    ) : (
                      <>
                        <optgroup label="Positivo">
                          {feedbackTypes.data
                            ?.filter((ft) => ft.category === "POSITIVE")
                            .map((ft) => (
                              <option key={ft.id} value={ft.id}>
                                {ft.name} ({formatPoints(ft.points)})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Neutro">
                          {feedbackTypes.data
                            ?.filter((ft) => ft.category === "NEUTRAL")
                            .map((ft) => (
                              <option key={ft.id} value={ft.id}>
                                {ft.name} ({formatPoints(ft.points)})
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Negativo">
                          {feedbackTypes.data
                            ?.filter((ft) => ft.category === "NEGATIVE")
                            .map((ft) => (
                              <option key={ft.id} value={ft.id}>
                                {ft.name} ({formatPoints(ft.points)})
                              </option>
                            ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">
                  Comentário (opcional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Observação sobre este feedback..."
                  rows={3}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-md text-primary shadow-xs ring-1 ring-primary ring-inset outline-hidden placeholder:text-placeholder focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  color="secondary"
                  size="sm"
                  onClick={() => setFeedbackModal(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="sm"
                  isDisabled={!selectedFeedbackTypeId}
                  isLoading={createFeedbackMutation.isPending}
                >
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
