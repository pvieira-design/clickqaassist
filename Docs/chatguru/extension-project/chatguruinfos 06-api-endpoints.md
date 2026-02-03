# 06 - API Endpoints

> Documentação técnica dos endpoints internos (Browser/Fetch) e externos (REST API v1).
> Para a extensão, recomenda-se usar os **Endpoints Internos** via `fetch` no contexto da página (compartilhando cookies de sessão).

---

## 6.1 Autenticação e Contexto

### 6.1.1 Sessão Browser (Interna)
A plataforma usa autenticação baseada em **Cookies HTTP-only**.
- **Contexto**: O browser já está autenticado.
- **Como usar**: Fazer requisições `fetch()` com `credentials: 'include'`.
- **Token**: Não há header Authorization explícito; o cookie `connect.sid` (ou similar) gerencia a sessão.

### 6.1.2 API REST v1 (Externa)
Para automações server-side ou quando precisar de permissões de admin explícitas.
- **Endpoint Base**: `https://s21.chatguru.app/api/v1`
- **Método**: `POST` (multipart/form-data ou x-www-form-urlencoded)
- **Key**: `CKW0ZPD7R8KNC34DOK8CKPABRM9OU417IHKF7R5J1JRB1JG5LP6MT719YGKY69QB`
- **Account ID**: `66eb2b7691396bcd24682bab`
- **Phone ID**: `66ec42044b5a871161feffa9`

---

## 6.2 Endpoints Internos (Browser Context)

Estes endpoints devem ser chamados via `fetch` injetado na página (`content.js` ou `executeScript`).

### 6.2.1 Listar Chats (Principal)
Endpoint principal para buscar e filtrar conversas.

- **URL**: `POST /chatlist/store`
- **Headers**: `Content-Type: application/json`
- **Body**:
```javascript
{
  "page": 1,              // Paginação
  "limit": 100,           // Itens por página
  "search": "",           // Busca textual (nome/número)
  "status": "ABERTO",     // Status (opcional)
  "user_ids": [],         // Filtrar por usuário
  "group_ids": [],        // Filtrar por departamento
  "tags": [],             // Filtrar por tags
  "funnel_step": null     // Filtrar por etapa do funil
}
```
- **Resposta (JSON)**:
```javascript
{
  "total_chats": 103198,
  "total_returned": 100,
  "page_num": 1,
  "chats": [
    {
      "id": "697fdae0c30edc5d32e99935",
      "name": "Nome do Lead",
      "status": "ABERTO",
      "new_messages": 2,
      "last_message": { "text": "...", "date": "..." },
      "users_delegated_ids": ["..."],
      "groups_delegated_ids": ["..."]
    }
  ]
}
```

### 6.2.2 Histórico de Mensagens
Endpoint para ler o conteúdo da conversa. Essencial para a análise de feedback.

- **URL**: `GET /messages2/{chatId}/page/{pageNum}`
- **Parâmetros**:
  - `chatId`: ID do chat (ex: `697fdae0c30edc5d32e99935`)
  - `pageNum`: 1 (mensagens mais antigas) até N (mensagens mais recentes)
- **Resposta (JSON)**:
```javascript
{
  "cst": "EM ATENDIMENTO",
  "count_msg_sent": 150,          // Total de mensagens
  "count_msg_sent_paginated": 8,  // Total de páginas (aprox 20 msgs/página)
  "messages_and_notes": [
    {
      "type": "message",
      "m": {
        "text": "Olá!",
        "is_out": true,           // true=Agente, false=Lead
        "status": "read",
        "timestamp": { "$date": 1738520000000 }
      }
    }
  ]
}
```
> **Nota**: Para análise completa, iterar `pageNum` de 1 até `count_msg_sent_paginated`.

### 6.2.3 Dashboard Stats
Resumo de chats não resolvidos por departamento.

- **URL**: `GET /dashboard/chats/unresolved`
- **Resposta (JSON)**:
```javascript
{
  "total_unresolved": 103198,
  "groups": [
    { "id": "...", "name": "Atendimento Inicial", "count": 79382 },
    { "id": "...", "name": "Pós-venda", "count": 11941 }
  ],
  "users": [
    { "id": "...", "name": "Rogério", "count": 44532 }
  ]
}
```

