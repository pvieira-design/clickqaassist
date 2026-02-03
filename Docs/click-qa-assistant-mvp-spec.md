# Click QA Assistant — Especificação do MVP

> **Versão:** 1.0  
> **Data:** 02/02/2026  
> **Status:** Em Definição

---

## 1. Visão Geral

### 1.1 O que é o Click QA Assistant?

Sistema web para gestão de qualidade do atendimento ao cliente da Click Cannabis. Permite que administradores e líderes avaliem conversas de atendimento, registrem feedbacks sobre mensagens específicas, e acompanhem a evolução dos atendentes através de um sistema de pontuação (score).

### 1.2 Problema que Resolve

- Falta de visibilidade sobre a qualidade do atendimento
- Ausência de métricas objetivas para avaliar atendentes
- Dificuldade em identificar padrões de erros recorrentes
- Necessidade de feedback estruturado para desenvolvimento da equipe

### 1.3 Nome do Projeto

**Click QA Assistant**

### 1.4 Stack Técnica (Referência)

```bash
npx create-better-t-stack@latest clickqaassist \
  —frontend next \
  —backend self \
  —runtime none \
  —api trpc \
  —auth better-auth \
  —payments none \
  —database postgres \
  —orm prisma \
  —db-setup none \
  —package-manager npm \
  —git \
  —web-deploy none \
  —server-deploy none \
  —install \
  —addons none \
  —examples none
```

**Frontend:** Next.js + Untitled UI Pro (conectado via CLI)

---

## 2. Usuários e Permissões

### 2.1 Tipos de Usuário

| Tipo | Descrição |
|------|-----------|
| **Admin** | Acesso total ao sistema |
| **Líder** | Acesso limitado à sua área/departamento |
| **Staff (Atendente)** | Visualiza apenas seus próprios feedbacks |

### 2.2 Matriz de Permissões

| Funcionalidade | Admin | Líder | Staff |
|----------------|:-----:|:-----:|:-----:|
| Ver dashboard geral | ✅ | ❌ | ❌ |
| Ver dashboard da área | ✅ | ✅ (só sua área) | ❌ |
| Importar chat | ✅ | ✅ | ❌ |
| Registrar feedback | ✅ | ✅ | ❌ |
| Editar/remover feedback | ✅ | ✅ (só os que registrou) | ❌ |
| Configurar feedback types | ✅ | ❌ | ❌ |
| Gerenciar usuários | ✅ | ❌ | ❌ |
| Gerenciar departamentos | ✅ | ❌ | ❌ |
| Ver próprios feedbacks | ✅ | ✅ | ✅ |
| Contestar feedback | ❌ | ❌ | ✅ |
| Resolver contestação | ✅ | ✅ | ❌ |
| Ver threads de contestação | ✅ | ✅ (da sua área) | ✅ (só as próprias) |

### 2.3 Hierarquia de Visualização

- **Admin:** Vê todos os departamentos, todos os atendentes, todos os feedbacks
- **Líder:** Vê apenas atendentes e feedbacks do seu departamento
- **Staff:** Vê apenas seus próprios feedbacks (mesmo que o chat tenha feedbacks de outros atendentes)

### 2.4 Regras de Departamento

- Um usuário pertence a **apenas um** departamento
- Um departamento pode ter **múltiplos líderes**
- O departamento é definido no cadastro do usuário pelo admin

---

## 3. Departamentos

### 3.1 Lista Inicial (MVP)

1. Atendimento Inicial
2. Consulta Médica
3. Receita & Orçamento
4. Documentação
5. Pós-venda

### 3.2 Estrutura do Departamento

| Campo | Tipo | Obrigatório |
|-------|------|:-----------:|
| id | UUID | ✅ |
| name | String | ✅ |
| createdAt | DateTime | ✅ |
| updatedAt | DateTime | ✅ |

---

## 4. Usuários (Atendentes)

### 4.1 Estrutura do Usuário

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| id | UUID | ✅ | Identificador único |
| name | String | ✅ | Nome completo |
| email | String | ✅ | Email para login |
| phone | String | ❌ | Telefone (opcional) |
| role | Enum | ✅ | `ADMIN`, `LEADER`, `STAFF` |
| departmentId | UUID | ✅ | Departamento do usuário |
| chatGuruName | String | ❌ | Nome exato no ChatGuru (para match) |
| externalUserId | String | ❌ | ID no sistema Click (futura integração) |
| isActive | Boolean | ✅ | Se está ativo (default: true) |
| createdAt | DateTime | ✅ | Data de criação |
| updatedAt | DateTime | ✅ | Última atualização |

