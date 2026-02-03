# ChatGuru Export API — Documentação

> **Versão:** 2.1  
> **Atualizado:** 2026-02-02  
> **Autor:** Percival (OpenClaw)

## Visão Geral

API REST local que expõe dados do ChatGuru (plataforma de atendimento via WhatsApp da Click Cannabis). Funciona como proxy: conecta ao browser autenticado via CDP e executa requisições no contexto da sessão.

### URL Base (via Cloudflare Tunnel)

```
https://biblical-electron-doctors-outdoor.trycloudflare.com
```

> ⚠️ **Nota:** Esta URL pode mudar se o servidor reiniciar. Verificar arquivo `tunnel-url.txt` para URL atual.

### Arquitetura

```
[n8n / Cliente] 
      ↓ HTTPS
[Cloudflare Tunnel] 
      ↓ HTTP
[chatguru-api.js :18900] 
      ↓ WebSocket (CDP)
[Chrome Browser :18800] 
      ↓ fetch() autenticado
[ChatGuru API s21.chatguru.app]
```

---

## Endpoints

### 1. Health Check

Verifica se o servidor está funcionando e se há uma aba do ChatGuru aberta.

```http
GET /api/health
```

**Resposta de Sucesso (200):**
```json
{
  "status": "ok",
  "chatguru_tab": "ChatGuru | Chats",
  "url": "https://s21.chatguru.app/chats#694c244437ce1785d34ead0e",
  "transcription": "available"
}
```

**Resposta de Erro (503):**
```json
{
  "status": "error",
  "message": "Nenhuma aba do ChatGuru encontrada no browser. Abra https://s21.chatguru.app/chats"
}
```

---

### 2. Dashboard

Retorna o dashboard de chats não resolvidos em tempo real.

```http
GET /api/dashboard
```

**Resposta:** Dados brutos do endpoint `/dashboard/chats/unresolved` do ChatGuru.

---

### 3. Listar Chats

Lista chats com filtros opcionais.

```http
GET /api/chats?status=ABERTO&limit=50&page=1
```

**Query Parameters:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | int | 1 | Número da página |
| `limit` | int | 100 | Máximo 100 por página |
| `status` | string | - | Filtro por status: `ABERTO`, `EM ATENDIMENTO`, `AGUARDANDO`, etc. |
| `group_id` | string | - | Filtro por ID do departamento/grupo |
| `user_id` | string | - | Filtro por ID do usuário/atendente |

**Resposta:** Array de chats com dados do lead, status, tags, etc.

---

### 4. Mensagens de um Chat (Paginado)

Retorna mensagens de um chat específico, uma página por vez.

```http
GET /api/chat/:chatId/messages?page=1
```

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `chatId` | string | ID do chat (MongoDB ObjectId) |

**Query Parameters:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `page` | int | 1 | Número da página |

**Resposta (200):**
```json
{
  "chatId": "697fdae0c30edc5d32e99935",
  "chatStatus": "EM ATENDIMENTO",
  "page": 1,
  "totalMessages": 156,
  "totalPages": 8,
  "messages": [
    {
      "id": "679f1a2b3c4d5e6f7g8h9i0j",
      "from": "patient",
      "text": "Olá, gostaria de agendar uma consulta",
      "type": "chat",
      "timestamp": "2026-01-15T14:30:00.000Z",
      "status": "delivered",
      "ack": 3,
      "isTemplate": false,
      "templateName": null,
      "botDialogs": [],
      "deleted": false
    },
    {
      "id": "679f1a2b3c4d5e6f7g8h9i1k",
      "from": "agent",
      "text": "Olá! Seja bem-vindo à Click Cannabis...",
      "type": "chat",
      "timestamp": "2026-01-15T14:31:00.000Z",
      "status": "read",
      "ack": 4,
      "isTemplate": true,
      "templateName": "boas_vindas_v2",
      "botDialogs": ["Boas-vindas", "Menu Principal"],
      "deleted": false
    }
  ]
}
```

---

### 5. Exportação Completa do Chat ⭐

**Este é o endpoint principal para análise de chats.**

Exporta todas as mensagens de um chat em formato estruturado, com opção de transcrição de áudios.

```http
GET /api/chat/:chatId/export?format=n8n&transcribe=true
```

