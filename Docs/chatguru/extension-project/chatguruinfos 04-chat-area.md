# 04 - Chat Area (Área Central de Mensagens)

> Área central: header do chat, histórico de mensagens, área de input, manipulação DOM e API

---

## 4.1 Visão Geral

A área central é onde acontece a conversa. Dividida em 3 partes:

```
┌─────────────────────────────────────────────────────────────────┐
│ [Avatar] Simone - Sandro Chaves Miranda  [EM ATENDIMENTO ▼]     │
│ [📎] [⏰] [⋮]                                                    │  ← HEADER
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         06/01/26                                │  ← Separador de data
│                                                                 │
│                    ┌────────────────────────┐                   │
│                    │ Mensagem enviada       │                   │  ← Balão OUT (verde)
│                    │ pelo atendente         │                   │
│                    │ 10:00 ✓✓               │                   │
│                    └────────────────────────┘                   │
│                                                                 │
│  ┌────────────────────────┐                                     │
│  │ Mensagem recebida      │                                     │  ← Balão IN (branco)
│  │ do paciente            │                                     │
│  │ 10:05                  │                                     │
│  └────────────────────────┘                                     │
│                                                                 │
│                         02/02/26                                │
│                                                                 │
│                    ┌────────────────────────┐                   │
│                    │ [Imagem/Template]      │                   │  ← Mídia ou template
│                    │ Texto complementar...  │                   │
│                    │ 18:00 ✓✓               │                   │
│                    └────────────────────────┘                   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [📎] [😊] [____________________________] [⏰] [▶] [🎤]          │  ← INPUT
└─────────────────────────────────────────────────────────────────┘
```

---

## 4.2 Header do Chat

### 4.2.1 Estrutura DOM

```html
<div class="chat-header">
  <!-- Avatar e Nome -->
  <div class="chat-header__info">
    <img class="chat-avatar" src="/static/noimg.png" alt="user">
    <span class="chat-name">Simone - Sandro Chaves Miranda</span>
  </div>
  
  <!-- Dropdown de Status -->
  <div class="chat-status-dropdown">
    <button class="btn btn-success dropdown-toggle">
      EM ATENDIMENTO <span class="caret"></span>
    </button>
    <ul class="dropdown-menu">
      <li><a data-status="ABERTO">ABERTO</a></li>
      <li><a data-status="EM ATENDIMENTO">EM ATENDIMENTO</a></li>
      <li><a data-status="AGUARDANDO">AGUARDANDO</a></li>
      <li><a data-status="RESOLVIDO">RESOLVIDO</a></li>
      <li><a data-status="FECHADO">FECHADO</a></li>
    </ul>
  </div>
  
  <!-- Botões de Ação -->
  <div class="chat-header__actions">
    <button class="btn-attachment" title="Anexar arquivo">📎</button>
    <button class="btn-schedule" title="Agendar mensagem">⏰</button>
    <button class="btn-more dropdown-toggle" title="Mais opções">⋮</button>
  </div>
</div>
```

### 4.2.2 Obter Informações do Chat Atual

```javascript
function getCurrentChatInfo() {
  return {
    // ID do chat (via URL hash)
    chatId: window.location.hash.replace('#', ''),
    
    // Nome do paciente
    name: document.querySelector('.chat-name, [class*="chat-header"] [class*="name"]')?.textContent?.trim(),
    
    // Status atual
    status: document.querySelector('.chat-status-dropdown button, [class*="status"] button')?.textContent?.trim(),
    
    // Avatar
    avatarUrl: document.querySelector('.chat-avatar, [class*="chat-header"] img')?.src
  };
}
```

### 4.2.3 Mudar Status do Chat