### 4.2 Regras de Desativação

Quando um usuário é desativado:
- **Feedbacks registrados:** Mantidos (histórico preservado)
- **Histórico de score:** Mantido
- **Chats onde aparece:** Mantidos
- **Não pode mais logar** no sistema

### 4.3 Match com ChatGuru

Para vincular mensagens ao atendente correto, usamos o campo `chatGuruName` que deve corresponder exatamente ao `agentName` retornado pela API do ChatGuru.

**Exemplo:**
- API retorna: `agentName: "Juliana Aires"`
- Cadastro deve ter: `chatGuruName: "Juliana Aires"`

---

## 5. Feedback Types (Tipos de Feedback)

### 5.1 Categorias

| Categoria | Cor | Descrição |
|-----------|-----|-----------|
| **Positivo** | 🟢 Verde | Comportamentos a serem reforçados |
| **Neutro** | 🟡 Amarelo | Pontos de atenção |
| **Negativo** | 🔴 Vermelho | Erros a serem corrigidos |

### 5.2 Estrutura do Feedback Type

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| id | UUID | ✅ | Identificador único |
| name | String | ✅ | Nome do tipo (ex: "Falta de empatia") |
| category | Enum | ✅ | `POSITIVE`, `NEUTRAL`, `NEGATIVE` |
| points | Integer | ✅ | Pontos (positivo ou negativo) |
| isActive | Boolean | ✅ | Se está disponível para uso |
| createdAt | DateTime | ✅ | Data de criação |
| updatedAt | DateTime | ✅ | Última atualização |

### 5.3 Exemplos de Feedback Types

**Positivos:**
- Boa pronúncia no áudio (+5 pts)
- Usou o script correto do playbook (+3 pts)
- Resposta rápida (+2 pts)
- Empatia demonstrada (+3 pts)

**Neutros:**
- Erro ortográfico (0 pts)

**Negativos:**
- Falta de empatia (-5 pts)
- Falta de personalização na mensagem (-3 pts)
- Falta de observar detalhes do paciente (-4 pts)
- Demora na resposta (-2 pts)

### 5.4 Escopo

- Feedback types são **globais** (não específicos por departamento)

### 5.5 Regras de Desativação

Quando um feedback type é desativado:
- **Não aparece** mais como opção para novos registros
- Feedbacks já registrados com esse type:
  - **Não contam** mais para o score
  - **Não aparecem** no histórico

---

## 6. Chats Importados

### 6.1 Estrutura do Chat

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| id | UUID | ✅ | ID interno |
| chatGuruId | String | ✅ | ID do chat no ChatGuru |
| chatGuruStatus | String | ✅ | Status no ChatGuru |
| patientName | String | ❌ | Nome do paciente |
| patientPhone | String | ❌ | Telefone do paciente |
| importedAt | DateTime | ✅ | Data/hora da importação |
| importedById | UUID | ✅ | Quem importou |
| totalMessages | Integer | ✅ | Total de mensagens |

### 6.2 Estrutura da Mensagem

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| id | UUID | ✅ | ID interno |
| chatId | UUID | ✅ | Chat pai |
| chatGuruMessageId | String | ✅ | ID da mensagem no ChatGuru |
| direction | Enum | ✅ | `PATIENT` ou `AGENT` |
| agentName | String | ❌ | Nome do atendente (null se paciente/bot) |
| agentId | UUID | ❌ | Link para usuário (se encontrado match) |
| text | String | ✅ | Conteúdo da mensagem |
| messageType | String | ✅ | Tipo: chat, ptt, image, etc. |
| isTemplate | Boolean | ✅ | Se é template/bot |
| templateName | String | ❌ | Nome do template |
| timestamp | DateTime | ✅ | Data/hora original |
| isDeleted | Boolean | ✅ | Se foi deletada |
| wasTranscribed | Boolean | ✅ | Se áudio foi transcrito |

### 6.3 Identificação de Mensagens de Bot/Template

