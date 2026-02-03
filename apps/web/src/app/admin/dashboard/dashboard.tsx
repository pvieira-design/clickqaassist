"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { trpc } from "@/utils/trpc";
import Loader from "@/components/loader";
import { Badge } from "@/components/base/badges/badges";
import { cx } from "@/utils/cx";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const YEARS = [2024, 2025, 2026];

const categoryBadgeColor: Record<string, "success" | "warning" | "error"> = {
  POSITIVE: "success",
  NEUTRAL: "warning",
  NEGATIVE: "error",
};

function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  return String(points);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [departmentId, setDepartmentId] = useState("");
  const [expandedChatId, setExpandedChatId] = useState<string | null>(null);
  const router = useRouter();

  const ranking = useQuery(
    trpc.score.ranking.queryOptions({
      month,
      year,
      departmentId: departmentId || undefined,
    }),
  );
  const summary = useQuery(
    trpc.score.summary.queryOptions({ month, year }),
  );
  const chatsWithFeedbacks = useQuery(
    trpc.score.chatsWithFeedbacks.queryOptions({
      month,
      year,
      departmentId: departmentId || undefined,
    }),
  );
  const departments = useQuery(trpc.department.list.queryOptions());

  const deptList = departments.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-display-xs font-semibold text-primary">
          Painel de Desempenho
        </h1>
        <div className="flex gap-2">
          <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="m-0 rounded-lg bg-transparent px-3 py-2 text-sm text-primary outline-hidden"
            >
              {MONTHS.map((label, i) => (
                <option key={i} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="m-0 rounded-lg bg-transparent px-3 py-2 text-sm text-primary outline-hidden"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {summary.isLoading ? (
        <Loader />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-secondary p-4">
            <p className="text-xs font-medium uppercase text-tertiary">
              Total de Feedbacks
            </p>
            <p className="mt-1 text-display-xs font-semibold text-primary">
              {summary.data?.totalFeedbacks ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-secondary p-4">
            <p className="text-xs font-medium uppercase text-tertiary">
              Agentes Avaliados
            </p>
            <p className="mt-1 text-display-xs font-semibold text-primary">
              {summary.data?.totalAgentsEvaluated ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-secondary p-4">
            <p className="text-xs font-medium uppercase text-tertiary">
              Pontuação Média
            </p>
            <p className="mt-1 text-display-xs font-semibold text-primary">
              {summary.data?.averageScore ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-secondary p-4">
            <p className="text-xs font-medium uppercase text-tertiary">
              Melhor Agente
            </p>
            <p className="mt-1 text-display-xs font-semibold text-primary">
              {summary.data?.topAgent?.name ?? "\u2014"}
            </p>
            {summary.data?.topAgent && (
              <p className="text-sm text-utility-success-700">
                {summary.data.topAgent.score} pts
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-secondary">
            Filtrar por Departamento
          </label>
          <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="m-0 w-full max-w-xs rounded-lg bg-transparent px-3 py-2 text-md text-primary outline-hidden"
            >
              <option value="">Todos os departamentos</option>
              {deptList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {ranking.isLoading ? (
        <Loader />
      ) : !ranking.data || ranking.data.length === 0 ? (
        <p className="py-12 text-center text-sm text-tertiary">
          Nenhum dado disponível para este período
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-secondary">
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  #
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Agente
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Departamento
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Positivos
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Neutros
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Negativos
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Total
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Pontuação
                </th>
              </tr>
            </thead>
            <tbody>
              {ranking.data.map((agent, index) => (
                <tr key={agent.agentId} className="border-b border-secondary">
                  <td className="px-4 py-3 font-medium text-tertiary">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">
                    {agent.agentName}
                  </td>
                  <td className="px-4 py-3 text-primary">
                    {agent.departmentName}
                  </td>
                  <td className="px-4 py-3 text-utility-success-700">
                    {agent.positiveCount}
                  </td>
                  <td className="px-4 py-3 text-tertiary">
                    {agent.neutralCount}
                  </td>
                  <td className="px-4 py-3 text-utility-error-700">
                    {agent.negativeCount}
                  </td>
                  <td className="px-4 py-3 text-primary">
                    {agent.totalFeedbacks}
                  </td>
                  <td
                    className={cx(
                      "px-4 py-3 font-semibold",
                      agent.totalPoints > 0
                        ? "text-utility-success-700"
                        : agent.totalPoints < 0
                          ? "text-utility-error-700"
                          : "text-tertiary",
                    )}
                  >
                    {agent.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-primary">
          Feedbacks por Chat
        </h2>

        {chatsWithFeedbacks.isLoading ? (
          <Loader />
        ) : !chatsWithFeedbacks.data || chatsWithFeedbacks.data.length === 0 ? (
          <p className="py-12 text-center text-sm text-tertiary">
            Nenhum feedback registrado neste período
          </p>
        ) : (
          <div className="space-y-3">
            {chatsWithFeedbacks.data.map((chat) => (
              <div
                key={chat.chatId}
                className="rounded-xl border border-secondary"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedChatId(
                      expandedChatId === chat.chatId ? null : chat.chatId,
                    )
                  }
                  className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-secondary_hover"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">
                      {chat.patientName}
                    </p>
                    {chat.patientPhone && (
                      <p className="mt-0.5 text-xs text-tertiary">
                        {chat.patientPhone}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {chat.positiveCount > 0 && (
                      <Badge color="success" size="sm">
                        {chat.positiveCount} positivo{chat.positiveCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {chat.neutralCount > 0 && (
                      <Badge color="warning" size="sm">
                        {chat.neutralCount} neutro{chat.neutralCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {chat.negativeCount > 0 && (
                      <Badge color="error" size="sm">
                        {chat.negativeCount} negativo{chat.negativeCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    <span className="text-xs text-tertiary">
                      {expandedChatId === chat.chatId ? "\u25B2" : "\u25BC"}
                    </span>
                  </div>
                </button>

                {expandedChatId === chat.chatId && (
                  <div className="border-t border-secondary">
                    <div className="divide-y divide-secondary">
                      {chat.feedbacks.map((fb) => (
                        <div key={fb.id} className="flex items-start gap-3 px-4 py-3">
                          <Badge
                            color={categoryBadgeColor[fb.category]}
                            size="sm"
                          >
                            {fb.feedbackTypeName} ({formatPoints(fb.points)})
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-tertiary">
                              Agente: <span className="font-medium text-secondary">{fb.agentName}</span>
                              {" \u00B7 "}
                              Por: <span className="font-medium text-secondary">{fb.registeredByName}</span>
                              {" \u00B7 "}
                              {formatDate(fb.createdAt)}
                            </p>
                            {fb.comment && (
                              <p className="mt-1 text-sm text-secondary">
                                {fb.comment}
                              </p>
                            )}
                            <p className="mt-1 truncate text-xs italic text-tertiary">
                              &ldquo;{fb.messageExcerpt}&rdquo;
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-secondary px-4 py-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/chat/${chat.chatId}`)}
                        className="text-sm font-medium text-brand-primary transition hover:text-brand-secondary"
                      >
                        Abrir chat completo &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