```javascript
async function changeChatStatus(newStatus) {
  const chatId = window.location.hash.replace('#', '');
  if (!chatId) return false;
  
  // Via API (mais confiável)
  const response = await fetch(`/chat/${chatId}/status`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  });
  
  return response.ok;
}

// Ou via DOM (clicando no dropdown)
function changeChatStatusViaUI(newStatus) {
  // 1. Abrir dropdown
  const dropdown = document.querySelector('.chat-status-dropdown button, [class*="status"] .dropdown-toggle');
  if (dropdown) dropdown.click();
  
  // 2. Clicar na opção
  setTimeout(() => {
    const options = document.querySelectorAll('.dropdown-menu a, .dropdown-menu li');
    options.forEach(opt => {
      if (opt.textContent?.trim() === newStatus || 
          opt.getAttribute('data-status') === newStatus) {
        opt.click();
      }
    });
  }, 100);
}

// Status válidos
const VALID_STATUSES = [
  'ABERTO',
  'EM ATENDIMENTO', 
  'AGUARDANDO',
  'RESOLVIDO',
  'FECHADO',
  'INDEFINIDO'
];
```

### 4.2.4 Menu de Ações (⋮)

```javascript
// Opções do menu "Mais"
const CHAT_ACTIONS = {
  'Apagar Todas as Mensagens': '.chat_delete_all_messages',
  'Exportar Conversa': '.chat_export',
  'Bloquear Contato': '.chat_block',
  'Arquivar Chat': '.chat_archive'
};

// Exemplo: abrir modal de apagar mensagens
function openDeleteMessagesModal() {
  const btn = document.querySelector('.chat_delete_all_messages');
  if (btn) btn.click();
}
```

---

## 4.3 Área de Mensagens

### 4.3.1 Container Principal

```javascript
// Seletores para a área de mensagens
const MESSAGE_AREA_SELECTORS = {
  container: '#chat_messages_app, .messages_in_out',
  messagesWrapper: '.msg-data',
  loadMoreBtn: '.alert-info:has(.fa-plus-circle)'
};

function getMessagesContainer() {
  return document.querySelector('#chat_messages_app') ||
         document.querySelector('.messages_in_out');
}
```

### 4.3.2 Estrutura de um Balão de Mensagem

As mensagens são renderizadas dinamicamente. Estrutura típica:

```html
<!-- Separador de data -->
<div class="date-separator">
  <span>06/01/26</span>
</div>

<!-- Mensagem enviada (OUT) -->
<div class="msg-bubble msg-out">
  <div class="msg-content">
    <span class="msg-text">Texto da mensagem enviada</span>
  </div>
  <div class="msg-footer">
    <span class="msg-time">10:00</span>
    <span class="msg-status">
      <i class="fa fa-check-double"></i> <!-- ✓✓ lido -->
    </span>
  </div>
</div>

<!-- Mensagem recebida (IN) -->
<div class="msg-bubble msg-in">
  <div class="msg-content">
    <span class="msg-text">Texto da mensagem recebida</span>
  </div>
  <div class="msg-footer">
    <span class="msg-time">10:05</span>
  </div>
</div>

<!-- Mensagem com mídia -->
<div class="msg-bubble msg-out msg-media">
  <div class="msg-media-wrapper">
    <img src="https://s3.../image.jpg" class="msg-image">
  </div>
  <div class="msg-content">
    <span class="msg-text">Legenda da imagem</span>
  </div>
  <div class="msg-footer">
    <span class="msg-time">18:00</span>
    <span class="msg-status">✓✓</span>
  </div>
</div>

<!-- Template (mensagem estruturada) -->
<div class="msg-bubble msg-out msg-template">
  <div class="template-header">
    <img src="header-image.jpg">
  </div>
  <div class="template-body">
    <strong>Título do Template</strong>
    <p>Corpo do template com variáveis preenchidas</p>
  </div>
  <div class="template-footer">
    <span class="footer-text">Rodapé</span>
  </div>
  <div class="template-buttons">
    <button>Botão 1</button>
    <button>Botão 2</button>
  </div>
</div>
```

### 4.3.3 Obter Mensagens via API (Recomendado)

A forma mais confiável de obter mensagens é via API:

