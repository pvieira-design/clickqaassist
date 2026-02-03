# Migrar shadcn/ui para Untitled UI — Step by Step

Guia definitivo para substituir completamente shadcn/ui por Untitled UI em projetos Next.js + TailwindCSS v4. Baseado na migração real do projeto clickqaassist (Better-T-Stack: Next.js, tRPC, Prisma, Better-Auth).

---

## Pré-requisitos

- Next.js 15+ com App Router
- TailwindCSS v4
- Node.js 18+

---

## Step 1 — Inicializar Untitled UI

```bash
cd apps/web  # ou raiz do projeto Next.js
npx untitledui@latest init --nextjs --overwrite --color brand
```

Isso cria três arquivos na raiz de `src/`:

| Arquivo | Função |
|---------|--------|
| `src/globals.css` | Entry point CSS — importa tailwindcss + theme + typography + plugins |
| `src/theme.css` | Design tokens (cores, shadows, radius, tipografia) |
| `src/typography.css` | Classes de tipografia do Untitled UI |

Também instala as dependências: `tailwind-merge`, `react-aria-components`, `@untitledui/icons`, `tailwindcss-react-aria-components`, `tailwindcss-animate`, `@tailwindcss/typography`.

---

## Step 2 — Instalar todos os componentes necessários

### Base (form controls, UI primitives)

```bash
npx untitledui@latest add button button-group badges tags dropdown select input textarea text-editor toggle checkbox radio-buttons radio-groups avatar tooltip progress-indicators progress-circles slider video-player rating-badge featured-icon -y --overwrite
```

### Application (layouts, data display, navigation)

```bash
npx untitledui@latest add sidebar-navigation-base modal charts-base metrics slideout-menu pagination carousel-base progress-steps activity-feed messaging tabs table breadcrumbs alerts notifications date-picker calendar file-upload-base empty-state -y --overwrite
```

Flags importantes:
- `-y` — modo não-interativo (aceita defaults, ideal para CI/AI)
- `--overwrite` — sobrescreve arquivos existentes

Os componentes ficam em:
```
src/components/
├── base/           # Button, Input, Select, Checkbox, etc
├── application/    # Modal, Sidebar, Charts, Table, etc
├── foundations/    # Featured Icon, Payment Icons, Rating, Logos
└── shared-assets/  # Illustrations, Background Patterns
```

### Utils e Hooks criados automaticamente

O CLI cria esses arquivos auxiliares:

```
src/utils/
├── cx.ts                  # Wrapper do tailwind-merge
└── is-react-component.ts  # Type guard para componentes React
```

**ATENÇÃO:** Alguns componentes (pagination, date-picker, select, sidebar) precisam de hooks que o CLI NÃO cria automaticamente. Crie manualmente:

#### `src/hooks/use-breakpoint.ts`
```ts
"use client";

import { useEffect, useState } from "react";

const breakpoints: Record<string, string> = {
    sm: "(min-width: 640px)",
    md: "(min-width: 768px)",
    lg: "(min-width: 1024px)",
    xl: "(min-width: 1280px)",
    "2xl": "(min-width: 1536px)",
};

export function useBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const query = breakpoints[breakpoint];
        if (!query) return;

        const mql = window.matchMedia(query);
        setMatches(mql.matches);

        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, [breakpoint]);

    return matches;
}
```

#### `src/hooks/use-resize-observer.ts`
```ts
"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

interface UseResizeObserverOptions {
    ref: RefObject<Element | null>;
    onResize: () => void;
    box?: ResizeObserverBoxOptions;
}

export function useResizeObserver({ ref, onResize, box = "border-box" }: UseResizeObserverOptions): void {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver(() => {
            onResize();
        });

        observer.observe(element, { box });

        return () => observer.disconnect();
    }, [ref, onResize, box]);
}
```

---

## Step 3 — Remover dark mode (se light-only)

Se o projeto será light mode only, remover o bloco `.dark-mode` do `theme.css`:

1. Abrir `src/theme.css`
2. Localizar o bloco `.dark-mode { ... }` (geralmente começa na linha ~910)
3. Deletar o bloco inteiro até o final do arquivo
4. Em `src/globals.css`, remover a linha `@custom-variant dark (&:where(.dark-mode, .dark-mode *));` se existir

---

## Step 4 — Atualizar layout.tsx

Substituir o layout raiz para usar Inter (font padrão do Untitled UI) e importar o `globals.css`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/globals.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "meu-app",
  description: "meu-app",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

Pontos importantes:
- `import "@/globals.css"` — NÃO importar o antigo `index.css`
- A variável `--font-inter` é usada pelo `theme.css` para `--font-body` e `--font-display`
- Remover `suppressHydrationWarning` (era necessário para next-themes)

