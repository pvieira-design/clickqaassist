# 02 - UI Structure

> Arquitetura visual da interface, layout em 3 colunas, responsividade, cores

---

## 2.1 Layout Geral

A página `/chats` do ChatGuru utiliza um layout de **3 colunas principais** mais uma **barra de navegação lateral fixa**:

```
┌────┬─────────────────────────────────────────────────────────────────────────────┐
│    │                              HEADER SUPERIOR                                │
│    │  [Avatar] João M | Click Cannabis 2    [WhatsApp] [🔔2] [📨8] [📢31] [🔊] [⚙] [↩] │
│ N  ├──────────────────┬─────────────────────────────────┬────────────────────────┤
│ A  │                  │                                 │                        │
│ V  │   COLUNA 1       │      COLUNA 2                   │    COLUNA 3            │
│    │   FILTROS +      │      ÁREA DO CHAT               │    INFO DO LEAD        │
│ L  │   LISTA          │                                 │                        │
│ A  │                  │   ┌─────────────────────────┐   │   Nome: Simone...      │
│ T  │   [Filtros]      │   │ [Header do Chat]        │   │   Tel: +55 31 9112...  │
│ E  │   Nome:          │   │ Simone - Sandro...  ●   │   │                        │
│ R  │   Aparelho:      │   └─────────────────────────┘   │   Chatbot: [Sim]       │
│ A  │   Número:        │                                 │   Arquivar: [Não]      │
│ L  │   Tags:          │   ┌─────────────────────────┐   │                        │
│    │   Usuário/Dept:  │   │                         │   │   Responsável:         │
│ 50 │   Etapa Funil:   │   │   MENSAGENS             │   │   [Pós-venda ▼]        │
│ px │   Status:        │   │   (scroll vertical)     │   │                        │
│    │   Ordenar:       │   │                         │   │   Tags:                │
│    │                  │   │   [balões de msg]       │   │   [+Nova] [Tag1]       │
│    │   [Ícones]       │   │                         │   │                        │
│    │   ✉️ ((●)) ⭐ ⏰ ⏱️  │   └─────────────────────────┘   │   Campos Personal.:    │
│    ├──────────────────┤                                 │   negotiation_id: ...  │
│    │                  │   ┌─────────────────────────┐   │   user_id: ...         │
│    │   LISTA CHATS    │   │ [Input de mensagem]     │   │   ...                  │
│    │   (scroll)       │   │ 📎 😊 [___________] 🕐 ▶ 🎤│   │                        │
│    │                  │   └─────────────────────────┘   │                        │
│    │   [Card] [Card]  │                                 │                        │
└────┴──────────────────┴─────────────────────────────────┴────────────────────────┘
```

### Proporções das Colunas

| Área | Largura Aproximada | Descrição |
|------|-------------------|-----------|
| Nav Lateral | ~50px | Menu de navegação com ícones |
| Coluna 1 (Filtros/Lista) | ~320px | Filtros + lista de chats |
| Coluna 2 (Chat) | ~flex-grow | Área principal de conversa |
| Coluna 3 (Info Lead) | ~380px | Painel de informações |

### Estrutura HTML Simplificada

```html
<body>
  <div class="app-container">
    <!-- Nav Lateral -->
    <nav class="sidebar-nav">
      <ul class="nav-icons">...</ul>
    </nav>
    
    <!-- Área Principal -->
    <div class="main-content">
      <!-- Header Superior -->
      <header class="top-header">...</header>
      
      <!-- 3 Colunas -->
      <div class="chat-layout">
        <!-- Coluna 1: Filtros + Lista -->
        <div class="left-panel">
          <div class="filters-area">...</div>
          <div class="chat-list">...</div>
        </div>
        
        <!-- Coluna 2: Chat -->
        <div class="center-panel">
          <div class="chat-header">...</div>
          <div class="messages-area">...</div>
          <div class="input-area">...</div>
        </div>
        
        <!-- Coluna 3: Info Lead -->
        <div class="right-panel">...</div>
      </div>
    </div>
  </div>
</body>
```

---

## 2.2 Header Superior

O header ocupa toda a largura e contém informações da conta e ações globais.

### Estrutura Visual

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [Avatar] João M | Click Cannabis 2      [📱] 5521993686082-Conectado            │
│                                         [🔔2] [📨8] [📢31] [🔊] [☐] [↩]         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Elementos do Header

| Elemento | Descrição | Função |
|----------|-----------|--------|
| Avatar | Foto do usuário | Link para `/user/me` |
| Nome/Conta | "João M \| Click Cannabis 2" | Identificação |
| Ícone WhatsApp | Status da conexão | Verde = conectado |
| Status Telefone | "5521993686082 - Conectado" | Info do aparelho |
| 🔔 Badge | Notificações (número) | Alertas do sistema |
| 📨 Badge | Mensagens internas | Chat interno |
| 📢 Badge | "Novidades e atualizações" | Changelog |
| 🔊 Toggle | Alerta sonoro | Liga/desliga sons |
| ☐ Checkbox | Dark mode / Tema | Alternar tema |
| ↩ Logout | Sair da conta | `/logout` |

