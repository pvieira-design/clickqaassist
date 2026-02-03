"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BarChart01,
  ChevronDown,
  ChevronUp,
  MessageChatCircle,
  Trophy01,
  Users01,
} from "@untitledui/icons";
import { trpc } from "@/utils/trpc";
import Loader from "@/components/loader";
import { Badge } from "@/components/base/badges/badges";
import { NativeSelect } from "@/components/base/select/select-native";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { Table, TableCard } from "@/components/application/table/table";
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

  const monthOptions = MONTHS.map((label, i) => ({
    label,
    value: String(i + 1),
  }));

  const yearOptions = YEARS.map((y) => ({
    label: String(y),
    value: String(y),
  }));

  const departmentOptions = [
    { label: "Todos os departamentos", value: "" },
    ...deptList.map((d) => ({ label: d.name, value: d.id })),
  ];

  const rankingItems =
    ranking.data?.map((a, index) => ({
      ...a,
      id: a.agentId,
      position: index + 1,
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-display-xs font-semibold text-primary">
          Painel de Desempenho
        </h1>
        <div className="flex items-end gap-2">
          <NativeSelect
            options={monthOptions}
            value={String(month)}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-auto"
          />
          <NativeSelect
            options={yearOptions}
            value={String(year)}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-auto"
          />
        </div>
      </div>

      {summary.isLoading ? (
        <Loader />
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
            <div className="flex flex-col gap-4 px-4 py-5 md:gap-5 md:px-5">
              <FeaturedIcon color="gray" theme="modern" icon={MessageChatCircle} size="lg" />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-tertiary">Total de Feedbacks</h3>
                <p className="text-display-sm font-semibold text-primary">
                  {summary.data?.totalFeedbacks ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
            <div className="flex flex-col gap-4 px-4 py-5 md:gap-5 md:px-5">
              <FeaturedIcon color="gray" theme="modern" icon={Users01} size="lg" />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-tertiary">Agentes Avaliados</h3>
                <p className="text-display-sm font-semibold text-primary">
                  {summary.data?.totalAgentsEvaluated ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
            <div className="flex flex-col gap-4 px-4 py-5 md:gap-5 md:px-5">
              <FeaturedIcon color="gray" theme="modern" icon={BarChart01} size="lg" />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-tertiary">Pontuação Média</h3>
                <p className={cx(
                  "text-display-sm font-semibold",
                  (summary.data?.averageScore ?? 0) > 0
                    ? "text-success-primary"
                    : (summary.data?.averageScore ?? 0) < 0
                      ? "text-error-primary"
                      : "text-primary",
                )}>
                  {summary.data?.averageScore ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-primary shadow-xs ring-1 ring-secondary ring-inset">
            <div className="flex flex-col gap-4 px-4 py-5 md:gap-5 md:px-5">
              <FeaturedIcon color="gray" theme="modern" icon={Trophy01} size="lg" />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-medium text-tertiary">Melhor Agente</h3>
                <p className="text-display-sm font-semibold text-primary">
                  {summary.data?.topAgent?.name ?? "\u2014"}
                </p>
                {summary.data?.topAgent && (
                  <p className="text-sm font-medium text-success-primary">
                    {summary.data.topAgent.score} pts
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <NativeSelect
          label="Filtrar por Departamento"
          options={departmentOptions}
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {ranking.isLoading ? (
        <Loader />
      ) : !ranking.data || ranking.data.length === 0 ? (
        <p className="py-12 text-center text-sm text-tertiary">
          Nenhum dado disponível para este período
        </p>
      ) : (
        <TableCard.Root>
          <TableCard.Header
            title="Ranking"
            badge={`${ranking.data.length} agentes`}
            description="Classificação de agentes por pontuação no período"
          />
          <Table>
            <Table.Header>
              <Table.Head label="#" />
              <Table.Head label="Agente" />
              <Table.Head label="Departamento" />
              <Table.Head label="Positivos" />
              <Table.Head label="Neutros" />
              <Table.Head label="Negativos" />
              <Table.Head label="Total" />
              <Table.Head label="Pontuação" />
            </Table.Header>
            <Table.Body items={rankingItems}>
              {(agent) => (
                <Table.Row id={agent.id}>
                  <Table.Cell>
                    <span className="font-medium text-tertiary">
                      {agent.position}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="font-medium text-primary">
                      {agent.agentName}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-primary">
                      {agent.departmentName}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-utility-success-700">
                      {agent.positiveCount}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-tertiary">
                      {agent.neutralCount}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-utility-error-700">
                      {agent.negativeCount}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span className="text-primary">
                      {agent.totalFeedbacks}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <span
                      className={cx(
                        "font-semibold",
                        agent.totalPoints > 0
                          ? "text-utility-success-700"
                          : agent.totalPoints < 0
                            ? "text-utility-error-700"
                            : "text-tertiary",
                      )}
                    >
                      {agent.totalPoints}
                    </span>
                  </Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </TableCard.Root>
      )}

      <div className="mt-8">
        <div className="overflow-hidden rounded-xl bg-primary shadow-xs ring-1 ring-secondary">
          <div className="flex items-center gap-2 border-b border-secondary px-4 py-5 md:px-6">
            <MessageChatCircle className="size-5 text-fg-quaternary" />
            <h2 className="text-lg font-semibold text-primary">
              Feedbacks por Chat
            </h2>
          </div>

          <div className="p-4 md:px-6">
            {chatsWithFeedbacks.isLoading ? (
              <Loader />
            ) : !chatsWithFeedbacks.data ||
              chatsWithFeedbacks.data.length === 0 ? (
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
                            {chat.positiveCount} positivo
                            {chat.positiveCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {chat.neutralCount > 0 && (
                          <Badge color="warning" size="sm">
                            {chat.neutralCount} neutro
                            {chat.neutralCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {chat.negativeCount > 0 && (
                          <Badge color="error" size="sm">
                            {chat.negativeCount} negativo
                            {chat.negativeCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                        {expandedChatId === chat.chatId ? (
                          <ChevronUp className="size-4 text-fg-quaternary" />
                        ) : (
                          <ChevronDown className="size-4 text-fg-quaternary" />
                        )}
                      </div>
                    </button>

                    {expandedChatId === chat.chatId && (
                      <div className="border-t border-secondary">
                        <div className="divide-y divide-secondary">
                          {chat.feedbacks.map((fb) => (
                            <div
                              key={fb.id}
                              className="flex items-start gap-3 px-4 py-3"
                            >
                              <Badge
                                color={categoryBadgeColor[fb.category]}
                                size="sm"
                              >
                                {fb.feedbackTypeName} (
                                {formatPoints(fb.points)})
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs text-tertiary">
                                  Agente:{" "}
                                  <span className="font-medium text-secondary">
                                    {fb.agentName}
                                  </span>
                                  {" \u00B7 "}
                                  Por:{" "}
                                  <span className="font-medium text-secondary">
                                    {fb.registeredByName}
                                  </span>
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
                            onClick={() =>
                              router.push(`/chat/${chat.chatId}`)
                            }
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
      </div>
    </div>
  );
}