---

## Step 5 — Remover providers shadcn

O `providers.tsx` deve ficar limpo, sem ThemeProvider/next-themes:

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/utils/trpc";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
      <Toaster richColors />
    </QueryClientProvider>
  );
}
```

Remover: `ThemeProvider` de `next-themes`, qualquer wrapper de tema.

---

## Step 6 — Migrar cada componente

### Mapeamento de Props: shadcn → Untitled UI

#### Button

| shadcn | Untitled UI |
|--------|-------------|
| `import { Button } from "@/components/ui/button"` | `import { Button } from "@/components/base/buttons/button"` |
| `variant="default"` | `color="primary"` |
| `variant="destructive"` | `color="primary-destructive"` |
| `variant="outline"` | `color="secondary"` |
| `variant="secondary"` | `color="secondary"` |
| `variant="ghost"` | `color="tertiary"` |
| `variant="link"` | `color="link-gray"` ou `color="link-color"` |
| `size="default"` | `size="md"` |
| `size="sm"` / `size="lg"` | `size="sm"` / `size="lg"` / `size="xl"` |
| `disabled` | `isDisabled` |
| `asChild` + `<Link>` | `href="/path"` (nativo, sem asChild) |
| `<Plus className="mr-2 h-4 w-4" />` como children | `iconLeading={Plus}` prop |
| loading state manual | `isLoading` prop nativa |

```tsx
// ANTES (shadcn)
<Button variant="destructive" size="sm" disabled>
  <Plus className="mr-2 h-4 w-4" />
  Deletar
</Button>
<Link href="/new" className={buttonVariants({ variant: "default" })}>
  Criar Novo
</Link>

// DEPOIS (Untitled UI)
<Button color="primary-destructive" size="sm" isDisabled iconLeading={Plus}>
  Deletar
</Button>
<Button href="/new" color="primary">
  Criar Novo
</Button>
```

#### Input

| shadcn | Untitled UI |
|--------|-------------|
| `import { Input } from "@/components/ui/input"` | `import { Input } from "@/components/base/input/input"` |
| `import { Label } from "@/components/ui/label"` | Label integrado via prop `label` |
| `disabled` | `isDisabled` |
| `onChange={(e) => setValue(e.target.value)}` | `onChange={(value) => setValue(value)}` — recebe string direto |
| Validação manual + className | `isInvalid` + `hint="mensagem"` |

```tsx
// ANTES (shadcn)
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" value={value} onChange={(e) => onChange(e.target.value)} />
{error && <p className="text-sm text-red-500">{error}</p>}

// DEPOIS (Untitled UI)
<Input
  label="Email"
  type="email"
  value={value}
  onChange={onChange}
  isInvalid={!!error}
  hint={error}
/>
```

O `onChange(string)` do Untitled UI (via react-aria) funciona diretamente com `@tanstack/react-form`:
```tsx
<Input
  label="Email"
  value={field.state.value}
  onChange={field.handleChange}
  onBlur={field.handleBlur}
  isInvalid={field.state.meta.errors.length > 0}
  hint={field.state.meta.errors[0]?.message}
/>
```

#### DropdownMenu → Dropdown

| shadcn | Untitled UI |
|--------|-------------|
| `DropdownMenu` + `DropdownMenuTrigger` + `DropdownMenuContent` + `DropdownMenuItem` | `Dropdown.Root` + trigger como children + `Dropdown.Popover` + `Dropdown.Menu` + `Dropdown.Item` |
| `onSelect={() => ...}` | `onAction={() => ...}` |
| Ícone como children | `icon={IconComponent}` prop |
| `DropdownMenuSeparator` | `Dropdown.Separator` |

```tsx
// ANTES (shadcn)
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline">{user.name}</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>{user.email}</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onSelect={handleSignOut}>
      <LogOut className="mr-2 h-4 w-4" />
      Sign Out
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// DEPOIS (Untitled UI)
<Dropdown.Root>
  <Button color="secondary" size="sm">{user.name}</Button>
  <Dropdown.Popover>
    <Dropdown.Menu>
      <Dropdown.Item label={user.email} icon={User01} />
      <Dropdown.Separator />
      <Dropdown.Item label="Sign Out" icon={LogOut01} onAction={handleSignOut} />
    </Dropdown.Menu>
  </Dropdown.Popover>