```javascript
/**
 * Busca mensagens de um chat via API
 * @param {string} chatId - ID do chat (MongoDB ObjectId)
 * @param {number} page - Página (1 = mais antigas, última = mais recentes)
 * @returns {Promise<Object>} Dados das mensagens
 */
async function fetchMessages(chatId, page = 1) {
  const response = await fetch(`/messages2/${chatId}/page/${page}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
}

// Estrutura da resposta
const MESSAGES_RESPONSE = {
  // Status do chat
  cst: 'EM ATENDIMENTO',
  
  // Contadores
  count_msg_sent: 111,           // Total de mensagens
  count_msg_pending: 0,          // Pendentes de envio
  count_msg_sent_paginated: 20,  // Total de páginas
  page_num: 1,                   // Página atual
  
  // Mensagens (array)
  messages_and_notes: [
    {
      type: 'message',  // ou 'note' para anotações
      date: { $date: '2026-01-06T14:04:56.229Z' },
      m: {
        _id: { $oid: '695d1687f06a60f2d7b6fa7d' },
        text: 'Texto da mensagem',
        is_out: true,           // true = enviada, false = recebida
        type: 'chat',           // tipo da mensagem
        status: 'sent',         // sent, delivered, read
        ack: 3,                 // 0=pendente, 1=enviado, 2=entregue, 3=lido
        timestamp: { $date: '...' },
        wa_sender_id: '5521993686082',
        is_template: false,
        deleted: false,
        reactions: [],
        // Para mídia:
        file: {
          name: 'audio.ogg',
          path_relative: 'https://s3.../bucket',
          mime: 'audio/ogg'
        }
      }
    }
  ]
};

// Exemplo: buscar todas as mensagens de um chat
async function getAllMessages(chatId) {
  const allMessages = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const data = await fetchMessages(chatId, page);
    allMessages.push(...data.messages_and_notes);
    
    if (page >= data.count_msg_sent_paginated) {
      hasMore = false;
    } else {
      page++;
    }
  }
  
  return allMessages;
}
```

### 4.3.4 Tipos de Mensagem

```javascript
const MESSAGE_TYPES = {
  'chat': 'Texto simples',
  'template': 'Mensagem template (HSM)',
  'image': 'Imagem',
  'audio': 'Áudio/voz',
  'video': 'Vídeo',
  'document': 'Documento/arquivo',
  'sticker': 'Figurinha',
  'location': 'Localização',
  'contacts': 'Contatos (vCard)',
  'interactive': 'Mensagem interativa (botões)',
  'order': 'Pedido (catálogo)'
};

// Verificar tipo
function getMessageType(msg) {
  return msg.m?.type || 'unknown';
}

// Verificar se é mídia
function isMediaMessage(msg) {
  const mediaTypes = ['image', 'audio', 'video', 'document', 'sticker'];
  return mediaTypes.includes(msg.m?.type);
}

// Obter URL da mídia
function getMediaUrl(msg) {
  if (!msg.m?.file) return null;
  
  const file = msg.m.file;
  if (file.path_relative?.startsWith('https://')) {
    return `${file.path_relative}/${file.name}`;
  }
  
  // Fallback para S3 padrão
  return `https://zapguruusers.s3.ca-central-1.amazonaws.com/${file.path_relative}/${file.name}`;
}
```

### 4.3.5 Indicadores de Status (ACK)

```javascript
const ACK_STATUS = {
  0: { icon: '⏳', label: 'Pendente', class: 'ack-pending' },
  1: { icon: '✓', label: 'Enviado', class: 'ack-sent' },
  2: { icon: '✓✓', label: 'Entregue', class: 'ack-delivered' },
  3: { icon: '✓✓', label: 'Lido', class: 'ack-read', color: 'blue' }
};