**Path Parameters:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `chatId` | string | ID do chat (MongoDB ObjectId) |

**Query Parameters:**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `format` | string | `json` | Formato: `json`, `text`, ou `n8n` |
| `transcribe` | boolean | `false` | Se `true`, transcreve áudios via Whisper |

#### Formatos de Saída

**format=json (padrão):**
```json
{
  "chatId": "697fdae0c30edc5d32e99935",
  "chatStatus": "EM ATENDIMENTO",
  "totalMessages": 156,
  "exportedAt": "2026-02-02T22:35:00.000Z",
  "transcriptionEnabled": true,
  "messages": [
    {
      "id": "679f1a2b...",
      "from": "patient",
      "text": "Olá, preciso de ajuda",
      "type": "chat",
      "timestamp": "2026-01-15T14:30:00.000Z",
      "status": "read",
      "ack": 4,
      "isTemplate": false,
      "templateName": null,
      "botDialogs": [],
      "deleted": false,
      "transcribed": false
    }
  ]
}
```

**format=n8n:** ⭐ Recomendado para integração
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
  },
  {
    "chatId": "697fdae0c30edc5d32e99935",
    "chatStatus": "EM ATENDIMENTO",
    "messageId": "679f1a2d...",
    "direction": "agent",
    "agentName": null,
    "text": "O processo é muito simples! Primeiro você realiza sua consulta...",
    "messageType": "chat",
    "timestamp": "2026-01-15T14:36:00.000Z",
    "timestampBR": "15/01/2026, 11:36:00",
    "status": "delivered",
    "isTemplate": true,
    "templateName": "explicacao_processo",
    "deleted": false,
    "transcribed": false
  }
]
```

> **Nota sobre `agentName`:** 
> - `null` quando é mensagem do **paciente** (`direction: "patient"`)
> - `null` quando é **template automático** ou **bot** (sem atendente humano)
> - Nome do atendente quando é **mensagem manual** de um agente (ex: `"Juliana Aires"`, `"Rogério"`)
> - Útil para identificar **handoffs** (trocas de atendente no mesmo chat)

**format=text:** Texto legível para humanos
```
=== Chat Export: 697fdae0c30edc5d32e99935 ===
Status: EM ATENDIMENTO
Total: 156 mensagens
Transcrição: ativada
Exportado em: 2026-02-02T22:35:00.000Z
==================================================

[15/01/2026, 11:30:00] ⚪ PACIENTE:
Olá, preciso de ajuda

[15/01/2026, 11:31:00] 🟢 Juliana Aires:
Olá! Seja bem-vindo à Click Cannabis...

[15/01/2026, 11:33:00] 🟢 CLICK (sem atendente):
O processo é muito simples! Primeiro você realiza sua consulta...

[15/01/2026, 11:35:00] 🟢 Rogério 🎙️:
O paciente disse que está com dor de cabeça há três dias...
```

> **Formato text:** Agora mostra o **nome do atendente** em vez de apenas "CLICK". Templates/bots aparecem como "CLICK (sem atendente)".

---

### 6. Funis

Lista todos os funis e etapas configurados.

```http
GET /api/funnels
```

---

### 7. Tags

Lista todas as tags disponíveis.

```http
GET /api/tags
```

---

### 8. Usuários e Grupos

Lista usuários (atendentes) e grupos (departamentos).

```http
GET /api/users
```

---

### 9. Transcrição Avulsa

Transcreve um arquivo de áudio a partir de uma URL.

```http
POST /api/transcribe
Content-Type: application/json