### Cores do Header

```css
.top-header {
  background-color: #f5f5f5;  /* Fundo cinza claro */
  border-bottom: 1px solid #e0e0e0;
  height: 60px;
}

.account-name {
  color: #333333;
  font-weight: 600;
}

.badge-notification {
  background-color: #e74c3c;  /* Vermelho */
  color: white;
  border-radius: 50%;
}

.status-connected {
  color: #27ae60;  /* Verde */
}
```

---

## 2.3 Navegação Lateral (Menu de Ícones)

Barra vertical fixa à esquerda com ícones de navegação.

### Ícones e Rotas

```
┌────┐
│ CG │  Logo ChatGuru → /dashboard
├────┤
│ 💬 │  Chats → /chats (página atual)
│ 📊 │  Funis → /funnels
│ ⚡ │  Respostas Rápidas → /quick_answers/list
│ 🤖 │  Chatbots → /chatbots
│ 📢 │  Campanhas → /campaigns
│ 📈 │  Relatórios → (submenu)
│ 📱 │  Aparelhos → /phones
│ 🏷️ │  Tags → /tags
│ 👥 │  Usuários → /users
│ 📎 │  Anexos → /attachments
│ ⚙️ │  Módulos → /modules
│ ❓ │  Ajuda → (submenu)
│ 💬 │  Suporte WhatsApp → externo
├────┤
│ ©  │  Footer: "© 2025 ChatGuru"
└────┘
```

### CSS do Menu Lateral

```css
.sidebar-nav {
  width: 50px;
  background-color: #1a1a2e;  /* Azul escuro/preto */
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  z-index: 1000;
}

.nav-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b8b9a;  /* Cinza */
  transition: background 0.2s;
}

.nav-icon:hover {
  background-color: #2d2d44;
}

.nav-icon.active {
  background-color: #25d366;  /* Verde WhatsApp */
  color: white;
}
```

### Detectando Página Atual via JavaScript

```javascript
// Verificar se estamos na página de chats
function isChatsPage() {
  return window.location.pathname === '/chats' || 
         window.location.pathname.startsWith('/chats');
}

// Obter chat selecionado via hash
function getSelectedChatId() {
  const hash = window.location.hash;
  return hash ? hash.replace('#', '') : null;
}

// Exemplo: #697fdae0c30edc5d32e99935
// URL completa: https://s21.chatguru.app/chats#697fdae0c30edc5d32e99935
```

---

## 2.4 Proporções e Responsividade

### Breakpoints

O ChatGuru é primariamente **desktop-first**. Comportamento em diferentes tamanhos:

| Largura | Comportamento |
|---------|---------------|
| > 1400px | Layout completo, 3 colunas visíveis |
| 1200-1400px | Coluna direita pode ser colapsada |
| 1000-1200px | Filtros podem ser escondidos |
| < 1000px | Não otimizado para mobile |

### CSS de Layout (aproximado)

```css
.chat-layout {
  display: flex;
  height: calc(100vh - 60px);  /* Menos header */
  margin-left: 50px;  /* Espaço para nav lateral */
}

.left-panel {
  width: 320px;
  min-width: 280px;
  max-width: 400px;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.center-panel {
  flex: 1;
  min-width: 400px;
  display: flex;
  flex-direction: column;
}

.right-panel {
  width: 380px;
  min-width: 300px;
  max-width: 450px;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
}
```

### Detectando Visibilidade das Colunas

```javascript
// Verificar se painel direito está visível
function isRightPanelVisible() {
  const panel = document.querySelector('.right-panel, [class*="lead-info"]');
  if (!panel) return false;
  const rect = panel.getBoundingClientRect();
  return rect.width > 0 && rect.right <= window.innerWidth;
}

// Verificar se filtros estão expandidos
function areFiltersExpanded() {
  const btn = document.querySelector('button[class*="filter"], button:contains("Esconder Filtros")');
  return btn?.textContent?.includes('Esconder');
}
```

---

## 2.5 Temas e Cores

### Paleta de Cores Principal

```css
:root {
  /* Cores primárias */
  --cg-green: #25d366;           /* Verde WhatsApp/ChatGuru */
  --cg-green-dark: #128c7e;      /* Verde escuro */
  --cg-green-light: #dcf8c6;     /* Verde claro (balão enviado) */
  
  /* Cores de status */
  --status-aberto: #e74c3c;      /* Vermelho */
  --status-em-atendimento: #3498db; /* Azul */
  --status-aguardando: #f39c12;  /* Amarelo/Laranja */
  --status-resolvido: #27ae60;   /* Verde */
  --status-fechado: #95a5a6;     /* Cinza */
  
  /* Backgrounds */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-chat: #e5ddd5;            /* Fundo da área de chat */
  --bg-sidebar: #1a1a2e;         /* Nav lateral */
  
  /* Textos */
  --text-primary: #333333;
  --text-secondary: #666666;
  --text-muted: #999999;
  
  /* Bordas */
  --border-color: #e0e0e0;
  --border-radius: 8px;
  
  /* Sombras */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}
```

