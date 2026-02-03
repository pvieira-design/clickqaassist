"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

export default function ImportChat() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const importMutation = useMutation(
    trpc.chat.import.mutationOptions({
      onSuccess: (data) => {
        if (data.isExisting) {
          toast.success("Chat re-importado com sucesso");
        } else {
          toast.success("Chat importado com sucesso");
        }
        router.push(`/chat/${data.chat.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao importar chat");
      },
    }),
  );

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="text-display-xs font-semibold text-primary mb-2">
        Importar Chat
      </h1>
      <p className="text-sm text-tertiary mb-6">
        Cole o link do ChatGuru para importar a conversa
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!url.trim()) return;
          importMutation.mutate({ url });
        }}
        className="space-y-4"
      >
        <Input
          label="Link do ChatGuru"
          placeholder="https://s21.chatguru.app/chats#..."
          value={url}
          onChange={setUrl}
        />

        <Button
          type="submit"
          color="primary"
          size="md"
          isLoading={importMutation.isPending}
          isDisabled={!url.trim()}
        >
          Importar
        </Button>
      </form>
    </div>
  );
}
