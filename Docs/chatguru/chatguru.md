# ChatGuru — Documentação Técnica

## Acesso
- **URL:** https://s21.chatguru.app
- **Conta:** João M | Click Cannabis 2
- **Email:** clickcannabis@clickcannabis.com
- **Tipo:** admin
- **Phone:** 5521993686082 (API Oficial | Gupshup | clickguru)
- **Account ID:** 66eb2b7691396bcd24682bab
- **User ID:** 66eb2aac87a10f8027a9b36b
- **Timezone:** America/Recife
- **CNPJ:** 41247190000123
- **Razão Social:** HEALTH MEDIA LTDA
- **Segmento:** Saúde / Bem Estar
- **Módulos contratados:** Chatbot, Funil, Adicionar Chats, API, Atendimento
- **Módulos não contratados:** NPS, Transcrições, Resumo de chats
- **Auth:** cookies HTTP-only → usar `browser evaluate` com `fetch()` (profile `openclaw`)

## Endpoints Internos (via browser evaluate)

### Dashboard
```javascript
// Resumo de chats não resolvidos (departamentos + usuários)
const r = await fetch('/dashboard/chats/unresolved', { credentials: 'include' });
const data = await r.json();
// Retorna: { total_users_and_groups, open_chats, pending_chats, waiting_chats, total_unresolved, undelegated, groups[], users[] }
```

### Chat List (POST)
```javascript
// Listar chats com filtros
const r = await fetch('/chatlist/store', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    page: 1,       // paginação
    limit: 100     // máximo por página
    // outros filtros possíveis: status, user_ids, group_ids, tags, funnel_steps, etc.
  })
});
const data = await r.json();
// Retorna: { total_chats, total_returned, page_num, chats[] }
// Cada chat: { id, phone_id, account_id, wa_chat_id, name, kind, status, favorite, archived,
//              new_messages, updated, created, last_message: { text, date },
//              users_delegated_ids[], groups_delegated_ids[], funnel_steps_ids[], tags[] }
```

### Funis e Etapas
```javascript
const r = await fetch('/chatlist/funnels', { credentials: 'include' });
const funnels = await r.json();
// Array de funis, cada um com steps[]
```

### Tags
```javascript
const r = await fetch('/chatlist/tags', { credentials: 'include' });
```

### Usuários e Grupos
```javascript
const r = await fetch('/get_users_and_groups', { credentials: 'include' });
// { groups: [{ id, name, users[] }], users: [...] }
```

### JWT Token (para API externa)
```javascript
const r = await fetch('/jwt/user-service-token', { credentials: 'include' });
const jwt = await r.text();
// Token JWT com exp curto (~5min), pode ser usado para api.chatguru.app
```

### Outros Endpoints
- `/account_config` - Configurações (sons de alerta)
- `/session/heartbeat` - Heartbeat da sessão
- `/notifications/json` - Notificações
- `/phones_nav/json` - Navegação de aparelhos
- `/chatlist/phones` - Telefones
- `/pusher/auth` - Auth para websockets (real-time)
- `/endomessage/check_modal` - Verificação de modal

## API v1 (REST — acesso via curl/Node.js)
- **Endpoint:** `https://s21.chatguru.app/api/v1`
- **Status:** ATIVA ✅
- **Key:** `CKW0ZPD7R8KNC34DOK8CKPABRM9OU417IHKF7R5J1JRB1JG5LP6MT719YGKY69QB`
- **Account ID:** `66eb2b7691396bcd24682bab`
- **Phone ID:** `66ec42044b5a871161feffa9`
- **Phone:** +55 (21) 993686082
- **Provider:** Gupshup - clickguru
- **Créditos:** -1,834 (NEGATIVO — verificar!)
- **Formato:** `application/x-www-form-urlencoded`
- **Docs:** https://wiki.chatguru.com.br/documentacao-api/parametros-obrigatorios

