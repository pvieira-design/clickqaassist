# ChatGuru Feedback Analyzer Extension

> Documentação técnica para criação de uma extensão Chrome de análise de feedbacks de atendimento no ChatGuru.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Contexto Click Cannabis](#contexto-click-cannabis)
3. [Arquitetura da Interface](#arquitetura-da-interface)
4. [APIs e Endpoints](#apis-e-endpoints)
5. [Estrutura de Dados](#estrutura-de-dados)
6. [Código Existente](#código-existente)
7. [Requisitos da Extensão](#requisitos-da-extensão)
8. [Documentos Detalhados](#documentos-detalhados)

---

## Visão Geral

### O que é o ChatGuru?

O **ChatGuru** é uma plataforma de atendimento via WhatsApp Business API que a Click Cannabis utiliza para gerenciar toda a comunicação com pacientes. É a principal ferramenta de atendimento da empresa, processando milhares de conversas diárias.

### Dados de Acesso

| Campo | Valor |
|-------|-------|
| **URL** | https://s21.chatguru.app |
| **Conta** | João M \| Click Cannabis 2 |
| **Email** | clickcannabis@clickcannabis.com |
| **Account ID** | 66eb2b7691396bcd24682bab |
| **Phone ID** | 66ec42044b5a871161feffa9 |
| **Número WhatsApp** | +55 21 99368-6082 |
| **Provider** | Gupshup (API Oficial) |

### Volume de Dados

- **~103.000+ chats** não resolvidos
- **~67 atendentes** ativos
- **11 departamentos** de atendimento
- **7 funis** de acompanhamento
- **150+ tags** de categorização

---

## Contexto Click Cannabis

### Sobre a Empresa

A **Click Cannabis** é a maior plataforma de telemedicina canábica do Brasil, com:
- +50.000 consultas realizadas
- ~30% de market share
- ~67 colaboradores
- Jornada do paciente em 7 pipelines

### Departamentos de Atendimento

| Departamento | ID | Descrição |
|--------------|-----|-----------|
| Atendimento Inicial | 66f58149561db40cd028a608 | Primeiro contato, qualificação |
| Consulta Médica | 66f581a8ef31a77bda792158 | Suporte pré/pós consulta |
| Consulta Médica - Chat | 69163ae0b8004547d8af8774 | Atendimento durante consulta |
| Receita e Orçamento | 66f581f75b8da8a95a8d8a46 | Envio de receitas, orçamentos |
| Documentação - Geral | 66f5822b3cebcd6647067c90 | Documentação ANVISA |
| Documentação - Chat | 6841b7de63a57d5dbe80671d | Suporte documentação |
| Documentação - Análise | 6841b7b188948b5a77983a98 | Análise de documentos |
| Entrega | 66f5824422ee223bfd9be25b | Rastreamento, entregas |
| Pós-venda | 66f58267a47be2a07797af24 | Acompanhamento pós-compra |
| Atendimento Inicial - Clico | 686e7698b2a96c27483beff2 | IA de atendimento |

### Funis de Atendimento

1. **Atendimento Inicial**: Entrou em contato → Interagiu → Faz tratamento? → Contato cannabis? → Explicação → Aquecimento → Pagamento pendente
2. **Consulta Médica**: Aguardando agendamento → Aguardando anamnese → Aguardando consulta
3. **Receita e Orçamento**: Receita Enviada → Orçamento Enviado → Pagamento Pendente
4. **Documentação**: Produto em falta → Rastreio enviado
5. **Entrega**: Código enviado → Produto EUA → ANVISA → Transportadora → Entregue
6. **Pós-venda**: 7d → 15d → 23d → 30d → 45d → 60d → 70d → 75d → 90d → 100d → 120d → 180d
7. **Perdidos**: Sem dinheiro → Queria flor/plantar → Curioso

---

## Arquitetura da Interface

### Layout de 3 Colunas

A página `/chats` do ChatGuru é dividida em três áreas principais:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Header] João M | Click Cannabis 2          🔔 📨 📢 🔊 ⚙️                   │
├──────────────────┬─────────────────────────────┬────────────────────────────┤
│                  │                             │                            │
│  📋 FILTROS      │     💬 ÁREA DO CHAT        │    👤 INFO DO LEAD         │
│                  │                             │                            │
│  Nome:           │  [Nome do Paciente]  ●      │  Nome: ⭐ Fulano           │
│  Aparelho:       │                             │  Tel: +55 21 91234-5678    │
│  Número:         │  ┌──────────────────────┐   │                            │
│  Tags:           │  │   Mensagem recebida  │   │  Chatbot: [Sim/Não]        │
│  Usuário/Dept:   │  └──────────────────────┘   │  Arquivar: [Não]           │
│  Etapa Funil:    │           ┌─────────────────┤                            │
│  Status:         │           │ Msg enviada    ││  Responsável:              │
│  Ordenar:        │           └─────────────────┤  [Pós-venda ▼] [Delegar]   │
│                  │                             │                            │
│  [Ícones filtro] │  ┌──────────────────────┐   │  Tags:                     │
│  ✉️ ((●)) ⭐ ⏰ ⏱️  │  │   Outra mensagem     │   │  [+ Nova Tag] [Tag1]       │
│                  │  └──────────────────────┘   │                            │
├──────────────────┤                             │  Campos Personalizados:    │
│                  │                             │  - negotiation_id: 335141  │
│  📜 LISTA CHATS  │  ┌─────────────────────────┐│  - user_id: 338177         │
│                  │  │ 📎 😊 [  input      ] 🕐││  - date_consulting: ...    │
│  [Avatar] Nome   │  └─────────────────────────┘│  - link_prescription: ...  │
│  Preview msg     │                             │  - doctor_name: ...        │
│  [Status] 18:03  │                             │                            │
│                  │                             │                            │
│  [Avatar] Nome   │                             │                            │
│  Preview msg     │                             │                            │
│  [Status] 18:02  │                             │                            │
│                  │                             │                            │
└──────────────────┴─────────────────────────────┴────────────────────────────┘
```

### Detalhamento por Área

#### 1. Barra Lateral Esquerda - Filtros e Lista
- **Filtros de busca**: Nome, Aparelho, Número WhatsApp
- **Filtros avançados**: Tags (multi-select), Usuário/Departamento, Etapa do Funil
- **Ordenação**: Por data, msgs não lidas, criação
- **Status**: ABERTO, EM ATENDIMENTO, AGUARDANDO, RESOLVIDO, FECHADO
- **Ícones de filtro rápido**: Não lidos, Broadcast, Favoritos, Tempo no status, Tempo última msg
- **Lista de chats**: Cards com avatar, nome, preview, status, horário, indicadores

#### 2. Área Central - Chat
- **Header**: Nome do paciente, dropdown de status, botões de ação
- **Histórico**: Mensagens em balões (verde = enviada, branco = recebida)
- **Tipos de mensagem**: Texto, imagem, áudio, vídeo, documento, template, sticker
- **Input**: Área de digitação com emojis, anexos, agendamento, microfone

#### 3. Painel Direito - Info do Lead
- **Identificação**: Nome (com estrela se favorito), telefone
- **Configurações**: Chatbot ativo, Arquivar
- **Delegação**: Responsável atual, botão delegação
- **Tags**: Lista de tags aplicadas, botão adicionar
- **Campos Personalizados**: Integração com CRM Click Cannabis

---

## APIs e Endpoints

### Endpoints Internos (via fetch no browser)

#### Dashboard
```javascript
GET /dashboard/chats/unresolved
// Retorna totais por departamento e usuário
```

#### Lista de Chats
```javascript
POST /chatlist/store
Body: { page: 1, limit: 100, status: 'ABERTO', group_ids: [...], ... }
// Retorna lista paginada de chats
```

#### Mensagens do Chat
```javascript
GET /messages2/{chatId}/page/{pageNum}
// Retorna mensagens paginadas (~20 por página)
// page 1 = mais antigas, última página = mais recentes
```

#### Informações do Chat
```javascript
POST /chat/{chatId}
// Retorna HTML com info do chat
```

#### Campos Personalizados
```javascript
POST /chat/custom_fields/{chatId}/view
// Retorna HTML com campos personalizados
```

#### Outros
```javascript
GET /chatlist/funnels    // Funis e etapas
GET /chatlist/tags       // Todas as tags
GET /get_users_and_groups // Usuários e departamentos
GET /jwt/user-service-token // Token JWT para API externa
```

### API REST v1 (externa)

```
URL: https://s21.chatguru.app/api/v1
Key: CKW0ZPD7R8KNC34DOK8CKPABRM9OU417IHKF7R5J1JRB1JG5LP6MT719YGKY69QB
Account: 66eb2b7691396bcd24682bab
Phone: 66ec42044b5a871161feffa9
```

Ações: `message_send`, `message_file_send`, `note_add`, `chat_add`, `chat_update_name`, `chat_update_custom_fields`, `dialog_execute`

---

## Estrutura de Dados

### Chat Object
```javascript
{
  id: "697fdae0c30edc5d32e99935",      // MongoDB ObjectId
  phone_id: "66ec42044b5a871161feffa9",
  account_id: "66eb2b7691396bcd24682bab",
  wa_chat_id: "5521912345678@c.us",     // WhatsApp Chat ID
  name: "Nome do Paciente",
  kind: "contact",                      // contact | group
  status: "EM ATENDIMENTO",             // ABERTO | EM ATENDIMENTO | AGUARDANDO | RESOLVIDO | FECHADO
  favorite: false,
  archived: false,
  new_messages: 2,                      // Msgs não lidas
  updated: "2026-02-02T18:00:00Z",
  created: "2025-06-01T10:00:00Z",
  last_message: { text: "...", date: "..." },
  users_delegated_ids: ["userId1"],
  groups_delegated_ids: ["groupId1"],
  funnel_steps_ids: ["stepId1"],
  tags: ["tagId1", "tagId2"]
}
```

### Message Object
```javascript
{
  type: "message",                      // message | note
  date: "2026-02-02",                   // Data separadora
  m: {
    text: "Texto da mensagem",
    is_out: true,                       // true = enviada, false = recebida
    type: "chat",                       // chat | template | image | audio | document | video | sticker
    wa_sender_id: "5521912345678@c.us",
    created: "2026-02-02T18:00:00Z",
    timestamp: { "$date": 1738519200000 },
    status: "read",                     // sent | delivered | read | processed
    ack: 3,                             // 0=pendente, 1=enviado, 2=entregue, 3=lido
    template: { /* se is_template */ },
    bot_response: {
      dialog_executed: ["dialogId1"]    // Fluxos de chatbot acionados
    },
    is_template: false,
    deleted: false,
    hide: false,
    reactions: [],
    file: {                             // Se type != "chat"
      name: "audio.ogg",
      path_relative: "https://s3.../bucket",
      mime: "audio/ogg"
    }
  }
}
```

### Custom Fields (Campos Personalizados)
```javascript
{
  negotiation_id: "335141",             // leads.id no banco Click
  user_id: "338177",                    // users.id no banco Click
  negotiation: "https://clickagendamento.com/pipeline/...",
  payment_consulting_id: "90646",
  link_scheduling_consult: "https://clickagendamento.com/scheduling...",
  date_consulting: "26-12-2025",
  hour_consulting: "10:00",
  link_consulting: "https://meet.clickagendamento.com/...",
  link_prescription: "https://crm-clickcannabis.s3.../documents/...",
  anamnese_link: "https://anamnese.clickcannabis.com/?utm_source=...",
  doctor_name: "Dr. Raphael Mariz",
  full_name: "Nome Completo",
  pacient_name: "Nome do Paciente",
  cod_rastreio: "LX123456789BR",
  patologias: "Ansiedade, Insônia",
  cod_indicacao: "CLICK123",
  review_link: "https://...",
  nps_link: "https://...",
  whatsapp_code: "ABC123"
}
```

---

## Código Existente

### chatguru-api.js
Servidor Node.js local (porta 18900) que conecta via CDP ao browser e expõe endpoints REST:
- `/api/dashboard` - Dashboard em tempo real
- `/api/chats` - Lista de chats com filtros
- `/api/chat/:chatId/messages` - Mensagens paginadas
- `/api/chat/:chatId/export` - Export completo com transcrição de áudios

**Features:**
- Transcrição de áudios via whisper-cpp
- Exportação em formato JSON ou texto
- Paginação automática de mensagens

### chatguru-monitor/
Scripts de monitoramento de chats não lidos:
- `monitor-final.js` - API direta para contagem
- `run-monitor.sh` - Wrapper para cron
- Notificação automática para VIPs

### chatguru.md
Documentação técnica completa da plataforma (este arquivo é derivado dele).

---

## Requisitos da Extensão

### Objetivo
Criar uma extensão Chrome que analisa a qualidade do atendimento dos agentes baseado no histórico de chat, gerando feedbacks automáticos sobre:

1. **Tempo de resposta** - Quanto tempo o atendente leva para responder
2. **Qualidade das mensagens** - Clareza, cordialidade, completude
3. **Seguimento de scripts** - Aderência aos playbooks
4. **Resolução** - Se o problema foi resolvido
5. **Tags e categorização** - Uso correto de tags

### Pontos de Integração

1. **Leitura do chat atual** - Via DOM ou API `/messages2/{chatId}`
2. **Identificação do atendente** - Custom fields ou `is_out`
3. **Análise de IA** - Envio para modelo de análise
4. **Exibição de feedback** - Overlay ou painel na interface

### Estrutura Sugerida

```
chatguru-feedback-extension/
├── manifest.json           # Config da extensão
├── background.js           # Service worker
├── content.js              # Script injetado na página
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── analysis/
│   ├── chat-parser.js      # Extrai dados do chat
│   ├── metrics.js          # Calcula métricas
│   └── feedback.js         # Gera feedback
└── styles/
    └── overlay.css         # Estilos do feedback
```

---

## Documentos Detalhados

Os documentos a seguir contêm informações aprofundadas sobre cada aspecto:

| Arquivo | Descrição |
|---------|-----------|
| [01-platform-overview.md](./01-platform-overview.md) | O que é ChatGuru, histórico, contexto Click |
| [02-ui-structure.md](./02-ui-structure.md) | Arquitetura visual, layout 3 colunas |
| [03-left-sidebar.md](./03-left-sidebar.md) | Filtros, lista de chats, elementos DOM |
| [04-chat-area.md](./04-chat-area.md) | Área central, tipos de mensagem, input |
| [05-lead-info-panel.md](./05-lead-info-panel.md) | Painel direito, campos personalizados |
| [06-api-endpoints.md](./06-api-endpoints.md) | Todos os endpoints, exemplos, autenticação |
| [07-data-models.md](./07-data-models.md) | Estruturas JSON, tipos, validações |
| [08-export-api.md](./08-export-api.md) | API local de exportação, transcrição |
| [09-existing-code.md](./09-existing-code.md) | Código já implementado, referências |
| [10-extension-requirements.md](./10-extension-requirements.md) | Requisitos funcionais da extensão |
| [11-dom-selectors.md](./11-dom-selectors.md) | Seletores CSS, classes, IDs |
| [12-network-analysis.md](./12-network-analysis.md) | Requests, WebSockets, Pusher |

---

## Quick Start para o OpenCode

1. Leia este README para contexto geral
2. Consulte os documentos específicos conforme necessidade
3. Use `chatguru-api.js` como referência de integração
4. Teste endpoints via browser console (DevTools)
5. A extensão deve funcionar offline (não depender de servidor)

---

*Documentação criada em 02/02/2026 por Percival para projeto de extensão de análise de feedbacks.*