### Cores dos Badges de Status

```javascript
const STATUS_COLORS = {
  'ABERTO': {
    bg: '#e74c3c',
    text: '#ffffff',
    label: 'ABERTO'
  },
  'EM ATENDIMENTO': {
    bg: '#3498db',
    text: '#ffffff',
    label: 'EM ATENDI'  // Truncado na UI
  },
  'AGUARDANDO': {
    bg: '#f39c12',
    text: '#ffffff',
    label: 'AGUARDANDO'
  },
  'RESOLVIDO': {
    bg: '#27ae60',
    text: '#ffffff',
    label: 'RESOLVIDO'
  },
  'FECHADO': {
    bg: '#95a5a6',
    text: '#ffffff',
    label: 'FECHADO'
  },
  'INDEFINIDO': {
    bg: '#7f8c8d',
    text: '#ffffff',
    label: 'INDEFINIDO'
  }
};
```

### Cores dos Balões de Mensagem

```css
/* Mensagem enviada (atendente) */
.message-outgoing {
  background-color: #dcf8c6;  /* Verde claro */
  border-radius: 8px 0 8px 8px;
  margin-left: auto;
  max-width: 65%;
}

/* Mensagem recebida (paciente) */
.message-incoming {
  background-color: #ffffff;
  border-radius: 0 8px 8px 8px;
  margin-right: auto;
  max-width: 65%;
}

/* Fundo da área de chat */
.messages-container {
  background-color: #e5ddd5;
  background-image: url('pattern.png');  /* Padrão sutil */
}
```

---

## 2.6 Screenshot Anotado

### Legenda das Áreas

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│  ┌──┐  ┌─────────────────────────────────────────────────────────────────────┐│
│  │A │  │ B                                                                   ││
│  │  │  └─────────────────────────────────────────────────────────────────────┘│
│  │  │  ┌───────────┬────────────────────────────────┬────────────────────────┐│
│  │  │  │     C     │              D                 │          E             ││
│  │  │  │           │                                │                        ││
│  │  │  │  Filtros  │    Área de mensagens           │   Info do Lead         ││
│  │  │  │           │                                │                        ││
│  │  │  ├───────────┤    [Balões de conversa]        │   Nome, telefone       ││
│  │  │  │     F     │                                │   Tags                 ││
│  │  │  │           │                                │   Campos custom        ││
│  │  │  │  Lista    │    ┌──────────────────────┐    │                        ││
│  │  │  │  Chats    │    │ G - Input            │    │                        ││
│  │  │  │           │    └──────────────────────┘    │                        ││
│  └──┘  └───────────┴────────────────────────────────┴────────────────────────┘│
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

A = Navegação lateral (50px)
B = Header superior (60px altura)
C = Área de filtros (colapsável)
D = Área do chat (flex-grow)
E = Painel de informações do lead (380px)
F = Lista de chats (scroll)
G = Input de mensagem
```

### Como Identificar Cada Área via JavaScript

```javascript
// Mapeamento de áreas para seletores (aproximado)
const UI_AREAS = {
  // A - Navegação lateral
  navSidebar: 'nav, [class*="sidebar"], aside:first-child',
  
  // B - Header superior  
  header: 'header, [class*="header"], [class*="navbar"]',
  
  // C - Área de filtros
  filters: '[class*="filter"], .filters-area',
  
  // D - Área do chat
  chatArea: '[class*="chat-area"], [class*="messages"], .center-panel',
  
  // E - Info do lead (painel direito)
  leadInfo: '[class*="lead"], [class*="contact-info"], .right-panel',
  
  // F - Lista de chats
  chatList: '[class*="chat-list"], [class*="conversation-list"]',
  
  // G - Input de mensagem
  messageInput: 'textarea, [contenteditable="true"], [class*="input-message"]'
};

// Função para encontrar área
function findUIArea(areaName) {
  const selector = UI_AREAS[areaName];
  return document.querySelector(selector);
}
```

---

## 2.7 Z-Index e Camadas

```css
/* Camadas de sobreposição */
:root {
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-fixed: 300;
  --z-modal-backdrop: 400;
  --z-modal: 500;
  --z-popover: 600;
  --z-tooltip: 700;
  --z-toast: 800;
}

/* Elementos fixos */
.sidebar-nav { z-index: var(--z-fixed); }
.top-header { z-index: var(--z-sticky); }
.dropdown-menu { z-index: var(--z-dropdown); }
.modal-overlay { z-index: var(--z-modal-backdrop); }
.modal-content { z-index: var(--z-modal); }
```

### Considerações para a Extensão

A extensão pode injetar elementos em diferentes camadas:

```javascript
// Injetar overlay de feedback (acima de tudo)
function injectFeedbackOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'cg-feedback-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 70px;
    right: 390px;
    z-index: 9999;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 16px;
    max-width: 300px;
  `;
  document.body.appendChild(overlay);
  return overlay;
}
```

---

*Documento atualizado em 02/02/2026*