### Ações disponíveis
| Action | Descrição |
|---|---|
| `message_send` | Enviar mensagem de texto |
| `message_file_send` | Enviar arquivo (URL) |
| `message_status` | Verificar status de mensagem enviada |
| `note_add` | Adicionar anotação ao chat |
| `chat_add` | Cadastrar novo chat |
| `chat_add_status` | Verificar cadastro de chat |
| `chat_update_name` | Atualizar nome do chat |
| `chat_update_custom_fields` | Atualizar campos personalizados |
| `chat_update_context` | Adicionar/atualizar contextos |
| `dialog_execute` | Executar diálogo do chatbot |

### Exemplo curl
```bash
curl -X POST 'https://s21.chatguru.app/api/v1' \
  -d 'key=CKW0ZPD7R8KNC34DOK8CKPABRM9OU417IHKF7R5J1JRB1JG5LP6MT719YGKY69QB' \
  -d 'account_id=66eb2b7691396bcd24682bab' \
  -d 'phone_id=66ec42044b5a871161feffa9' \
  -d 'chat_number=55DDDNUMERO' \
  -d 'action=message_send' \
  -d 'text=Mensagem aqui'
```

### Webhook (Post para URL)
O ChatGuru pode fazer POST para uma URL personalizada quando um diálogo é acionado.
Dados enviados: campanha_id, campanha_nome, origem, email, nome, tags[], texto_mensagem,
campos_personalizados{}, bot_context{}, responsavel_nome, responsavel_email, link_chat,
celular, phone_id, chat_id, chat_created, datetime_post, tipo_mensagem

## Departamentos (Grupos)
| ID | Nome | Total chats |
|---|---|---|
| 66f58149561db40cd028a608 | Atendimento Inicial | 79,382 |
| 66f58267a47be2a07797af24 | Pós-venda | 11,941 |
| 66f581a8ef31a77bda792158 | Consulta Médica | 4,651 |
| 66f581f75b8da8a95a8d8a46 | Receita e Orçamento | 4,030 |
| 69163ae0b8004547d8af8774 | Consulta Médica - Chat | 1,639 |
| 66f5822b3cebcd6647067c90 | Documentação - Geral | 592 |
| 6841b7de63a57d5dbe80671d | Documentação - Chat | 354 |
| - | Ninguém Delegado | 402 |
| 66f5824422ee223bfd9be25b | Entrega | 67 |
| 6841b7b188948b5a77983a98 | Documentação - Análise | 3 |
| 686e7698b2a96c27483beff2 | Atendimento Inicial - Clico | 1 |

## Funis
1. **Atendimento inicial:** Entrou em contato → Interagiu → Paciente faz tratamento? → Contato com a cannabis? → Explicação do processo → Aquecimento pagamento → Pagamento pendente → Outbound ATENDEU/Ñ ATENDEU
2. **Consulta Médica:** Aguardando agendamento → Aguardando anamnese → Aguardando consulta
3. **Documentação:** Produto em falta → Rastreio enviado
4. **Entrega:** Código enviado → Produto saiu dos EUA → Produto na Anvisa → Produto entregue → Produto com transportadora
5. **Perdidos:** Sem dinheiro → Queria flor/plantar → Curioso
6. **Pós-venda:** 7d → 15d → 23d → 30d → 45d → 60d → 70d → 75d → 90d → 100d → 120d → 180d
7. **Receita e Orçamento:** Receita Enviada → Orçamento Enviado → Pagamento Pendente

## Status de Chats
- ABERTO: Novo, não atendido
- EM ATENDIMENTO: Agente está respondendo
- AGUARDANDO: Esperando resposta do paciente
- RESOLVIDO: Atendimento concluído
- FECHADO: Chat fechado
- INDEFINIDO: Status não definido

## Números (snapshot 2026-01-31 ~19:00)
- **Total não resolvidos:** 103,198
- **Abertos:** 2,078
- **Em Atendimento:** 96,970
- **Aguardando:** 4,150