</Dropdown.Root>
```

#### Ícones: lucide-react → @untitledui/icons

| lucide-react | @untitledui/icons |
|-------------|-------------------|
| `import { Loader2 } from "lucide-react"` | `import { Loading03 } from "@untitledui/icons"` |
| `import { LogOut } from "lucide-react"` | `import { LogOut01 } from "@untitledui/icons"` |
| `import { User } from "lucide-react"` | `import { User01 } from "@untitledui/icons"` |

Os nomes seguem o padrão `NomeDoIcone01`, `NomeDoIcone02`, etc. Consultar a [lista completa de ícones](https://www.untitledui.com/icons).

#### Skeleton → CSS nativo

shadcn tem um componente `<Skeleton>`. Untitled UI não. Usar TailwindCSS direto:

```tsx
// ANTES (shadcn)
<Skeleton className="h-9 w-24 rounded-lg" />

// DEPOIS
<div className="h-9 w-24 animate-pulse rounded-lg bg-secondary" />
```

---

## Step 7 — Deletar tudo de shadcn

### Arquivos para deletar

```bash
# Componentes shadcn
rm -rf src/components/ui/

# Providers de tema
rm -f src/components/theme-provider.tsx
rm -f src/components/mode-toggle.tsx

# CSS antigo
rm -f src/index.css

# Config do shadcn
rm -f components.json

# Utils antigos (se existir src/lib/utils.ts com cn())
rm -f src/lib/utils.ts
```

### Pacotes para desinstalar

```bash
npm uninstall shadcn class-variance-authority @base-ui/react next-themes tw-animate-css lucide-react clsx
```

Nota: `tailwind-merge` NÃO deve ser removido — o Untitled UI usa no `cx.ts`.

---

## Step 8 — Verificar build

```bash
npx tsc --noEmit
```

O build deve passar limpo. Se houver erros:

### Erros comuns e soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `Cannot find module '@/utils/cx'` | CLI antigo instalou em `@/lib/utils/cx` | Mover `src/lib/utils/cx.ts` → `src/utils/cx.ts` e atualizar imports |
| `Cannot find module '@/utils/is-react-component'` | Mesmo problema acima | Mover para `src/utils/is-react-component.ts` |
| `Cannot find module '@/hooks/use-breakpoint'` | CLI não gera esse hook | Criar manualmente (ver Step 2) |
| `Cannot find module '@/hooks/use-resize-observer'` | CLI não gera esse hook | Criar manualmente (ver Step 2) |
| `Cannot find module '@/lib/utils'` | Referência ao `cn()` do shadcn | Deletar o arquivo e atualizar imports |
| `Cannot find module 'next-themes'` | `theme-provider.tsx` ainda existe | Deletar o arquivo |
| `Cannot find module 'lucide-react'` | Ícones não foram migrados | Trocar por `@untitledui/icons` |
| `Cannot find module 'class-variance-authority'` | `ui/button.tsx` ainda existe | Deletar `src/components/ui/` |

### Se o CLI instalou utils no caminho errado

Se componentes antigos (instalados primeiro) usam `@/lib/utils/cx` e novos usam `@/utils/cx`:

```bash
# Mover para o caminho padrão do CLI
cp src/lib/utils/cx.ts src/utils/cx.ts
cp src/lib/utils/is-react-component.ts src/utils/is-react-component.ts
rm -rf src/lib/utils/

# Atualizar todos os imports de uma vez
grep -rl '@/lib/utils/cx' src/ | xargs sed -i '' 's|@/lib/utils/cx|@/utils/cx|g'
grep -rl '@/lib/utils/is-react-component' src/ | xargs sed -i '' 's|@/lib/utils/is-react-component|@/utils/is-react-component|g'
```

---

## Step 9 — Auditoria final

Confirmar que zero vestígios de shadcn restam:

```bash
# Buscar referências no código
grep -r "shadcn\|@base-ui\|class-variance-authority\|next-themes\|lucide-react\|components/ui/\|@/lib/utils" src/

# Buscar no package.json
grep -E "shadcn|class-variance-authority|@base-ui|next-themes|lucide-react|tw-animate" package.json