### 6.2.4 Tags e Funis
Para obter metadados do sistema.

- **Tags**: `GET /chatlist/tags` (Retorna array de tags)
- **Funis**: `GET /chatlist/funnels` (Retorna funis e etapas)
- **Usuários**: `GET /get_users_and_groups` (Retorna usuários e grupos)

### 6.2.5 Informações do Chat (HTML)
Alguns endpoints retornam HTML parcial renderizado (legado).

- **Info Lead**: `POST /chat/{chatId}`
- **Campos Custom**: `POST /chat/custom_fields/{chatId}/view`
- **Tags do Chat**: `POST /chat_tags/{chatId}`

---

## 6.3 API REST v1 (Ações de Escrita)

Use esta API para ações ativas (enviar mensagem, atualizar campos) se a interface interna falhar ou for complexa.

### Base Request
```javascript
const formData = new FormData();
formData.append('key', 'CKW0ZPD7R8KNC34DOK8CKPABRM9OU417IHKF7R5J1JRB1JG5LP6MT719YGKY69QB');
formData.append('account_id', '66eb2b7691396bcd24682bab');
formData.append('phone_id', '66ec42044b5a871161feffa9');
// ... parâmetros específicos da ação
```

### 6.3.1 Enviar Mensagem (`message_send`)
```javascript
formData.append('action', 'message_send');
formData.append('chat_number', '5521999999999'); // OU chat_id
formData.append('text', 'Olá, tudo bem?');
```

### 6.3.2 Atualizar Campos (`chat_update_custom_fields`)
```javascript
formData.append('action', 'chat_update_custom_fields');
formData.append('chat_id', '697fdae0c30edc5d32e99935');
formData.append('custom_fields', JSON.stringify({
  negotiation_id: '12345',
  user_id: '67890'
}));
```

### 6.3.3 Adicionar Nota Interna (`note_add`)
Útil para a extensão salvar o feedback gerado diretamente no chat como nota interna.
```javascript
formData.append('action', 'note_add');
formData.append('chat_id', '...');
formData.append('text', '📝 Feedback IA: Atendimento rápido, mas faltou cordialidade.');
```

---

## 6.4 Snippets de Uso (JavaScript)

### Fetch Wrapper para Extensão
Copie este helper para usar na extensão. Ele gerencia as chamadas internas.

```javascript
const CG_API = {
  /**
   * Faz request interno (browser context)
   */
  async request(path, options = {}) {
    const defaultOpts = {
      credentials: 'include', // IMPORTANTE: usa cookies da sessão
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const finalOpts = { ...defaultOpts, ...options };
    if (finalOpts.body && typeof finalOpts.body === 'object') {
      finalOpts.body = JSON.stringify(finalOpts.body);
    }
    
    const res = await fetch(path, finalOpts);
    if (!res.ok) throw new Error(`CG API Error: ${res.status}`);
    
    // Tenta parsear JSON, fallback para texto (endpoints HTML)
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  },

  /**
   * Busca histórico completo do chat
   */
  async getFullHistory(chatId) {
    // 1. Pega primeira página para saber total
    const p1 = await this.request(`/messages2/${chatId}/page/1`);
    let msgs = [...p1.messages_and_notes];
    const totalPages = p1.count_msg_sent_paginated;

    // 2. Itera restantes (pode limitar para performance)
    const promises = [];
    for (let p = 2; p <= totalPages; p++) {
      promises.push(this.request(`/messages2/${chatId}/page/${p}`));
    }
    
    const results = await Promise.all(promises);
    results.forEach(r => msgs.push(...r.messages_and_notes));
    
    // Ordena por data (antiga -> nova)
    return msgs.sort((a, b) => {
      const ta = new Date(a.m.timestamp?.$date || a.date?.$date).getTime();
      const tb = new Date(b.m.timestamp?.$date || b.date?.$date).getTime();
      return ta - tb;
    });
  }
};
```

---

*Documento atualizado em 02/02/2026*