## Usuários ChatGuru (equipe Click Cannabis)
- Rogério (rmedeiros@clickcannabis.com) - admin - 44,532 chats
- Gabriel Prates (gprates@clickcannabis.com) - 8,935
- Juliana Aires (jaires@clickcannabis.com) - 6,028
- Natalia Santos (nsantos@clickcannabis.com) - 5,239
- Andressa Silva (asilva@clickcannabis.com) - 4,450
- Bianca Carvalho (bcarvalho@clickcannabis.com) - 1,952
- Andréia Melo (amelo@clickcannabis.com) - 1,386
- Pedro Palhano (ppalhano@clickcannabis.com) - 1,022
- Breno Rocha (bmrocha@clickcannabis.com) - 897
- Andson (asantana@clickcannabis.com) - 809
- Douglas Aguiar (daguiar@clickcannabis.com) - 687
- Lara Medeiros (lmedeiros@clickcannabis.com) - 671
- Daiane (dteixeira@clickcannabis.com) - 636
- Gabriela Mello (gmello@clickcannabis.com) - 625
- Stefanie Gueiros (sgueiros@clickcannabis.com) - 544
- Katlen Pfeifer (kpfeifer@clickcannabis.com) - 468
- Íris Jhanie (ijhanie@clickcannabis.com) - 447
- Jéssica Coelho (jcoelho@clickcannabis.com) - 433
- + mais 30+ usuários com menos chats

### Mensagens de um Chat (GET)
```javascript
// Ler mensagens paginadas de um chat
const r = await fetch('/messages2/{chatId}/page/{pageNum}', { credentials: 'include' });
const data = await r.json();
// Retorna: { cst, messages_and_notes[], count_msg_sent, count_msg_pending, page_num, ... }
// Cada mensagem: { type: "message", m: { text, is_out, type, wa_sender_id, created, timestamp,
//   status, ack, template, bot_response, is_template, deleted, hide, reactions, ... }, date }
// m.is_out: true = enviada pelo agente, false = recebida do paciente
// m.type: "chat" (texto), "template", "image", "audio", "document", "video", "sticker", etc.
// m.ack: 0=pendente, 1=enviado, 2=entregue, 3=lido
// m.bot_response.dialog_executed: chatbot que processou
// Paginação: page 1 = mais antigas, last page = mais recentes
```

### Info do Chat (POST)
```javascript
// Info completa do chat (retorna HTML, não JSON)
const r = await fetch('/chat/{chatId}', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: '{}' });
```

### Custom Fields (POST)
```javascript
// Campos customizados (retorna HTML com inputs)
const r = await fetch('/chat/custom_fields/{chatId}/view', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: '{}' });
// Campos: negotiation_id, user_id, negotiation, payment_consulting_id, link_scheduling_consult,
//   date_consulting, hour_consulting, link_consulting, link_prescription, anamnese_link,
//   doctor_name, full_name, pacient_name, cod_rastreio, patologias, cod_indicacao,
//   review_link, nps_link, whatsapp_code
// IDs dos campos customizados:
//   negotiation_id: 66ede1fc4e46ce3c33c0c22b
//   user_id: 66f1847b988cd3a4b4d4dedf
//   negotiation: 66f1886bb89f290bb89b274c
```

### Tags do Chat (POST)
```javascript
const r = await fetch('/chat_tags/{chatId}', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: '{}' });
```

### Delegação (POST)
```javascript
const r = await fetch('/chat_delegate_input/{chatId}', { method: 'POST', credentials: 'include', headers: {'Content-Type': 'application/json'}, body: '{}' });
```

