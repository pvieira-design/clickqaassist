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

const roleLabels: Record<string, string> = {
  admin: "Admin",
  leader: "Líder",
  staff: "Atendente",
};

const roleBadgeColor: Record<string, "purple" | "blue" | "gray"> = {
  admin: "purple",
  leader: "blue",
  staff: "gray",
};

const formSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string(),
  role: z.enum(["admin", "leader", "staff"]),
  departmentId: z.string().nullable(),
  chatGuruName: z.string(),
  phone: z.string(),
});

interface EditingUser {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  chatGuruName: string | null;
  phone: string | null;
}

export default function UsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [filterDepartmentId, setFilterDepartmentId] = useState("");
  const [selectedChatGuruUsers, setSelectedChatGuruUsers] = useState<
    Set<string>
  >(new Set());
  const [importDepartmentId, setImportDepartmentId] = useState("");
  const [importRole, setImportRole] = useState<"leader" | "staff">("staff");

  const queryClient = useQueryClient();

  const departments = useQuery(trpc.department.list.queryOptions());
  const users = useQuery(trpc.user.list.queryOptions());
  const chatGuruUsers = useQuery({
    ...trpc.user.fetchChatGuruUsers.queryOptions(),
    enabled: isImportModalOpen,
  });

  const createMutation = useMutation(
    trpc.user.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.user.list.queryOptions().queryKey,
        });
        toast.success("Usuário criado com sucesso");
        closeModal();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao criar usuário");
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.user.list.queryOptions().queryKey,
        });
        toast.success("Usuário atualizado com sucesso");
        closeModal();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao atualizar usuário");
      },
    }),
  );

  const toggleMutation = useMutation(
    trpc.user.toggleActive.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.user.list.queryOptions().queryKey,
        });
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao alterar status");
      },
    }),
  );

  const importMutation = useMutation(
    trpc.user.importFromChatGuru.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({
          queryKey: trpc.user.list.queryOptions().queryKey,
        });
        toast.success(`${data.length} usuário(s) importado(s) com sucesso`);
        closeImportModal();
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao importar usuários");
      },
    }),
  );

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "staff" as "admin" | "leader" | "staff",
      departmentId: null as string | null,
      chatGuruName: "",
      phone: "",
    },
    onSubmit: async ({ value }) => {
      if (editingUser) {
        updateMutation.mutate({
          id: editingUser.id,
          name: value.name,
          email: value.email,
          role: value.role,
          departmentId: value.departmentId,
          chatGuruName: value.chatGuruName || null,
          phone: value.phone || null,
        });
      } else {
        if (!value.password) {
          toast.error("Senha é obrigatória");
          return;
        }
        createMutation.mutate({
          name: value.name,
          email: value.email,
          password: value.password,
          role: value.role,
          departmentId: value.departmentId,
          chatGuruName: value.chatGuruName || undefined,
          phone: value.phone || undefined,
        });
      }
    },
    validators: {
      onSubmit: formSchema,
    },
  });

  function openCreateModal() {
    setEditingUser(null);
    form.reset();
    setIsModalOpen(true);
  }

  function openEditModal(user: EditingUser) {
    setEditingUser(user);
    form.setFieldValue("name", user.name);
    form.setFieldValue("email", user.email);
    form.setFieldValue("password", "");
    form.setFieldValue("role", user.role as "admin" | "leader" | "staff");
    form.setFieldValue("departmentId", user.departmentId);
    form.setFieldValue("chatGuruName", user.chatGuruName ?? "");
    form.setFieldValue("phone", user.phone ?? "");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingUser(null);
    form.reset();
  }

  function openImportModal() {
    setSelectedChatGuruUsers(new Set());
    setImportDepartmentId("");
    setImportRole("staff");
    setIsImportModalOpen(true);
  }

  function closeImportModal() {
    setIsImportModalOpen(false);
    setSelectedChatGuruUsers(new Set());
  }

  function toggleChatGuruUserSelection(userId: string) {
    const next = new Set(selectedChatGuruUsers);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedChatGuruUsers(next);
  }

  function handleSelectAll() {
    if (!chatGuruUsers.data) return;
    const allIds = chatGuruUsers.data.users.map((u) => u.id);
    if (selectedChatGuruUsers.size === allIds.length) {
      setSelectedChatGuruUsers(new Set());
    } else {
      setSelectedChatGuruUsers(new Set(allIds));
    }
  }

  function handleImport() {
    if (!chatGuruUsers.data || !importDepartmentId) return;
    const selected = chatGuruUsers.data.users.filter((u) =>
      selectedChatGuruUsers.has(u.id),
    );
    importMutation.mutate({
      users: selected.map((u) => ({
        name: u.name,
        chatGuruName: u.name,
        departmentId: importDepartmentId,
        role: importRole,
      })),
    });
  }

  if (users.isLoading) {
    return <Loader />;
  }

  const allUsers = users.data ?? [];
  const filteredUsers = filterDepartmentId
    ? allUsers.filter((u) => u.departmentId === filterDepartmentId)
    : allUsers;
  const deptList = departments.data ?? [];

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-display-xs font-semibold text-primary">
          Usuários
        </h1>
        <div className="flex gap-2">
          <Button color="secondary" size="sm" onClick={openImportModal}>
            Importar do ChatGuru
          </Button>
          <Button color="primary" size="sm" onClick={openCreateModal}>
            Novo Usuário
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-secondary">
            Filtrar por Departamento
          </label>
          <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
            <select
              value={filterDepartmentId}
              onChange={(e) => setFilterDepartmentId(e.target.value)}
              className="m-0 w-full max-w-xs rounded-lg bg-transparent px-3 py-2 text-md text-primary outline-hidden"
            >
              <option value="">Todos</option>
              {deptList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <p className="py-12 text-center text-sm text-tertiary">
          Nenhum usuário encontrado
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
                  Email
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Departamento
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase text-tertiary">
                  Cargo
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
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-secondary">
                  <td className="px-4 py-3 font-medium text-primary">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-primary">{user.email}</td>
                  <td className="px-4 py-3 text-primary">
                    {user.department?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      color={roleBadgeColor[user.role ?? "staff"]}
                      size="sm"
                    >
                      {roleLabels[user.role ?? "staff"]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      isSelected={user.isActive ?? false}
                      onChange={() =>
                        toggleMutation.mutate({ id: user.id })
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      color="tertiary"
                      size="sm"
                      onClick={() =>
                        openEditModal({
                          id: user.id,
                          name: user.name,
                          email: user.email,
                          role: user.role ?? "staff",
                          departmentId: user.departmentId,
                          chatGuruName: user.chatGuruName,
                          phone: user.phone,
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
              {editingUser ? "Editar Usuário" : "Novo Usuário"}
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
                    placeholder="Nome do usuário"
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

              <form.Field name="email">
                {(field) => (
                  <Input
                    label="Email"
                    placeholder="email@exemplo.com"
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

              {!editingUser && (
                <form.Field name="password">
                  {(field) => (
                    <Input
                      label="Senha"
                      type="password"
                      placeholder="Senha"
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
              )}

              <form.Field name="phone">
                {(field) => (
                  <Input
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
                  />
                )}
              </form.Field>

              <form.Field name="role">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-secondary">
                      Cargo
                    </label>
                    <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
                      <select
                        value={field.state.value}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value as "admin" | "leader" | "staff",
                          )
                        }
                        onBlur={field.handleBlur}
                        className="m-0 w-full rounded-lg bg-transparent px-3 py-2 text-md text-primary outline-hidden"
                      >
                        <option value="admin">Admin</option>
                        <option value="leader">Líder</option>
                        <option value="staff">Atendente</option>
                      </select>
                    </div>
                  </div>
                )}
              </form.Field>

              <form.Field name="departmentId">
                {(field) => (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-secondary">
                      Departamento
                    </label>
                    <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
                      <select
                        value={field.state.value ?? ""}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value === "" ? null : e.target.value,
                          )
                        }
                        onBlur={field.handleBlur}
                        className="m-0 w-full rounded-lg bg-transparent px-3 py-2 text-md text-primary outline-hidden"
                      >
                        <option value="">Nenhum</option>
                        {deptList.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </form.Field>

              <form.Field name="chatGuruName">
                {(field) => (
                  <Input
                    label="Nome ChatGuru"
                    placeholder="Nome no ChatGuru (opcional)"
                    value={field.state.value}
                    onChange={field.handleChange}
                    onBlur={field.handleBlur}
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

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-primary p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-primary">
              Importar Usuários do ChatGuru
            </h2>

            {chatGuruUsers.isLoading ? (
              <div className="py-8 text-center text-sm text-tertiary">
                Carregando usuários...
              </div>
            ) : chatGuruUsers.data ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="cursor-pointer text-sm font-medium text-brand-secondary hover:text-brand-secondary_hover"
                  >
                    {selectedChatGuruUsers.size ===
                    chatGuruUsers.data.users.length
                      ? "Desmarcar Todos"
                      : "Selecionar Todos"}
                  </button>
                  <span className="text-xs text-tertiary">
                    {selectedChatGuruUsers.size} selecionado(s)
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-lg border border-secondary">
                  {chatGuruUsers.data.users.map((user) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-secondary px-4 py-2.5 last:border-b-0 hover:bg-primary_hover"
                    >
                      <input
                        type="checkbox"
                        checked={selectedChatGuruUsers.has(user.id)}
                        onChange={() =>
                          toggleChatGuruUserSelection(user.id)
                        }
                        className="size-4 rounded border-secondary accent-brand-solid"
                      />
                      <span className="text-sm text-primary">
                        {user.name}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary">
                    Departamento
                  </label>
                  <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
                    <select
                      value={importDepartmentId}
                      onChange={(e) =>
                        setImportDepartmentId(e.target.value)
                      }
                      className="m-0 w-full rounded-lg bg-transparent px-3 py-2 text-md text-primary outline-hidden"
                    >
                      <option value="">Selecione um departamento</option>
                      {deptList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary">
                    Cargo
                  </label>
                  <div className="rounded-lg bg-primary shadow-xs ring-1 ring-primary ring-inset">
                    <select
                      value={importRole}
                      onChange={(e) =>
                        setImportRole(e.target.value as "leader" | "staff")
                      }
                      className="m-0 w-full rounded-lg bg-transparent px-3 py-2 text-md text-primary outline-hidden"
                    >
                      <option value="leader">Líder</option>
                      <option value="staff">Atendente</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    color="secondary"
                    size="sm"
                    onClick={closeImportModal}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    color="primary"
                    size="sm"
                    isDisabled={
                      selectedChatGuruUsers.size === 0 || !importDepartmentId
                    }
                    isLoading={importMutation.isPending}
                    onClick={handleImport}
                  >
                    Importar Selecionados
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-tertiary">
                Erro ao carregar usuários do ChatGuru
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