function getAckIcon(ackValue) {
  return ACK_STATUS[ackValue] || ACK_STATUS[0];
}
```

### 4.3.6 Obter Mensagens do DOM (Fallback)

Se precisar ler do DOM (menos confiável):

```javascript
function getMessagesFromDOM() {
  const bubbles = document.querySelectorAll('.msg-bubble, [class*="message-bubble"]');
  
  return Array.from(bubbles).map(bubble => {
    const isOut = bubble.classList.contains('msg-out') || 
                  bubble.classList.contains('outgoing');
    const text = bubble.querySelector('.msg-text, [class*="text"]')?.textContent;
    const time = bubble.querySelector('.msg-time, [class*="time"]')?.textContent;
    
    return {
      element: bubble,
      isOut,
      text: text?.trim(),
      time: time?.trim()
    };
  });
}
```

---

## 4.4 Scroll e Carregamento

### 4.4.1 Scroll para Mensagem Específica

```javascript
function scrollToMessage(messageId) {
  const msg = document.querySelector(`[data-message-id="${messageId}"]`);
  if (msg) {
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Destacar temporariamente
    msg.classList.add('highlighted');
    setTimeout(() => msg.classList.remove('highlighted'), 2000);
  }
}
```

### 4.4.2 Carregar Mais Mensagens

```javascript
function loadMoreMessages() {
  const loadBtn = document.querySelector('.alert-info:has(.fa-plus-circle)');
  if (loadBtn) {
    loadBtn.click();
    return true;
  }
  return false;
}

// Carregar todas as mensagens (com throttle)
async function loadAllMessages() {
  let loaded = true;
  while (loaded) {
    loaded = loadMoreMessages();
    if (loaded) {
      await new Promise(r => setTimeout(r, 500)); // Esperar carregar
    }
  }
}
```

### 4.4.3 Scroll para Fim (Mensagens Recentes)

```javascript
function scrollToBottom() {
  const container = getMessagesContainer();
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// Observar novas mensagens (real-time via Pusher)
function observeNewMessages(callback) {
  const container = getMessagesContainer();
  if (!container) return null;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.classList?.contains('msg-bubble')) {
          callback(node);
        }
      });
    });
  });
  
  observer.observe(container, { 
    childList: true, 
    subtree: true 
  });
  
  return observer;
}
```

---

## 4.5 Área de Input

### 4.5.1 Estrutura

```html
<div class="chat-input-area">
  <!-- Botão anexar arquivo -->
  <button class="btn-attach" title="Anexar">
    <i class="fa fa-paperclip"></i>
  </button>
  
  <!-- Botão emoji -->
  <button class="btn-emoji" title="Emoji">
    <i class="fa fa-smile"></i>
  </button>
  
  <!-- Campo de texto -->
  <textarea 
    class="chat-input" 
    placeholder="Digite uma mensagem..."
    rows="1"
  ></textarea>
  
  <!-- Botão agendar -->
  <button class="btn-schedule" title="Agendar">
    <i class="fa fa-clock"></i>
  </button>
  
  <!-- Botão enviar -->
  <button class="btn-send" title="Enviar">
    <i class="fa fa-paper-plane"></i>
  </button>
  
  <!-- Botão gravar áudio -->
  <button class="btn-record" title="Gravar áudio">
    <i class="fa fa-microphone"></i>
  </button>
</div>
```

### 4.5.2 Manipular Input

```javascript
// Seletores
const INPUT_SELECTORS = {
  textarea: 'textarea.chat-input, [class*="input"] textarea, [contenteditable="true"]',
  sendBtn: '.btn-send, button[title*="Enviar"], button:has(.fa-paper-plane)',
  attachBtn: '.btn-attach, button:has(.fa-paperclip)',
  emojiBtn: '.btn-emoji, button:has(.fa-smile)',
  recordBtn: '.btn-record, button:has(.fa-microphone)'
};

// Obter input
function getMessageInput() {
  return document.querySelector(INPUT_SELECTORS.textarea);
}

