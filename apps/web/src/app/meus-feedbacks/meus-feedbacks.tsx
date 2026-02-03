"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import Loader from "@/components/loader";
import { cx } from "@/utils/cx";

const categoryLabels: Record<string, string> = {
  POSITIVE: "Positivo",
  NEUTRAL: "Neutro",
  NEGATIVE: "Negativo",
};

const categoryBadgeColor: Record<string, "success" | "warning" | "error"> = {
  POSITIVE: "success",
  NEUTRAL: "warning",
  NEGATIVE: "error",
};

const statusConfig: Record<
  string,
  { color: "error" | "blue" | "success" | "warning" | "gray"; label: string }
> = {
  PENDING: { color: "error", label: "Novo" },
  READ: { color: "blue", label: "Lido" },
  ACKNOWLEDGED: { color: "success", label: "Compreendido" },
  CONTESTED: { color: "warning", label: "Contestado" },
  RESOLVED: { color: "gray", label: "Resolvido" },
};

const resolutionLabels: Record<string, string> = {
  MAINTAINED: "Feedback mantido",
  CHANGED: "Feedback alterado",
  REMOVED: "Feedback removido",
};

const filters = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Não lidos" },
  { value: "CONTESTED", label: "Contestados" },
] as const;

type FilterValue = (typeof filters)[number]["value"];

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  return String(points);
}