# Verificar que arquivos não existem
ls src/components/ui/ 2>&1         # deve dar erro "No such file"
ls components.json 2>&1            # deve dar erro "No such file"
ls src/index.css 2>&1              # deve dar erro "No such file"
ls src/components/theme-provider.tsx 2>&1  # deve dar erro "No such file"
```

Todos devem retornar vazio ou "No such file".

---

## Estrutura final do projeto

```
src/
├── app/
│   ├── layout.tsx              # Inter font + globals.css
│   ├── page.tsx
│   └── ...
├── components/
│   ├── base/                   # Untitled UI — primitivos
│   │   ├── buttons/
│   │   │   ├── button.tsx
│   │   │   ├── button-utility.tsx
│   │   │   └── close-button.tsx
│   │   ├── input/
│   │   │   ├── input.tsx
│   │   │   ├── input-group.tsx
│   │   │   ├── input-payment.tsx
│   │   │   ├── label.tsx
│   │   │   └── hint-text.tsx
│   │   ├── textarea/
│   │   ├── select/
│   │   ├── checkbox/
│   │   ├── radio-buttons/
│   │   ├── radio-groups/
│   │   ├── dropdown/
│   │   ├── toggle/
│   │   ├── avatar/
│   │   ├── tooltip/
│   │   ├── badges/
│   │   ├── tags/
│   │   ├── button-group/
│   │   ├── slider/
│   │   ├── text-editor/
│   │   ├── video-player/
│   │   └── progress-indicators/
│   ├── application/            # Untitled UI — compostos
│   │   ├── modals/
│   │   ├── app-navigation/     # Sidebar
│   │   ├── charts/
│   │   ├── metrics/
│   │   ├── messaging/
│   │   ├── table/
│   │   ├── tabs/
│   │   ├── pagination/
│   │   ├── breadcrumbs/
│   │   ├── alerts/
│   │   ├── notifications/
│   │   ├── date-picker/
│   │   ├── calendar/
│   │   ├── file-upload/
│   │   ├── slideout-menus/
│   │   ├── carousel/
│   │   ├── activity-feed/
│   │   ├── progress-steps/
│   │   └── empty-state/
│   ├── foundations/            # Untitled UI — ícones e assets
│   │   ├── featured-icon/
│   │   ├── payment-icons/
│   │   └── logo/
│   ├── shared-assets/         # Untitled UI — ilustrações e patterns
│   ├── header.tsx             # Componentes do app
│   ├── providers.tsx
│   └── ...
├── hooks/
│   ├── use-breakpoint.ts       # Criado manualmente
│   └── use-resize-observer.ts  # Criado manualmente
├── utils/
│   ├── cx.ts                   # tailwind-merge wrapper
│   ├── is-react-component.ts   # Type guard
│   └── trpc.ts                 # tRPC client
├── lib/
│   └── auth-client.ts          # Better-Auth client
├── globals.css                 # Entry CSS (imports theme + typography)
├── theme.css                   # Design tokens
└── typography.css              # Tipografia
```

---

## Variáveis CSS do Untitled UI (referência rápida)

### Classes de texto (usar com Tailwind)
```
text-primary       — texto principal
text-secondary     — texto secundário
text-tertiary      — texto terciário
text-quaternary    — texto mais fraco
text-disabled      — texto desabilitado
text-brand-primary — texto na cor da marca
text-error-primary — texto de erro
```

### Classes de background
```
bg-primary         — fundo principal (branco)
bg-secondary       — fundo cinza claro
bg-brand-solid     — fundo cor da marca
bg-error-solid     — fundo vermelho
bg-primary_hover   — fundo hover
```

### Classes de borda
```
border-primary     — borda padrão
border-secondary   — borda mais fraca
border-brand       — borda cor da marca
border-error       — borda de erro
```

### Tipografia (extensões display)
```
text-display-xs    — 24px
text-display-sm    — 30px
text-display-md    — 36px
text-display-lg    — 48px
text-display-xl    — 60px
text-display-2xl   — 72px
```

---

## Resumo do que muda de shadcn para Untitled UI

| Aspecto | shadcn/ui | Untitled UI |
|---------|-----------|-------------|
| Base UI | `@base-ui/react` | `react-aria-components` |
| CSS | `class-variance-authority` + `clsx` + `tailwind-merge` | `tailwind-merge` (via `cx.ts`) |
| Tema | CSS variables em `index.css` com `@theme inline` | `theme.css` com `@theme` completo |
| Icons | `lucide-react` | `@untitledui/icons` |
| Dark mode | `next-themes` + classe `.dark` | classe `.dark-mode` (ou remover) |
| Botão como link | `asChild` + `<Link>` | prop `href` nativo |
| Estado disabled | `disabled` | `isDisabled` |
| Estado loading | Manual (spinner como children) | `isLoading` nativo |
| Ícones no botão | Como children `<Icon className="...">` | Props `iconLeading` / `iconTrailing` |
| Input onChange | `(e: ChangeEvent) => void` | `(value: string) => void` |
| Validação | Manual via className | `isInvalid` + `hint` |
| Label | Componente separado | Prop `label` integrada |
| Skeleton | Componente `<Skeleton>` | `div` com `animate-pulse` |
| Instalação | `npx shadcn@latest add` | `npx untitledui@latest add` |
| Localização | `src/components/ui/` | `src/components/base/` + `src/components/application/` |

---

## Comandos CLI do Untitled UI

```bash
npx untitledui@latest init --nextjs --overwrite --color brand   # Setup inicial
npx untitledui@latest add <componente> -y --overwrite           # Instalar componente
npx untitledui@latest add <c1> <c2> <c3> -y --overwrite        # Instalar vários
npx untitledui@latest login                                      # Login para PRO
```
