"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Toggle } from "@/components/base/toggle/toggle";
import { Badge } from "@/components/base/badges/badges";
import Loader from "@/components/loader";

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

function formatPoints(points: number): string {
  if (points > 0) return `+${points}`;
  return String(points);
}

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  category: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  points: z.number().int("Pontos deve ser número inteiro"),
});

interface EditingItem {
  id: string;
  name: string;
  category: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  points: number;
}

export default function FeedbackTypesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const queryClient = useQueryClient();

  const feedbackTypes = useQuery(trpc.feedbackType.listAll.queryOptions());

  const createMutation = useMutation(
    trpc.feedbackType.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.feedbackType.listAll.queryOptions().queryKey,
        });
        toast.success("Tipo de feedback criado com sucesso");
        closeModal();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao criar tipo de feedback");
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.feedbackType.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.feedbackType.listAll.queryOptions().queryKey,
        });
        toast.success("Tipo de feedback atualizado com sucesso");
        closeModal();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao atualizar tipo de feedback");
      },
    }),
  );

  const toggleMutation = useMutation(
    trpc.feedbackType.toggleActive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.feedbackType.listAll.queryOptions().queryKey,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao alterar status");
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: "",
      category: "NEGATIVE" as "POSITIVE" | "NEUTRAL" | "NEGATIVE",
      points: 0,
    },
    onSubmit: async ({ value }) => {
      if (editingItem) {
        updateMutation.mutate({
          id: editingItem.id,
          name: value.name,
          category: value.category,
          points: value.points,
        });
      } else {
        createMutation.mutate(value);
      }
    },
    validators: {
      onSubmit: formSchema,
    },
  });

  function openCreateModal() {
    setEditingItem(null);
    form.reset();
    setIsModalOpen(true);
  }

  function openEditModal(item: EditingItem) {
    setEditingItem(item);
    form.setFieldValue("name", item.name);
    form.setFieldValue("category", item.category);
    form.setFieldValue("points", item.points);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingItem(null);
    form.reset();
  }

  if (feedbackTypes.isLoading) {
    return <Loader />;
  }

  const data = feedbackTypes.data ?? [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-display-xs font-semibold text-primary">
          Tipos de Feedback
        </h1>
        <Button color="primary" size="sm" onClick={openCreateModal}>
          Novo Tipo
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-tertiary">
          Nenhum tipo de feedback cadastrado
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-secondary">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-secondary">
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Nome
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Categoria
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Pontos
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Ativo
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id} className="border-b border-secondary">
                  <td className="px-4 py-3 font-medium text-primary">
                    {item.name}
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={categoryBadgeColor[item.category]} size="sm">
                      {categoryLabels[item.category]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-primary">
                    {formatPoints(item.points)}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      isSelected={item.isActive}
                      onChange={() =>
                        toggleMutation.mutate({ id: item.id })
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      color="tertiary"
                      size="sm"
                      onClick={() =>
                        openEditModal({
                          id: item.id,
                          name: item.name,
                          category: item.category,
                          points: item.points,
                        })
                      }
                    >
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-primary p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-primary">
              {editingItem
                ? "Editar Tipo de Feedback"
                : "Novo Tipo de Feedback"}
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                form.handleSubmit();
              }}
              className="space-y-4"
            >
              <form.Field name="name">
                {(field) => (
                  <Input
                    label="Nome"
                    placeholder="Nome do tipo de feedback"
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                    isInvalid={field.state.meta.errors.length > 0}
                    hint={
                      field.state.meta.errors.length > 0
                        ? field.state.meta.errors[0]?.message
                        : undefined
                    }
                  />
                )}
              </form.Field>

              <form.Field name="category">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-secondary">
                      Categoria
                    </label>
                    <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
                      <select
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value as
                              | "POSITIVE"
                              | "NEUTRAL"
                              | "NEGATIVE",
                          )
                        }
                        onBlur={field.handleBlur}
                        className="m-0 w-full rounded-lg bg-transparent px-3 py-2 text-md text-primary outline-hidden"
                      >
                        <option value="POSITIVE">Positivo</option>
                        <option value="NEUTRAL">Neutro</option>
                        <option value="NEGATIVE">Negativo</option>
                      </select>
                    </div>
                  </div>
                )}
              </form.Field>

              <form.Field name="points">
                {(field) => (
                  <Input
                    label="Pontos"
                    type="number"
                    placeholder="0"
                    value={String(field.state.value)}
                    onChange={(val) =>
                      field.handleChange(
                        val === "" ? 0 : parseInt(val, 10),
                      )
                    }
                    onBlur={field.handleBlur}
                    isInvalid={field.state.meta.errors.length > 0}
                    hint={
                      field.state.meta.errors.length > 0
                        ? field.state.meta.errors[0]?.message
                        : undefined
                    }
                  />
                )}
              </form.Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  color="secondary"
                  size="sm"
                  onClick={closeModal}
                >
                  Cancelar
                </Button>
                <form.Subscribe>
                  {(state) => (
                    <Button
                      type="submit"
                      color="primary"
                      size="sm"
                      isDisabled={!state.canSubmit}
                      isLoading={state.isSubmitting}
                    >
                      Salvar
                    </Button>
                  )}
                </form.Subscribe>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