Uma mensagem é considerada **bot/template** quando:
- `direction: "agent"` E `agentName: null`
- OU `isTemplate: true`

**Decisão pendente:** Mensagens de bot podem receber feedback?

### 6.4 Fluxo de Importação

1. Admin/Líder cola o link do chat (ex: `https://s21.chatguru.app/chats#697fdae0c30edc5d32e99935`)
2. Sistema extrai o `chatId` do link
3. Sistema chama API: `GET /api/chat/{chatId}/export?format=n8n&transcribe=true`
4. Sistema salva chat e todas as mensagens
5. Sistema tenta fazer match de `agentName` com usuários cadastrados

---

## 7. Feedbacks

### 7.1 Estrutura do Feedback

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| id | UUID | ✅ | Identificador único |
| messageId | UUID | ✅ | Mensagem que recebeu o feedback |
| feedbackTypeId | UUID | ✅ | Tipo do feedback |
| agentId | UUID | ✅ | Atendente que recebe o feedback |
| registeredById | UUID | ✅ | Quem registrou (admin/líder) |
| comment | String | ❌ | Observação opcional |
| status | Enum | ✅ | Status atual (ver abaixo) |
| createdAt | DateTime | ✅ | Data de registro |
| updatedAt | DateTime | ✅ | Última atualização |
| readAt | DateTime | ❌ | Quando atendente leu |
| acknowledgedAt | DateTime | ❌ | Quando atendente clicou "Compreendido" |

### 7.2 Status do Feedback

| Status | Descrição |
|--------|-----------|
| `PENDING` | Registrado, atendente ainda não viu |
| `READ` | Atendente abriu/visualizou |
| `ACKNOWLEDGED` | Atendente clicou em "Feedback Compreendido" |
| `CONTESTED` | Atendente contestou |
| `RESOLVED` | Admin/Líder resolveu a contestação |

### 7.3 Fluxo de Status

```
PENDING → READ → ACKNOWLEDGED
                ↓
           CONTESTED → RESOLVED
```

### 7.4 Regras

- Uma mensagem pode ter **múltiplos feedbacks** de diferentes tipos
- Cada feedback é atrelado ao **atendente específico** que enviou a mensagem
- Feedback pode ser editado/removido por admin ou líder
- O campo `comment` é opcional

### 7.5 Resolução de Contestação

Quando admin/líder resolve uma contestação, pode:
- **Manter** o feedback como está
- **Alterar** o tipo do feedback
- **Remover** o feedback

---

## 8. Contestações

### 8.1 Estrutura da Contestação (Thread)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| id | UUID | ✅ | Identificador único |
| feedbackId | UUID | ✅ | Feedback contestado |
| createdAt | DateTime | ✅ | Início da contestação |
| resolvedAt | DateTime | ❌ | Quando foi resolvida |
| resolvedById | UUID | ❌ | Quem resolveu |
| resolution | Enum | ❌ | `MAINTAINED`, `CHANGED`, `REMOVED` |

### 8.2 Estrutura da Mensagem de Contestação

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| id | UUID | ✅ | Identificador único |
| contestationId | UUID | ✅ | Thread pai |
| authorId | UUID | ✅ | Quem escreveu |
| content | String | ✅ | Texto da mensagem |
| createdAt | DateTime | ✅ | Data/hora |

### 8.3 Regras

- Thread pode ter **mensagens ilimitadas** (vai e volta)
- Visível apenas para: atendente que contestou + admins + líderes da área
- Contestação é por **feedback**, não por chat
- Badge de "Contestado" aparece na listagem de feedbacks

---

## 9. Score (Pontuação)

### 9.1 Cálculo

```
Score do Mês = Σ (pontos de cada feedback registrado no mês)
```

### 9.2 Regras

- Todo atendente começa com score **zero**
- Score é **mensal** (reseta dia 1 de cada mês)
- Score pode ser **negativo** (ex: -50 pontos)
- Histórico de meses anteriores é **mantido**
- Feedbacks com type desativado **não contam** para o score

### 9.3 Visualização (MVP)

**Dashboard Admin/Líder mostra:**
- Score médio por atendente
- Ranking de atendentes
- Feedbacks mais frequentes (top erros)
- Evolução ao longo do tempo
- Filtros por período/departamento/atendente
- Mês atual por padrão, com opção de ver anteriores