export default function MeusFeedbacks() {
  const [filter, setFilter] = useState<FilterValue>("ALL");
  const [contestModal, setContestModal] = useState<{
    feedbackId: string;
    feedbackName: string;
  } | null>(null);
  const [contestMessage, setContestMessage] = useState("");
  const queryClient = useQueryClient();

  const feedbacks = useQuery(trpc.feedback.listByAgent.queryOptions());

  const markAsReadMutation = useMutation(
    trpc.feedback.markAsRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.feedback.listByAgent.queryOptions().queryKey,
        });
      },
    }),
  );

  const createContestationMutation = useMutation(
    trpc.contestation.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.feedback.listByAgent.queryOptions().queryKey,
        });
        toast.success("Contestação enviada com sucesso");
        setContestModal(null);
        setContestMessage("");
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao enviar contestação");
      },
    }),
  );

  const acknowledgeMutation = useMutation(
    trpc.feedback.acknowledge.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.feedback.listByAgent.queryOptions().queryKey,
        });
        toast.success("Feedback marcado como compreendido");
      },
    }),
  );

  function handleCardClick(feedbackId: string, status: string) {
    if (status === "PENDING") {
      markAsReadMutation.mutate({ id: feedbackId });
    }
  }

  if (feedbacks.isLoading) {
    return <Loader />;
  }

  const data = feedbacks.data ?? [];

  const filteredData = data.filter((f) => {
    if (filter === "ALL") return true;
    return f.status === filter;
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-display-xs font-semibold text-primary">
          Meus Feedbacks
        </h1>
      </div>

      <div className="mb-6 flex gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cx(
              "rounded-full px-3 py-1.5 text-sm font-medium transition",
              filter === f.value
                ? "bg-brand-solid text-white"
                : "bg-primary text-tertiary ring-1 ring-secondary ring-inset hover:bg-secondary_hover",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredData.length === 0 ? (
        <p className="py-12 text-center text-sm text-tertiary">
          Nenhum feedback recebido
        </p>
      ) : (
        <div className="space-y-4">
          {filteredData.map((feedback) => {
            const status = statusConfig[feedback.status];
            const catColor =
              categoryBadgeColor[feedback.feedbackType.category];
            const messageExcerpt = feedback.message?.text
              ? feedback.message.text.length > 100
                ? `${feedback.message.text.slice(0, 100)}...`
                : feedback.message.text
              : null;

            return (
              <div
                key={feedback.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  handleCardClick(feedback.id, feedback.status)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleCardClick(feedback.id, feedback.status);
                  }
                }}
                className={cx(
                  "rounded-xl border border-secondary p-4 space-y-3 cursor-pointer transition hover:border-tertiary",
                  feedback.status === "PENDING" && "border-l-4 border-l-utility-error-500",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-primary">
                    {feedback.feedbackType.name}
                  </span>
                  <Badge color={catColor} size="sm">
                    {categoryLabels[feedback.feedbackType.category]}
                  </Badge>
                  {status && (
                    <Badge color={status.color} size="sm">
                      {status.label}
                    </Badge>
                  )}
                  <span className="ml-auto font-mono text-sm font-semibold text-primary">
                    {formatPoints(feedback.feedbackType.points)}
                  </span>
                </div>

                {feedback.comment && (
                  <p className="text-sm text-secondary">
                    {feedback.comment}
                  </p>
                )}

                {messageExcerpt && (
                  <div className="rounded-lg bg-secondary p-3">
                    <span className="text-xs font-medium text-tertiary">
                      Mensagem
                    </span>
                    <p className="mt-0.5 text-sm text-primary">
                      {messageExcerpt}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tertiary">
                  {feedback.message?.chat?.patientName && (
                    <span>
                      Paciente:{" "}
                      <span className="font-medium text-secondary">
                        {feedback.message.chat.patientName}
                      </span>
                    </span>
                  )}
                  <span>
                    Registrado por:{" "}
                    <span className="font-medium text-secondary">
                      {feedback.registeredBy.name}
                    </span>
                  </span>
                  <span>{formatDate(feedback.createdAt)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-secondary pt-3">
                  {feedback.message?.chat?.chatGuruUrl && (
                    <Button
                      color="secondary"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        window.open(
                          feedback.message!.chat!.chatGuruUrl!,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      Ver no ChatGuru
                    </Button>
                  )}

                  {feedback.status === "PENDING" && (
                    <Button
                      color="secondary"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        markAsReadMutation.mutate({ id: feedback.id });
                      }}
                      isLoading={
                        markAsReadMutation.isPending &&
                        markAsReadMutation.variables?.id === feedback.id
                      }
                    >
                      Marcar como Lido
                    </Button>
                  )}

                  {feedback.status === "READ" && (
                    <>
                      <Button
                        color="primary"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          acknowledgeMutation.mutate({ id: feedback.id });
                        }}
                        isLoading={
                          acknowledgeMutation.isPending &&
                          acknowledgeMutation.variables?.id === feedback.id
                        }
                      >
                        Feedback Compreendido
                      </Button>
                      <Button
                        color="secondary"
                        size="sm"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          setContestMessage("");
                          setContestModal({
                            feedbackId: feedback.id,
                            feedbackName: feedback.feedbackType.name,
                          });
                        }}
                      >
                        Contestar
                      </Button>
                    </>
                  )}

                  {feedback.status === "ACKNOWLEDGED" && (
                    <Button
                      color="secondary"
                      size="sm"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        setContestMessage("");
                        setContestModal({
                          feedbackId: feedback.id,
                          feedbackName: feedback.feedbackType.name,
                        });
                      }}
                    >
                      Contestar
                    </Button>
                  )}

                  {feedback.status === "CONTESTED" && (
                    <span className="text-sm text-warning-primary">
                      Contestação em andamento
                    </span>
                  )}

                  {feedback.status === "RESOLVED" &&
                    feedback.contestation?.resolution && (
                      <span className="text-sm text-tertiary">
                        {resolutionLabels[feedback.contestation.resolution] ??
                          feedback.contestation.resolution}
                      </span>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {contestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-primary p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-primary">
              Contestar Feedback
            </h2>
            <p className="mb-4 text-sm text-tertiary">
              {contestModal.feedbackName}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!contestMessage.trim() || contestMessage.length < 10)
                  return;
                createContestationMutation.mutate({
                  feedbackId: contestModal.feedbackId,
                  message: contestMessage,
                });
              }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-secondary">
                  Motivo da contestação
                </label>
                <textarea
                  value={contestMessage}
                  onChange={(e) => setContestMessage(e.target.value)}
                  placeholder="Explique por que discorda deste feedback (mínimo 10 caracteres)..."
                  rows={4}
                  className="w-full rounded-lg bg-primary px-3 py-2 text-md text-primary shadow-xs ring-1 ring-primary ring-inset outline-hidden placeholder:text-placeholder focus:ring-2 focus:ring-brand"
                />
                {contestMessage.length > 0 && contestMessage.length < 10 && (
                  <p className="text-xs text-error-primary">
                    Mínimo de 10 caracteres
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  color="secondary"
                  size="sm"
                  onClick={() => setContestModal(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  size="sm"
                  isDisabled={contestMessage.length < 10}
                  isLoading={createContestationMutation.isPending}
                >
                  Enviar Contestação
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
