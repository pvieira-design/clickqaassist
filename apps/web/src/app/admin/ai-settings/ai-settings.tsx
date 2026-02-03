"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import Loader from "@/components/loader";
import { toast } from "sonner";
import { cx } from "@/utils/cx";

type TabKey = "prompt" | "examples" | "vectorstore" | "stats";

interface CalibrationExample {
  condition: string;
  feedbackType: string;
  points: string;
  note: string;
}

const outcomeLabels: Record<string, string> = {
  ACCEPTED: "ACEITO",
  EDITED: "EDITADO",
  REJECTED: "REJEITADO",
};

const outcomeBadgeColor: Record<string, "success" | "warning" | "error"> = {
  ACCEPTED: "success",
  EDITED: "warning",
  REJECTED: "error",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const tabs: { key: TabKey; label: string }[] = [
  { key: "prompt", label: "Prompt do Sistema" },
  { key: "examples", label: "Exemplos de Calibracao" },
  { key: "vectorstore", label: "Base de Conhecimento" },
  { key: "stats", label: "Estatisticas" },
];

const inputClasses =
  "w-full rounded-lg bg-primary px-3 py-2 text-md text-primary shadow-xs ring-1 ring-primary ring-inset outline-hidden placeholder:text-placeholder focus:ring-2 focus:ring-brand";

function PromptTab() {
  const [promptValue, setPromptValue] = useState("");
  const [hasEdited, setHasEdited] = useState(false);
  const queryClient = useQueryClient();

  const promptQuery = useQuery(
    trpc.aiSettings.getConfig.queryOptions({ key: "system_prompt" }),
  );

  const updateMutation = useMutation(
    trpc.aiSettings.updateConfig.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.aiSettings.getConfig.queryOptions({
            key: "system_prompt",
          }).queryKey,
        });
        toast.success("Prompt salvo com sucesso");
        setHasEdited(false);
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao salvar prompt");
      },
    }),
  );

  const resetMutation = useMutation(
    trpc.aiSettings.resetConfig.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.aiSettings.getConfig.queryOptions({
            key: "system_prompt",
          }).queryKey,
        });
        toast.success("Prompt restaurado para o padrao");
        setPromptValue("");
        setHasEdited(false);
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao restaurar prompt");
      },
    }),
  );

  if (promptQuery.isLoading) return <Loader />;

  const displayValue = hasEdited
    ? promptValue
    : (promptQuery.data?.value ?? "");

  return (
    <div className="space-y-4">
      <textarea
        rows={12}
        value={displayValue}
        onChange={(e) => {
          setPromptValue(e.target.value);
          setHasEdited(true);
        }}
        placeholder="O prompt padrao sera utilizado. Edite aqui para personalizar."
        className={inputClasses}
      />

      {promptQuery.data && (
        <p className="text-sm text-tertiary">
          Ultima atualizacao: {formatDate(promptQuery.data.updatedAt)} por{" "}
          {promptQuery.data.updatedBy.name}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          color="primary"
          size="sm"
          isLoading={updateMutation.isPending}
          onClick={() =>
            updateMutation.mutate({
              key: "system_prompt",
              value: displayValue,
            })
          }
        >
          Salvar
        </Button>
        <Button
          color="secondary"
          size="sm"
          isLoading={resetMutation.isPending}
          onClick={() => resetMutation.mutate({ key: "system_prompt" })}
        >
          Restaurar Padrao
        </Button>
      </div>
    </div>
  );
}

function ExamplesTab() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [condition, setCondition] = useState("");
  const [feedbackType, setFeedbackType] = useState("");
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const examplesQuery = useQuery(
    trpc.aiSettings.getConfig.queryOptions({ key: "calibration_examples" }),
  );

  const updateMutation = useMutation(
    trpc.aiSettings.updateConfig.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.aiSettings.getConfig.queryOptions({
            key: "calibration_examples",
          }).queryKey,
        });
        toast.success("Exemplos salvos com sucesso");
        closeForm();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao salvar exemplos");
      },
    }),
  );

  const resetMutation = useMutation(
    trpc.aiSettings.resetConfig.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.aiSettings.getConfig.queryOptions({
            key: "calibration_examples",
          }).queryKey,
        });
        toast.success("Exemplos restaurados para o padrao");
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao restaurar exemplos");
      },
    }),
  );

  function parseExamples(): CalibrationExample[] {
    try {
      const val = examplesQuery.data?.value;
      if (!val) return [];
      return JSON.parse(val) as CalibrationExample[];
    } catch {
      return [];
    }
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingIndex(null);
    setCondition("");
    setFeedbackType("");
    setPoints("");
    setNote("");
  }

  function openCreateForm() {
    setEditingIndex(null);
    setCondition("");
    setFeedbackType("");
    setPoints("");
    setNote("");
    setIsFormOpen(true);
  }

  function openEditForm(index: number) {
    const examples = parseExamples();
    const ex = examples[index];
    if (!ex) return;
    setEditingIndex(index);
    setCondition(ex.condition);
    setFeedbackType(ex.feedbackType);
    setPoints(ex.points);
    setNote(ex.note);
    setIsFormOpen(true);
  }

  function handleSaveExample() {
    const examples = parseExamples();
    const newExample: CalibrationExample = {
      condition,
      feedbackType,
      points,
      note,
    };

    if (editingIndex !== null) {
      examples[editingIndex] = newExample;
    } else {
      examples.push(newExample);
    }

    updateMutation.mutate({
      key: "calibration_examples",
      value: JSON.stringify(examples),
    });
  }

  function handleRemoveExample(index: number) {
    const examples = parseExamples();
    examples.splice(index, 1);
    updateMutation.mutate({
      key: "calibration_examples",
      value: JSON.stringify(examples.length > 0 ? examples : []),
    });
  }

  if (examplesQuery.isLoading) return <Loader />;

  const examples = parseExamples();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-tertiary">
          {examples.length} exemplo(s) configurado(s) — Recomendado: 3 a 5
        </p>
        <div className="flex gap-2">
          <Button
            color="secondary"
            size="sm"
            isLoading={resetMutation.isPending}
            onClick={() =>
              resetMutation.mutate({ key: "calibration_examples" })
            }
          >
            Restaurar Padrao
          </Button>
          <Button color="primary" size="sm" onClick={openCreateForm}>
            Novo Exemplo
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <div className="space-y-3 rounded-xl border border-secondary bg-primary p-4">
          <h3 className="text-sm font-semibold text-primary">
            {editingIndex !== null ? "Editar Exemplo" : "Novo Exemplo"}
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-secondary">
              Condicao
            </label>
            <textarea
              rows={2}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="Descreva a condicao..."
              className={inputClasses}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                Tipo de Feedback
              </label>
              <input
                type="text"
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
                placeholder="Ex: Saudacao incorreta"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                Pontos
              </label>
              <input
                type="text"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="+2, -3, 0"
                className={inputClasses}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">
                Nota adicional
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Opcional"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button color="secondary" size="sm" onClick={closeForm}>
              Cancelar
            </Button>
            <Button
              color="primary"
              size="sm"
              isLoading={updateMutation.isPending}
              isDisabled={!condition || !feedbackType || !points}
              onClick={handleSaveExample}
            >
              Salvar
            </Button>
          </div>
        </div>
      )}

      {examples.length === 0 ? (
        <p className="py-12 text-center text-sm text-tertiary">
          Nenhum exemplo configurado
        </p>
      ) : (
        <div className="space-y-3">
          {examples.map((ex, i) => (
            <div
              key={`${ex.feedbackType}-${i}`}
              className="rounded-xl border border-secondary bg-primary p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-primary">{ex.condition}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge color="blue" size="sm">
                      {ex.feedbackType}
                    </Badge>
                    <span className="font-mono text-sm text-secondary">
                      {ex.points}
                    </span>
                    {ex.note && (
                      <span className="text-xs text-tertiary">
                        — {ex.note}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    color="tertiary"
                    size="sm"
                    onClick={() => openEditForm(i)}
                  >
                    Editar
                  </Button>
                  <Button
                    color="tertiary"
                    size="sm"
                    onClick={() => handleRemoveExample(i)}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VectorStoreTab() {
  const queryClient = useQueryClient();

  const statsQuery = useQuery(trpc.aiSettings.vectorStoreStats.queryOptions());
  const correctionsQuery = useQuery(
    trpc.aiSettings.recentCorrections.queryOptions({ limit: 20 }),
  );

  const backfillMutation = useMutation(
    trpc.aiSettings.backfillCorrections.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.aiSettings.vectorStoreStats.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.aiSettings.recentCorrections.queryOptions({ limit: 20 })
            .queryKey,
        });
        toast.success(`Sincronizado: ${data.synced} de ${data.total}`);
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao sincronizar");
      },
    }),
  );

  const removeMutation = useMutation(
    trpc.aiSettings.removeCorrectionFromVectorStore.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.aiSettings.vectorStoreStats.queryOptions().queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: trpc.aiSettings.recentCorrections.queryOptions({ limit: 20 })
            .queryKey,
        });
        toast.success("Correcao removida do Vector Store");
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao remover correcao");
      },
    }),
  );

  if (statsQuery.isLoading) return <Loader />;

  const stats = statsQuery.data;
  const corrections = correctionsQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      {stats && (
        <div className="rounded-xl border border-secondary bg-primary p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="font-mono text-xs text-tertiary">ID: {stats.id}</p>
              <div className="flex items-center gap-4">
                <span className="text-sm text-secondary">
                  Arquivos:{" "}
                  <span className="font-semibold text-primary">
                    {stats.fileCount}
                  </span>
                </span>
                <span className="text-sm text-secondary">
                  Tamanho:{" "}
                  <span className="font-semibold text-primary">
                    {formatBytes(stats.usageBytes)}
                  </span>
                </span>
                <Badge
                  color={stats.status === "completed" ? "success" : "gray"}
                  size="sm"
                >
                  {stats.status}
                </Badge>
              </div>
            </div>
            <Button
              color="primary"
              size="sm"
              isLoading={backfillMutation.isPending}
              onClick={() => backfillMutation.mutate()}
            >
              Sincronizar correcoes pendentes
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-primary">
          Correcoes Recentes
        </h3>

        {correctionsQuery.isLoading ? (
          <Loader />
        ) : corrections.length === 0 ? (
          <p className="py-8 text-center text-sm text-tertiary">
            Nenhuma correcao encontrada
          </p>
        ) : (
          <div className="space-y-2">
            {corrections.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-secondary bg-primary px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Badge
                    color={outcomeBadgeColor[c.outcome] ?? "gray"}
                    size="sm"
                  >
                    {outcomeLabels[c.outcome] ?? c.outcome}
                  </Badge>
                  <Badge color="blue" size="sm">
                    {c.suggestedFeedbackTypeName}
                  </Badge>
                  <span className="truncate text-sm text-secondary">
                    {c.message.text.slice(0, 80)}
                    {c.message.text.length > 80 ? "..." : ""}
                  </span>
                  {c.correctionNote && (
                    <span className="shrink-0 text-xs text-tertiary">
                      — {c.correctionNote}
                    </span>
                  )}
                </div>
                <Button
                  color="tertiary"
                  size="sm"
                  isLoading={removeMutation.isPending}
                  onClick={() =>
                    removeMutation.mutate({ suggestionId: c.id })
                  }
                >
                  Remover do Vector Store
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsTab() {
  const accuracyQuery = useQuery(trpc.ai.accuracyStats.queryOptions());
  const byTypeQuery = useQuery(
    trpc.aiSettings.accuracyByFeedbackType.queryOptions(),
  );
  const rejectionsQuery = useQuery(
    trpc.aiSettings.topRejectionReasons.queryOptions(),
  );

  if (accuracyQuery.isLoading) return <Loader />;

  const stats = accuracyQuery.data;
  const byType = byTypeQuery.data ?? [];
  const rejections = rejectionsQuery.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Resumo Geral
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
            <p className="text-sm font-medium text-tertiary">Total</p>
            <p className="mt-1 text-display-sm font-semibold text-primary">
              {stats?.total ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
            <p className="text-sm font-medium text-tertiary">Aceitas</p>
            <p className="mt-1 text-display-sm font-semibold text-success-primary">
              {stats?.accepted ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
            <p className="text-sm font-medium text-tertiary">Editadas</p>
            <p className="mt-1 text-display-sm font-semibold text-warning-primary">
              {stats?.edited ?? 0}
            </p>
          </div>
          <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
            <p className="text-sm font-medium text-tertiary">Rejeitadas</p>
            <p className="mt-1 text-display-sm font-semibold text-error-primary">
              {stats?.rejected ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
            <p className="text-sm font-medium text-tertiary">
              Taxa de Precisao
            </p>
            <p className="mt-1 text-display-md font-semibold text-primary">
              {stats?.accuracyRate != null ? `${stats.accuracyRate}%` : "—"}
            </p>
          </div>
          <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset">
            <p className="text-sm font-medium text-tertiary">Taxa Util</p>
            <p className="mt-1 text-display-md font-semibold text-primary">
              {stats?.usefulRate != null ? `${stats.usefulRate}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Precisao por Tipo de Feedback
        </h3>

        {byTypeQuery.isLoading ? (
          <Loader />
        ) : byType.length === 0 ? (
          <p className="py-8 text-center text-sm text-tertiary">
            Sem dados disponiveis
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-secondary">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-secondary">
                  <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                    Aceitas
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                    Editadas
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                    Rejeitadas
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                    Taxa Util
                  </th>
                </tr>
              </thead>
              <tbody>
                {byType.map((row) => (
                  <tr
                    key={row.feedbackTypeName}
                    className="border-b border-secondary"
                  >
                    <td className="px-4 py-3 font-medium text-primary">
                      {row.feedbackTypeName}
                    </td>
                    <td className="px-4 py-3 text-primary">{row.total}</td>
                    <td className="px-4 py-3 text-success-primary">
                      {row.accepted}
                    </td>
                    <td className="px-4 py-3 text-warning-primary">
                      {row.edited}
                    </td>
                    <td className="px-4 py-3 text-error-primary">
                      {row.rejected}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cx(
                          "font-semibold",
                          row.usefulRate >= 70
                            ? "text-success-primary"
                            : row.usefulRate >= 40
                              ? "text-warning-primary"
                              : "text-error-primary",
                        )}
                      >
                        {row.usefulRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Ultimas Rejeicoes
        </h3>

        {rejectionsQuery.isLoading ? (
          <Loader />
        ) : rejections.length === 0 ? (
          <p className="py-8 text-center text-sm text-tertiary">
            Nenhuma rejeicao encontrada
          </p>
        ) : (
          <div className="space-y-2">
            {rejections.slice(0, 10).map((r, i) => (
              <div
                key={`${r.suggestedType}-${i}`}
                className="flex items-center gap-3 rounded-xl border border-secondary bg-primary px-4 py-3"
              >
                <Badge color="blue" size="sm">
                  {r.suggestedType}
                </Badge>
                <span className="text-sm text-secondary">{r.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("prompt");

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-display-xs font-semibold text-primary">
        Configuracoes de IA
      </h1>

      <div className="mb-6 flex gap-1 rounded-xl bg-secondary p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cx(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition",
              activeTab === tab.key
                ? "bg-primary text-primary shadow-xs"
                : "text-tertiary hover:text-secondary",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "prompt" && <PromptTab />}
      {activeTab === "examples" && <ExamplesTab />}
      {activeTab === "vectorstore" && <VectorStoreTab />}
      {activeTab === "stats" && <StatsTab />}
    </div>
  );
}