**Visão do Atendente (MVP):**
- Apenas lista de feedbacks recebidos
- Sem dashboard próprio

---

## 10. Notificações por Email

### 10.1 Para Atendentes

| Trigger | Frequência | Conteúdo |
|---------|------------|----------|
| Novos feedbacks | Resumo diário | Lista de feedbacks do dia + links |

### 10.2 Para Admin/Líder

| Trigger | Frequência | Conteúdo |
|---------|------------|----------|
| Nova contestação | Imediato | Link para a contestação |

### 10.3 Conteúdo do Email

- Link direto para o feedback
- Resumo: tipo do feedback, mensagem, chat
- Nome de quem registrou

### 10.4 Configuração

**API Key Resend:** `re_gBKBvUVv_QDn9QtXWavJszpfSWdAZ2ph7`

---

## 11. Interface (UI)

### 11.1 Menu Lateral (Admin)

1. **Dashboard** — Métricas e visão geral
2. **Relatar Novo Feedback** — Importar chat e registrar feedbacks
3. **Configurar Feedback Types** — CRUD de tipos
4. **Gerenciar Usuários** — CRUD de usuários
5. **Gerenciar Departamentos** — CRUD de departamentos
6. **Contestações** — Lista de feedbacks contestados

### 11.2 Menu Lateral (Líder)

1. **Dashboard** — Métricas da sua área
2. **Relatar Novo Feedback** — Importar chat e registrar
3. **Contestações** — Lista de contestações da sua área

### 11.3 Menu Lateral (Staff)

1. **Meus Feedbacks** — Lista de feedbacks recebidos

### 11.4 Visualização do Chat

- Layout similar ao WhatsApp (balões)
- Mensagens do paciente: lado esquerdo
- Mensagens da equipe: lado direito
- Nome do atendente acima de cada mensagem da equipe
- Badge colorida em mensagens com feedback:
  - 🟢 Verde = Positivo
  - 🟡 Amarelo = Neutro
  - 🔴 Vermelho = Negativo
- Hover na mensagem revela opção "Adicionar Feedback"

### 11.5 Indicadores Visuais de Feedback

| Estado | Indicador |
|--------|-----------|
| Não lido | Badge "Novo" |
| Lido | Sem badge |
| Compreendido | ✓ Checkmark |
| Contestado | ⚠️ Badge amarela |

---

## 12. Fluxo Principal de Uso

### 12.1 Registrar Feedbacks (Admin/Líder)

```
1. Acessa "Relatar Novo Feedback"
2. Cola link do chat do ChatGuru
3. Clica "Importar"
4. Sistema busca e exibe o chat
5. Navega pelas mensagens
6. Passa mouse sobre mensagem da equipe
7. Clica em "Adicionar Feedback"
8. Seleciona o tipo de feedback
9. (Opcional) Adiciona comentário
10. Confirma
11. Feedback é atrelado ao atendente da mensagem
12. Repete para outras mensagens
13. Clica em "Finalizar Revisão"
```

### 12.2 Visualizar Feedbacks (Atendente)

```
1. Acessa "Meus Feedbacks"
2. Vê lista de feedbacks (mais recentes primeiro)
3. Badge "Novo" indica não lidos
4. Clica em um feedback
5. Visualiza a mensagem no contexto do chat
6. Lê o feedback e comentário
7. Clica em "Feedback Compreendido"
   OU
7. Clica em "Contestar" → Escreve contestação
```

### 12.3 Resolver Contestação (Admin/Líder)

```
1. Acessa "Contestações"
2. Vê lista de feedbacks contestados
3. Clica em uma contestação
4. Lê o histórico da thread
5. Pode responder na thread
6. Quando decidir, clica em "Resolver"
7. Escolhe: Manter / Alterar / Remover
8. Confirma
```

---

## 13. API do ChatGuru (Referência)

### 13.1 Endpoint Principal

```http
GET /api/chat/:chatId/export?format=n8n&transcribe=true
```

### 13.2 Resposta (format=n8n)