## O que posso fazer
1. ✅ **Dashboard em tempo real** - Stats de departamentos/usuários
2. ✅ **Lista de chats** - Filtrar por status, departamento, tags, etapa do funil
3. ✅ **Ler mensagens completas** - Histórico completo de qualquer conversa
4. ✅ **Análise de funil** - Distribuição de chats por etapa
5. ✅ **Monitorar workload** - Carga de trabalho por agente
6. ✅ **Análise de tags** - Campanhas/remarketing mais ativos
7. ✅ **Custom fields** - Cruzar dados ChatGuru ↔ DB (negotiation_id = leads.id, user_id = users.id)
8. ✅ **Análise de templates** - Quais templates estão sendo usados
9. ✅ **Comportamento do chatbot** - Bot responses, dialogs executados
10. ⚠️ **API externa** - api.chatguru.app existe mas precisa de token/key separado

## Como Navegar e Ler Chats

### Via Browser (navegação visual)
1. Abrir `https://s21.chatguru.app/chats` (ou `#chatId` para chat específico)
2. Na lista da **esquerda**, clicar no nome do paciente → carrega a conversa no **centro**
3. O **painel direito** mostra: nome, telefone, responsável, tags, campos personalizados
4. Para clicar programaticamente: `document.querySelectorAll('.list__user-card')[index].click()`
5. O chatId fica no hash da URL: `window.location.hash.replace('#', '')`

### Via API (leitura programática)
```javascript
// 1. Pegar chatId da URL ou do /chatlist/store
const chatId = window.location.hash.replace('#', '');

// 2. Ler mensagens (paginadas, ~20 por página)
const r = await fetch('/messages2/' + chatId + '/page/1', { credentials: 'include' });
const data = await r.json();
// data.messages_and_notes[] — array de mensagens
// data.count_msg_sent — total de msgs
// data.count_msg_sent_paginated — total de páginas
// data.cst — status do chat

// 3. Cada mensagem:
// m.m.text — texto da mensagem
// m.m.is_out — true=agente, false=paciente
// m.m.type — "chat", "template", "image", "audio", "document", "video"
// m.m.timestamp.$date — horário UTC
// m.m.status — "sent", "delivered", "read", "processed"
// m.m.ack — 0=pendente, 1=enviado, 2=entregue, 3=lido
// m.m.template — detalhes do template se is_template=true
// m.m.bot_response.dialog_executed — fluxos do chatbot acionados
```

### Fluxo completo para analisar um chat
1. `chatlist/store` (POST) → lista de chats com filtros
2. Pegar `chat.id` do resultado
3. `/messages2/{chatId}/page/{pageNum}` → ler todas as páginas
4. Cruzar `custom_fields.negotiation_id` com `leads.id` no banco de dados
5. Cruzar `custom_fields.user_id` com `users.id` no banco de dados

## API Local de Exportação (chatguru-api.js)
- **Arquivo:** `/Users/pedromota/.openclaw/workspace/chatguru-api.js`
- **Porta:** 18900
- **Iniciar:** `node /Users/pedromota/.openclaw/workspace/chatguru-api.js`
- **Requisito:** Browser OpenClaw com ChatGuru aberto (porta 18800)
- **Funciona via:** CDP (Chrome DevTools Protocol) → executa fetch() no browser autenticado

### Endpoints
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/health` | Status do servidor |
| GET | `/api/dashboard` | Dashboard em tempo real |
| GET | `/api/chats?status=ABERTO&limit=50` | Listar chats com filtros |
| GET | `/api/chat/:chatId/messages?page=1` | Mensagens paginadas |
| GET | `/api/chat/:chatId/export` | Export completo (todas as páginas) JSON |
| GET | `/api/chat/:chatId/export?format=text` | Export formato texto legível |
| GET | `/api/funnels` | Funis e etapas |
| GET | `/api/tags` | Todas as tags |
| GET | `/api/users` | Usuários e grupos |

## Tags (154+ tags)
Categorias principais: Remarketing, Campanhas, Pós-venda, Objeções, Promoções, Operacional
