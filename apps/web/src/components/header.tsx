"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cx } from "@/utils/cx";
import UserMenu from "./user-menu";

const adminLinks = [
  { href: "/admin/dashboard" as const, label: "Painel de Desempenho" },
  { href: "/feedback/new" as const, label: "Importar Chat" },
  { href: "/admin/feedback-types" as const, label: "Tipos de Feedback" },
  { href: "/admin/departments" as const, label: "Departamentos" },
  { href: "/admin/users" as const, label: "Usuários" },
  { href: "/admin/ai-settings" as const, label: "Configurações da IA" },
];

const leaderLinks = [
  { href: "/admin/dashboard" as const, label: "Painel de Desempenho" },
  { href: "/feedback/new" as const, label: "Importar Chat" },
  { href: "/meus-feedbacks" as const, label: "Meus Feedbacks" },
];

const staffLinks = [
  { href: "/meus-feedbacks" as const, label: "Meus Feedbacks" },
];

function getLinksForRole(role: string | undefined) {
  if (role === "admin") return adminLinks;
  if (role === "leader") return leaderLinks;
  return staffLinks;
}

export default function Header() {
  const { data: session } = authClient.useSession();
  const pathname = usePathname();

  if (!session) return null;

  const role = (session.user as { role?: string } | undefined)?.role;
  const links = getLinksForRole(role);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-secondary bg-primary">
      <div className="px-5 py-4">
        <h1 className="text-lg font-bold text-primary">Click QA</h1>
        <p className="text-xs text-tertiary">Quality Assurance</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cx(
              "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition",
              pathname === link.href || pathname.startsWith(link.href + "/")
                ? "bg-brand-primary_alt text-brand-secondary"
                : "text-secondary hover:bg-secondary_hover hover:text-primary",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-secondary p-3">
        <UserMenu />
      </div>
    </aside>
  );
}