// Digitar mensagem
function typeMessage(text) {
  const input = getMessageInput();
  if (!input) return false;
  
  // Se for textarea
  if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // Se for contenteditable
  else if (input.getAttribute('contenteditable')) {
    input.textContent = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  return true;
}

// Enviar mensagem (clicando no botão)
function sendMessage(text) {
  if (!typeMessage(text)) return false;
  
  // Clicar no botão de enviar
  const sendBtn = document.querySelector(INPUT_SELECTORS.sendBtn);
  if (sendBtn) {
    sendBtn.click();
    return true;
  }
  
  // Alternativa: pressionar Enter
  const input = getMessageInput();
  if (input) {
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      bubbles: true
    }));
    return true;
  }
  
  return false;
}
```

### 4.5.3 Enviar via API (Recomendado para extensões)

```javascript
async function sendMessageViaAPI(chatId, text) {
  // Usar API REST v1
  const formData = new URLSearchParams({
    key: 'CKW0ZPD7R8KNC34DOK8CKPABRM9OU417IHKF7R5J1JRB1JG5LP6MT719YGKY69QB',
    account_id: '66eb2b7691396bcd24682bab',
    phone_id: '66ec42044b5a871161feffa9',
    chat_number: getChatPhoneNumber(chatId), // Precisa obter
    action: 'message_send',
    text: text
  });
  
  const response = await fetch('https://s21.chatguru.app/api/v1', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}
```

---

## 4.6 Templates e Respostas Rápidas

### 4.6.1 Acessar Templates

```javascript
// Botão "Mensagem Template" aparece acima do input
function openTemplateSelector() {
  const btn = document.querySelector('[class*="template"], button:contains("Template")');
  if (btn) btn.click();
}

// Selecionar template por nome
function selectTemplate(templateName) {
  openTemplateSelector();
  setTimeout(() => {
    const templates = document.querySelectorAll('.template-item, [class*="template-option"]');
    templates.forEach(t => {
      if (t.textContent.includes(templateName)) {
        t.click();
      }
    });
  }, 200);
}
```

### 4.6.2 Respostas Rápidas

```javascript
// Atalho: digitar / para abrir respostas rápidas
function triggerQuickReply() {
  const input = getMessageInput();
  if (input) {
    typeMessage('/');
    // O ChatGuru mostrará sugestões de respostas rápidas
  }
}
```

---

## 4.7 Funções Utilitárias Completas

```javascript
/**
 * ChatGuru Chat Area Helper
 * Funções para manipular a área de chat
 */
const ChatGuruChat = {
  // ===== INFO DO CHAT =====
  
  getChatId() {
    return window.location.hash.replace('#', '') || null;
  },
  
  getChatInfo() {
    return {
      chatId: this.getChatId(),
      name: document.querySelector('[class*="chat-name"], [class*="header"] [class*="name"]')?.textContent?.trim(),
      status: document.querySelector('[class*="status"] button')?.textContent?.trim()?.replace(/[▼▲]/g, '').trim()
    };
  },
  
  // ===== MENSAGENS VIA API =====
  
  async fetchMessages(page = 1) {
    const chatId = this.getChatId();
    if (!chatId) throw new Error('Nenhum chat selecionado');
    
    const response = await fetch(`/messages2/${chatId}/page/${page}`, {
      credentials: 'include'
    });
    return response.json();
  },
  
  async getAllMessages() {
    const all = [];
    const firstPage = await this.fetchMessages(1);
    all.push(...firstPage.messages_and_notes);
    
    const totalPages = firstPage.count_msg_sent_paginated;
    for (let p = 2; p <= totalPages; p++) {
      const data = await this.fetchMessages(p);
      all.push(...data.messages_and_notes);
    }
    
    return all;
  },
  
  // ===== ANÁLISE DE MENSAGENS =====
  
  parseMessage(msg) {
    const m = msg.m || msg;
    return {
      id: m._id?.$oid,
      text: m.text || '',
      isOut: m.is_out,
      type: m.type,
      status: m.status,
      ack: m.ack,
      timestamp: new Date(m.timestamp?.$date || m.created?.$date),
      isTemplate: m.is_template,
      hasMedia: !!(m.file),
      mediaType: m.file?.mime,
      mediaUrl: m.file ? this.buildMediaUrl(m.file) : null,
      sender: m.is_out ? 'agent' : 'patient',
      senderId: m.wa_sender_id
    };
  },
  
  buildMediaUrl(file) {
    if (!file?.name) return null;
    if (file.path_relative?.startsWith('https://')) {
      return `${file.path_relative}/${file.name}`;
    }
    return `https://zapguruusers.s3.ca-central-1.amazonaws.com/${file.path_relative}/${file.name}`;
  },
  
  // ===== MÉTRICAS =====
  
  async calculateMetrics() {
    const messages = await this.getAllMessages();
    const parsed = messages.map(m => this.parseMessage(m));
    
    // Separar por remetente
    const agentMsgs = parsed.filter(m => m.sender === 'agent');
    const patientMsgs = parsed.filter(m => m.sender === 'patient');
    
    // Calcular tempos de resposta
    const responseTimes = [];
    for (let i = 1; i < parsed.length; i++) {
      const prev = parsed[i - 1];
      const curr = parsed[i];
      
      // Se paciente mandou e agente respondeu
      if (prev.sender === 'patient' && curr.sender === 'agent') {
        const diff = curr.timestamp - prev.timestamp;
        responseTimes.push(diff / 1000 / 60); // Em minutos
      }
    }
    
    return {
      totalMessages: parsed.length,
      agentMessages: agentMsgs.length,
      patientMessages: patientMsgs.length,
      templatesUsed: agentMsgs.filter(m => m.isTemplate).length,
      mediaMessages: parsed.filter(m => m.hasMedia).length,
      avgResponseTime: responseTimes.length > 0 
        ? (responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(1)
        : null,
      firstResponseTime: responseTimes[0]?.toFixed(1) || null
    };
  },
  
  // ===== INPUT =====
  
  typeMessage(text) {
    const input = document.querySelector('textarea, [contenteditable="true"]');
    if (!input) return false;
    
    if (input.tagName === 'TEXTAREA') {
      input.value = text;
    } else {
      input.textContent = text;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  },
  
  sendMessage(text) {
    this.typeMessage(text);
    const sendBtn = document.querySelector('button[title*="Enviar"], button:has(.fa-paper-plane, .fa-send)');
    if (sendBtn) sendBtn.click();
  },
  
  // ===== STATUS =====
  
  async changeStatus(newStatus) {
    const chatId = this.getChatId();
    if (!chatId) return false;
    
    const response = await fetch(`/chat/${chatId}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    return response.ok;
  },
  
  // ===== SCROLL =====
  
  scrollToBottom() {
    const container = document.querySelector('#chat_messages_app, .messages_in_out');
    if (container) container.scrollTop = container.scrollHeight;
  }
};

// Disponibilizar globalmente
window.ChatGuruChat = ChatGuruChat;
```

---

## 4.8 Referência Rápida

| Elemento | Seletor | Descrição |
|----------|---------|-----------|
| Container mensagens | `#chat_messages_app` | Área principal |
| Wrapper mensagens | `.msg-data` | Contém os balões |
| Balão genérico | `.msg-bubble` | Qualquer mensagem |
| Balão enviado | `.msg-out` | Mensagem do agente |
| Balão recebido | `.msg-in` | Mensagem do paciente |
| Texto da msg | `.msg-text` | Conteúdo textual |
| Horário | `.msg-time` | Timestamp |
| Status (checks) | `.msg-status` | Indicador de leitura |
| Input texto | `textarea` | Campo de digitação |
| Botão enviar | `button[title*="Enviar"]` | Enviar mensagem |
| Dropdown status | `.chat-status-dropdown` | Mudar status |

---

## 4.9 API Endpoints Relacionados

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/messages2/{chatId}/page/{n}` | GET | Mensagens paginadas |
| `/chat/{chatId}` | POST | Info do chat (HTML) |
| `/chat/{chatId}/status` | POST | Mudar status |
| `/api/v1` (action=message_send) | POST | Enviar mensagem |

---

*Documento atualizado em 02/02/2026*