{
  "url": "https://zapguruusers.s3.ca-central-1.amazonaws.com/..."
}
```

**Resposta:**
```json
{
  "transcript": "Texto transcrito do áudio..."
}
```

---

## Tipos de Mensagem

| Tipo | Descrição |
|------|-----------|
| `chat` | Mensagem de texto |
| `image` | Imagem |
| `video` | Vídeo |
| `audio` | Áudio (gravado) |
| `ptt` | Áudio (push-to-talk / mensagem de voz) |
| `document` | Documento (PDF, etc.) |
| `sticker` | Figurinha |
| `location` | Localização |
| `contact` | Contato |
| `template` | Mensagem de template HSM |

---

## Campos de Direção

| Valor | Descrição |
|-------|-----------|
| `patient` | Mensagem enviada pelo paciente/cliente |
| `agent` | Mensagem enviada pelo atendente ou bot da Click |

---

## Campo `agentName` ⭐ (Novo v2.1)

Identifica **qual atendente** enviou cada mensagem. Essencial para análise de qualidade quando há múltiplos atendentes no mesmo chat.

| Valor | Significado |
|-------|-------------|
| `null` | Mensagem do **paciente** (`direction: "patient"`) |
| `null` | **Template/bot automático** (sem atendente humano) |
| `"Juliana Aires"` | Mensagem manual enviada por **Juliana Aires** |
| `"Rogério"` | Mensagem manual enviada por **Rogério** |

### Exemplo de Handoff (troca de atendente)

```
20:00 - Rogério:        "Seja bem-vindo!"
20:05 - Rogério:        "Há quanto tempo você sofre com isso?"
21:53 - Juliana Aires:  "Olá! Eu sou a Juliana, vou dar continuidade..."  ← HANDOFF
21:55 - null:           "O processo é muito simples..." (template)
22:17 - Juliana Aires:  "Posso gerar seu link de pagamento?"
```

### Como usar para análise

```javascript
// Identificar todos os atendentes que participaram do chat
const atendentes = [...new Set(
  messages
    .filter(m => m.direction === 'agent' && m.agentName)
    .map(m => m.agentName)
)];
// → ["Rogério", "Juliana Aires"]

// Contar mensagens por atendente
const porAtendente = messages.reduce((acc, m) => {
  if (m.direction === 'agent') {
    const key = m.agentName || 'Template/Bot';
    acc[key] = (acc[key] || 0) + 1;
  }
  return acc;
}, {});
// → { "Rogério": 4, "Juliana Aires": 5, "Template/Bot": 3 }
```

---

## Status de Mensagem

| Código | Status | Descrição |
|--------|--------|-----------|
| 0 | pending | Pendente |
| 1 | sent | Enviada |
| 2 | delivered | Entregue |
| 3 | delivered | Entregue (alternativo) |
| 4 | read | Lida |

---

## Headers Recomendados

Para evitar warnings do Cloudflare Tunnel:

```http
Bypass-Tunnel-Reminder: true
```

---

## Exemplo de Uso com n8n

### Nó HTTP Request

- **Method:** GET
- **URL:** `https://biblical-electron-doctors-outdoor.trycloudflare.com/api/chat/{{$json.chatId}}/export?format=n8n&transcribe=true`
- **Headers:**
  - `Bypass-Tunnel-Reminder: true`

### Workflow Típico

1. **Trigger:** Webhook recebe chatId
2. **HTTP Request:** Busca histórico do chat
3. **Split In Batches:** Processa mensagens
4. **OpenAI/Claude:** Analisa qualidade do atendimento
5. **Slack/Email:** Envia resultado

---

## Limitações

- Requer browser Chrome com sessão ativa do ChatGuru
- Transcrição de áudio usa Whisper local (~5-10s por áudio)
- Máximo 50 páginas de mensagens por exportação (~2500 msgs)
- URL do túnel pode mudar se o servidor reiniciar

---

## Troubleshooting

### Erro: "Nenhuma aba do ChatGuru encontrada"
→ Abra https://s21.chatguru.app/chats no browser OpenClaw (perfil `openclaw`)

### Erro: "CDP timeout"
→ Reinicie o browser: `browser action=stop profile=openclaw` + `browser action=start profile=openclaw`

### Áudios não transcritos
→ Verifique se whisper-cli está instalado: `which whisper-cli`
→ Verifique modelo: `ls -la whisper-cpp/models/ggml-base.bin`

---

## Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `chatguru-api.js` | Código fonte do servidor |
| `tunnel-url.txt` | URL atual do Cloudflare Tunnel |
| `cloudflare-tunnel-token.txt` | Token do túnel nomeado (backup) |
| `chatguru-tunnel-keeper.sh` | Script de monitoramento do túnel |

---

## Contato

Dúvidas sobre a API: fale com Percival (OpenClaw) ou consulte a documentação em `memory/chatguru/`.