```json
[
  {
    "chatId": "697fdae0c30edc5d32e99935",
    "chatStatus": "EM ATENDIMENTO",
    "messageId": "679f1a2b...",
    "direction": "patient",
    "agentName": null,
    "text": "Olá, preciso de ajuda",
    "messageType": "chat",
    "timestamp": "2026-01-15T14:30:00.000Z",
    "timestampBR": "15/01/2026, 11:30:00",
    "status": "read",
    "isTemplate": false,
    "templateName": null,
    "deleted": false,
    "transcribed": false
  },
  {
    "chatId": "697fdae0c30edc5d32e99935",
    "chatStatus": "EM ATENDIMENTO",
    "messageId": "679f1a2c...",
    "direction": "agent",
    "agentName": "Juliana Aires",
    "text": "Olá! Seja bem-vindo à Click Cannabis...",
    "messageType": "chat",
    "timestamp": "2026-01-15T14:35:00.000Z",
    "timestampBR": "15/01/2026, 11:35:00",
    "status": "delivered",
    "isTemplate": false,
    "templateName": null,
    "deleted": false,
    "transcribed": false
  }
]
```

### 13.3 Regras de `agentName`

| Valor | Significado |
|-------|-------------|
| `null` | Mensagem do paciente (`direction: "patient"`) |
| `null` | Template/bot automático (sem atendente humano) |
| `"Nome"` | Mensagem manual enviada por atendente |

### 13.4 URL Base

```
https://biblical-electron-doctors-outdoor.trycloudflare.com
```

> ⚠️ URL pode mudar se servidor reiniciar

---

## 14. Priorização do MVP

### 14.1 Essencial (MVP Core)

| # | Funcionalidade | Prioridade |
|---|----------------|:----------:|
| 1 | Importar chat via link | 🔴 Alta |
| 2 | Registrar feedback em mensagens | 🔴 Alta |
| 3 | Visualização de feedbacks (atendente) | 🔴 Alta |
| 4 | Contestação de feedbacks | 🔴 Alta |
| 5 | CRUD de usuários | 🔴 Alta |
| 6 | CRUD de departamentos | 🔴 Alta |
| 7 | CRUD de feedback types | 🔴 Alta |
| 8 | Autenticação (login/logout) | 🔴 Alta |

### 14.2 Importante (MVP Completo)

| # | Funcionalidade | Prioridade |
|---|----------------|:----------:|
| 9 | Dashboard admin | 🟡 Média |
| 10 | Histórico de score mensal | 🟡 Média |
| 11 | Notificações por email | 🟡 Média |

### 14.3 Fora do MVP

| Funcionalidade | Fase |
|----------------|------|
| Extensão para ChatGuru | v1.0 |
| Integração automática com banco Click Cannabis | v1.0 |
| Importação automática de chats | v1.0 |
| Login com senha temporária por email | v1.0 |
| "Esqueci minha senha" | v1.0 |

---

## 15. Questões em Aberto

As seguintes questões precisam de definição:

### 15.1 Match de Atendente

> Quando importamos um chat com `agentName: "Juliana Aires"`, como fazemos o match se o nome não existir no sistema?
> - Criar usuário automaticamente?
> - Marcar como "Atendente não identificado"?
> - Bloquear importação?

### 15.2 Mensagens de Bot

> Mensagens com `agentName: null` e `direction: "agent"` (bot/template) podem receber feedback?

### 15.3 Informações do Paciente

> A API atual não retorna nome/telefone do paciente no export. Precisamos de endpoint adicional ou campo está em outro lugar?

### 15.4 Score no MVP

> O score atual (soma de pontos) precisa funcionar no MVP? Ou apenas na versão completa?

---

## 16. Glossário

| Termo | Definição |
|-------|-----------|
| **ChatGuru** | Plataforma de atendimento via WhatsApp usada pela Click Cannabis |
| **Chat** | Conversa completa entre paciente e equipe |
| **Mensagem** | Unidade individual dentro de um chat |
| **Feedback** | Avaliação registrada em uma mensagem específica |
| **Feedback Type** | Categoria pré-configurada de feedback (ex: "Falta de empatia") |
| **Score** | Pontuação acumulada de um atendente |
| **Contestação** | Quando atendente discorda de um feedback recebido |
| **Handoff** | Troca de atendente durante um chat |
| **Template** | Mensagem automática/bot sem atendente humano |

---

## Histórico de Revisões

| Data | Versão | Descrição |
|------|--------|-----------|
| 02/02/2026 | 1.0 | Versão inicial do documento |
