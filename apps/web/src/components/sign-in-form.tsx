"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import Loader from "./loader";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

export default function SignInForm() {
  const router = useRouter();
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        { email: value.email, password: value.password },
        {
          onSuccess: () => {
            router.push("/dashboard");
            toast.success("Login realizado com sucesso");
          },
          onError: (error) => {
            toast.error(error.error.message || "Erro ao fazer login");
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email("Email inválido"),
        password: z.string().min(1, "Senha é obrigatória"),
      }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className="mx-auto w-full mt-10 max-w-md p-6">
      <h1 className="mb-2 text-center text-display-xs font-semibold text-primary">
        Click QA Assistant
      </h1>
      <p className="mb-6 text-center text-sm text-tertiary">
        Entre com suas credenciais para acessar o sistema
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field name="email">
          {(field) => (
            <Input
              label="Email"
              type="email"
              placeholder="seu.email@clickcannabis.com"
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              hint={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Input
              label="Senha"
              type="password"
              placeholder="Digite sua senha"
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              isInvalid={field.state.meta.errors.length > 0}
              hint={field.state.meta.errors[0]?.message}
            />
          )}
        </form.Field>

        <form.Subscribe>
          {(state) => (
            <Button
              type="submit"
              color="primary"
              size="md"
              className="w-full"
              isDisabled={!state.canSubmit}
              isLoading={state.isSubmitting}
            >
              Entrar
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
