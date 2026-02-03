"use client";

import { useRouter } from "next/navigation";
import { LogOut01 } from "@untitledui/icons";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Button } from "@/components/base/buttons/button";
import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <div className="h-10 animate-pulse rounded-lg bg-secondary" />;
  }

  if (!session) {
    return (
      <Button color="secondary" size="sm" href="/login">
        Entrar
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 truncate">
        <p className="truncate text-sm font-medium text-primary">{session.user.name}</p>
        <p className="truncate text-xs text-tertiary">{session.user.email}</p>
      </div>
      <Dropdown.Root>
        <Button color="tertiary" size="sm">
          <LogOut01 className="size-4" />
        </Button>
        <Dropdown.Popover>
          <Dropdown.Menu>
            <Dropdown.Item
              label="Sair"
              icon={LogOut01}
              onAction={() => {
                authClient.signOut({
                  fetchOptions: { onSuccess: () => router.push("/login") },
                });
              }}
            />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </div>
  );
}
