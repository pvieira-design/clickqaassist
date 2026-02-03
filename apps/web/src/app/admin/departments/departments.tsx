"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import Loader from "@/components/loader";

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
});

interface EditingItem {
  id: string;
  name: string;
}

export default function DepartmentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  const queryClient = useQueryClient();

  const departments = useQuery(trpc.department.list.queryOptions());

  const createMutation = useMutation(
    trpc.department.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.department.list.queryOptions().queryKey,
        });
        toast.success("Departamento criado com sucesso");
        closeModal();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao criar departamento");
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.department.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.department.list.queryOptions().queryKey,
        });
        toast.success("Departamento atualizado com sucesso");
        closeModal();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao atualizar departamento");
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: "",
    },
    onSubmit: async ({ value }) => {
      if (editingItem) {
        updateMutation.mutate({
          id: editingItem.id,
          name: value.name,
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
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingItem(null);
    form.reset();
  }

  if (departments.isLoading) {
    return <Loader />;
  }

  const data = departments.data ?? [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-display-xs font-semibold text-primary">
          Departamentos
        </h1>
        <Button color="primary" size="sm" onClick={openCreateModal}>
          Novo Departamento
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="py-12 text-center text-sm text-tertiary">
          Nenhum departamento cadastrado
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
                  Usuários
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
                  <td className="px-4 py-3 text-primary">
                    {item._count.users}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      color="tertiary"
                      size="sm"
                      onClick={() =>
                        openEditModal({
                          id: item.id,
                          name: item.name,
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
              {editingItem ? "Editar Departamento" : "Novo Departamento"}
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
                    placeholder="Nome do departamento"
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
