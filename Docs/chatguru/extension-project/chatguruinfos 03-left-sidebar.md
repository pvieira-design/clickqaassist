# 03 - Left Sidebar (Filtros e Lista de Chats)

> Painel esquerdo: filtros de busca, filtros avançados, lista de chats, manipulação DOM

---

## 3.1 Visão Geral da Estrutura

A coluna esquerda é dividida em duas áreas principais:

```
┌─────────────────────────────┐
│      ÁREA DE FILTROS        │  ← Colapsável via "Esconder Filtros"
│                             │
│  [Nome]                     │
│  [Aparelho ▼]               │
│  [Número WhatsApp]          │
│  [Tags ▼]        [Qualquer] │
│  [Usuário/Dept ▼][Qualquer] │
│  [Etapa Funil ▼]            │
│  [Status ▼]  [Ordenar ▼]    │
│  [✉️][📋][((●))][⭐][⏰][⏱️]  │  ← Ícones de filtro rápido
│                             │
│  [Esconder Filtros ▲]       │
├─────────────────────────────┤
│  Exibindo 257 resultados:   │
├─────────────────────────────┤
│      LISTA DE CHATS         │  ← Scroll infinito
│                             │
│  ┌─────────────────────────┐│
│  │ [Avatar] Nome           ││
│  │ Preview da mensagem...  ││
│  │ [EM ATENDI] 18:03 👤👤  ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ [Avatar] Nome           ││
│  │ ...                     ││
│  └─────────────────────────┘│
│         ...                 │
└─────────────────────────────┘
```

---

## 3.2 Área de Filtros

### 3.2.1 Campo Nome

```javascript
// Seletor
const nameInput = document.querySelector('#inChatsName');

// Propriedades
{
  id: 'inChatsName',
  type: 'text',
  placeholder: 'Nome:',
  className: 'list__form__item'
}

// Manipulação: buscar por nome
function searchByName(name) {
  const input = document.querySelector('#inChatsName');
  input.value = name;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  // O ChatGuru faz debounce de ~300ms antes de filtrar
}

// Limpar busca
function clearNameSearch() {
  const input = document.querySelector('#inChatsName');
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
```

### 3.2.2 Dropdown Aparelho

```javascript
// Seletor
const deviceSelect = document.querySelector('#selChatsDevice');

// Opções disponíveis
const DEVICE_OPTIONS = [
  { value: '', text: 'Aparelho:' },  // Placeholder (todos)
  { value: '66ec42044b5a871161feffa9', text: 'API Oficial | Gupshup | clickguru' }
];

// Manipulação: selecionar aparelho
function selectDevice(phoneId) {
  const select = document.querySelector('#selChatsDevice');
  select.value = phoneId;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}
```

### 3.2.3 Campo Número WhatsApp

```javascript
// Seletor
const phoneInput = document.querySelector('#inChatsWhatsappNum');

// Propriedades
{
  id: 'inChatsWhatsappNum',
  type: 'text',
  placeholder: 'Número Whatsapp:',
  className: 'list__form__item'
}

// Manipulação: buscar por número
function searchByPhone(phoneNumber) {
  const input = document.querySelector('#inChatsWhatsappNum');
  // Aceita formato com ou sem código do país
  // Ex: "21999999999" ou "5521999999999"
  input.value = phoneNumber;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
```

### 3.2.4 Multi-select Tags

O filtro de tags é um componente customizado (não é select nativo):

```javascript
// Estrutura HTML
/*
<div class="multiselect-wrapper">
  <div class="multiselect-trigger" data-v-xxx>
    <span>Tags:</span>
    <span class="arrow">▼</span>
  </div>
  <div class="multiselect-dropdown" style="display: none;">
    <input type="text" placeholder="Pesquisar">
    <ul class="multiselect-options">
      <li><input type="checkbox" id="tag_xxx"> <label>Tag Name</label></li>
      ...
    </ul>
  </div>
</div>
<select class="list__form__item">  <!-- Modo de combinação -->
  <option value="any">Qualquer</option>
  <option value="all">Todas</option>
  <option value="none">Não Tem</option>
</select>
*/

// Abrir dropdown de tags
function openTagsDropdown() {
  const trigger = document.querySelector('[data-v-09d3b960] .multiselect-trigger, [class*="tags"] [class*="trigger"]');
  if (trigger) trigger.click();
}

// Selecionar uma tag pelo nome
function selectTag(tagName) {
  // 1. Abrir dropdown
  openTagsDropdown();
  
  // 2. Encontrar checkbox da tag
  const checkboxes = document.querySelectorAll('.multiselect-options input[type="checkbox"]');
  checkboxes.forEach(cb => {
    const label = cb.nextElementSibling || cb.parentElement.querySelector('label');
    if (label && label.textContent.trim() === tagName) {
      if (!cb.checked) cb.click();
    }
  });
}

// Obter tags selecionadas
function getSelectedTags() {
  const selected = [];
  const checkboxes = document.querySelectorAll('.multiselect-options input[type="checkbox"]:checked');
  checkboxes.forEach(cb => {
    const label = cb.nextElementSibling || cb.parentElement.querySelector('label');
    if (label) selected.push(label.textContent.trim());
  });
  return selected;
}

// Modo de combinação de tags
const TAG_MODES = {
  'Qualquer': 'any',   // Chat tem QUALQUER uma das tags selecionadas
  'Todas': 'all',      // Chat tem TODAS as tags selecionadas
  'Não Tem': 'none'    // Chat NÃO tem nenhuma das tags selecionadas
};
```

### 3.2.5 Multi-select Usuário/Departamento

```javascript
// Similar ao Tags, mas com hierarquia:
// - Departamentos (grupos)
// - Usuários

// Estrutura das opções
/*
<div class="multiselect-dropdown">
  <input placeholder="Pesquisar">
  <ul>
    <li><input type="checkbox"> Sem usuário delegado</li>
    <li class="group-header">Departamentos</li>
    <li><input type="checkbox"> Atendimento Inicial</li>
    <li><input type="checkbox"> Consulta Médica</li>
    ...
    <li class="group-header">Usuários</li>
    <li><input type="checkbox"> Gabriel Prates</li>
    <li><input type="checkbox"> Juliana Aires</li>
    ...
  </ul>
</div>
*/

// Filtrar por departamento
function filterByDepartment(deptName) {
  // Abrir dropdown
  const trigger = document.querySelector('[class*="usuario"], [class*="departamento"]');
  if (trigger) trigger.click();
  
  // Selecionar departamento
  setTimeout(() => {
    const options = document.querySelectorAll('.multiselect-options li');
    options.forEach(li => {
      if (li.textContent.trim() === deptName) {
        const cb = li.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked) cb.click();
      }
    });
  }, 100);
}

// Departamentos disponíveis
const DEPARTMENTS = [
  'Sem usuário delegado',
  'Atendimento Inicial',
  'Atendimento Inicial - Clico',
  'Consulta Médica',
  'Consulta Médica - Chat',
  'Documentaçao - Chat',  // Note: typo no ChatGuru (falta cedilha)
  'Documentação - Análise',
  'Documentação - Geral',
  'Entrega',
  'Pós-venda',
  'Receita e Orçamento'
];
```

### 3.2.6 Multi-select Etapa do Funil

```javascript
// Estrutura hierárquica: Funil > Etapas

const FUNNELS = {
  'Atendimento inicial': [
    'Entrou em contato',
    'Interagiu',
    'Paciente faz tratamento?',
    'Contato com a cannabis?',
    'Explicação do processo',
    'Aquecimento pagamento',
    'Pagamento pendente',
    'Outbound - ATENDEU',
    'Outbound - Ñ ATENDEU'
  ],
  'Consulta Médica': [
    'Aguardando agendamento',
    'Aguardando anamnese',
    'Aguardando consulta'
  ],
  'Documentação': [
    'Produto em falta',
    'Rastreio enviado'
  ],
  'Entrega': [
    'Código enviado',
    'Produto saiu dos EUA',
    'Produto na Anvisa',
    'Produto entregue',
    'Produto com transportadora',
    'Número antigo'
  ],
  'Perdidos': [
    'Sem dinheiro',
    'Queria flor / plantar',
    'Curioso'
  ],
  'Pos venda': [
    '7d', '15d', '23d', '30d', '45d', '60d', 
    '70d', '75d', '90d', '100d', '120d', '180d'
  ],
  'Receita e orçamento': [
    'Receita Enviada',
    'Orçamento Enviado',
    'Pagamento Pendente'
  ]
};

// Filtrar por etapa do funil
function filterByFunnelStep(stepName) {
  // Mesmo padrão dos outros multi-selects
}
```

### 3.2.7 Dropdown Status

```javascript
// Seletor
const statusSelect = document.querySelector('#selChatsStatus');

// Opções
const STATUS_OPTIONS = [
  { value: '', text: 'Status:' },        // Todos
  { value: 'ABERTO', text: 'ABERTO' },
  { value: 'EM ATENDIMENTO', text: 'EM ATENDIMENTO' },
  { value: 'AGUARDANDO', text: 'AGUARDANDO' },
  { value: 'RESOLVIDO', text: 'RESOLVIDO' },
  { value: 'FECHADO', text: 'FECHADO' },
  { value: 'INDEFINIDO', text: 'INDEFINIDO' }
];

// Manipulação: filtrar por status
function filterByStatus(status) {
  const select = document.querySelector('#selChatsStatus');
  select.value = status;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

// Exemplo: mostrar apenas chats abertos
filterByStatus('ABERTO');
```

### 3.2.8 Dropdown Ordenação

```javascript
// Seletor
const orderSelect = document.querySelector('#selChatsOrder');

// Opções
const ORDER_OPTIONS = [
  { value: '', text: 'Ordenar Por' },
  { value: 'updated_desc', text: 'Data Atualização (↓ Mais Novo) - Padrão' },
  { value: 'updated_asc', text: 'Data Atualização (↑ Mais Antiga)' },
  { value: 'created_desc', text: 'Data Criação (↓ Mais Novo)' },
  { value: 'created_asc', text: 'Data Criação (↑ Mais Antigos)' },
  { value: 'unread_desc', text: 'Qtde Msgs Não Lidas (↓)' },
  { value: 'unread_asc', text: 'Qtde Msgs Não Lidas (↑)' },
  { value: 'lastmsg_desc', text: 'Data Última Msg (↓) - Mais Novas' },
  { value: 'lastmsg_asc', text: 'Data Última Msg (↑) - Mais Antigos' }
];

// Manipulação: ordenar por msgs não lidas
function orderByUnread() {
  const select = document.querySelector('#selChatsOrder');
  // Encontrar option por texto
  Array.from(select.options).forEach((opt, i) => {
    if (opt.text.includes('Msgs Não Lidas (↓)')) {
      select.selectedIndex = i;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}
```

---

## 3.3 Ícones de Filtro Rápido

Linha de ícones abaixo dos filtros para ações rápidas:

```
[✉️] [📋] [((●))] [⭐] [⏰] [⏱️]
 │    │     │      │    │    │
 │    │     │      │    │    └─ Tempo desde última msg
 │    │     │      │    └────── Tempo no status atual
 │    │     │      └─────────── Favoritos
 │    │     └────────────────── Broadcast/Difusão
 │    └──────────────────────── Lista/Grid view
 └───────────────────────────── Não lidos (envelope)
```

### Estrutura DOM

```html
<div class="quick-filters" data-v-09d3b960>
  <div class="filter-icon">
    <img src="/static/icons/envelope.svg">
    <input type="checkbox" class="filter-unread">
  </div>
  <div class="filter-icon">
    <img src="/static/icons/list.svg">
    <input type="checkbox" class="filter-list">
  </div>
  <!-- ... outros ícones ... -->
</div>
```

### Manipulação: Filtrar Não Lidos

```javascript
// O ícone de envelope (✉️) filtra chats não lidos
function toggleUnreadFilter() {
  // O checkbox está associado ao ícone de envelope
  // É o PRIMEIRO checkbox sem label na área de ícones
  const filterIcons = document.querySelectorAll('[class*="filter-icon"], [class*="quick-filter"]');
  
  // Método alternativo: procurar pela posição
  const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
  let unreadCheckbox = null;
  
  // O checkbox de não lidos geralmente está após índice 100+ (após as tags)
  for (let i = 100; i < allCheckboxes.length; i++) {
    const cb = allCheckboxes[i];
    // Verificar se está na área de ícones (não tem label de texto)
    const parent = cb.closest('[class*="filter"], [class*="icon"]');
    if (parent && !cb.labels?.length) {
      unreadCheckbox = cb;
      break;
    }
  }
  
  if (unreadCheckbox) {
    unreadCheckbox.click();
    return true;
  }
  return false;
}

// Verificar se filtro de não lidos está ativo
function isUnreadFilterActive() {
  // Verificar URL ou estado do checkbox
  const url = new URL(window.location.href);
  return url.searchParams.get('unread') === 'true';
}
```

---

## 3.4 Botão Esconder/Mostrar Filtros

```javascript
// Seletor
const toggleBtn = document.querySelector('button[class*="toggle-filter"], button:has(img[src*="arrow"])');

// Alternativa: buscar por texto
function getToggleFiltersButton() {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent.includes('Esconder Filtros') || 
        btn.textContent.includes('Mostrar Filtros')) {
      return btn;
    }
  }
  return null;
}

// Verificar estado
function areFiltersVisible() {
  const btn = getToggleFiltersButton();
  return btn?.textContent?.includes('Esconder');
}

// Toggle filtros
function toggleFilters() {
  const btn = getToggleFiltersButton();
  if (btn) btn.click();
}
```

---

## 3.5 Contador de Resultados

```javascript
// Texto: "Exibindo 257 resultados:"
function getResultsCount() {
  const text = document.body.innerText;
  const match = text.match(/Exibindo (\d+) resultado/);
  return match ? parseInt(match[1]) : null;
}

// Observar mudanças no contador
function observeResultsCount(callback) {
  const observer = new MutationObserver(() => {
    const count = getResultsCount();
    callback(count);
  });
  
  // Observar área da lista
  const listArea = document.querySelector('[class*="chat-list"], [class*="list-container"]');
  if (listArea) {
    observer.observe(listArea, { childList: true, subtree: true });
  }
  
  return observer;
}
```

---

## 3.6 Lista de Chats

### 3.6.1 Container da Lista

```javascript
// Seletores para o container
const CHAT_LIST_SELECTORS = [
  '.chat-list',
  '.conversation-list',
  '[class*="list-container"]',
  '[data-v-09d3b960].list-area'
];

function getChatListContainer() {
  for (const selector of CHAT_LIST_SELECTORS) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  // Fallback: encontrar pelo pai dos cards
  const firstCard = document.querySelector('.list__user-card');
  return firstCard?.parentElement;
}
```

### 3.6.2 Card do Chat (list__user-card)

Estrutura completa de um card:

```html
<div data-v-09d3b960 class="list__user-card list__user-card--toggleHover">
  <!-- Avatar -->
  <div data-v-09d3b960 class="user-image-wrapper">
    <img src="https://s21.chatguru.app/static/noimg.png" alt="user image">
  </div>
  
  <!-- Dados do usuário -->
  <div data-v-09d3b960 class="user-data">
    <!-- Nome -->
    <div data-v-09d3b960 class="user-name-wrapper">
      <span data-v-09d3b960 class="user-name">Nome do Paciente</span>
    </div>
    <!-- Preview da mensagem -->
    <div data-v-09d3b960 class="user-msg">
      <span title="Texto completo da mensagem">Texto truncado...</span>
    </div>
  </div>
  
  <!-- Status e metadados -->
  <div data-v-09d3b960 class="user-status-wrapper">
    <div class="status-badge">
      <span class="status-text">EM ATENDI</span>
      <span class="unread-count">2</span>  <!-- Se houver não lidos -->
    </div>
    <div class="timestamp-wrapper">
      <span class="timestamp">18:03</span>
      <!-- Ícones de delegação -->
      <img src="/static/icons/user.svg" title="Delegado para usuário">
      <img src="/static/icons/group.svg" title="Delegado para grupo">
    </div>
  </div>
</div>
```

### 3.6.3 Obter Todos os Chats Visíveis

```javascript
function getVisibleChats() {
  const cards = document.querySelectorAll('.list__user-card');
  return Array.from(cards).map(card => {
    const nameEl = card.querySelector('.user-name');
    const msgEl = card.querySelector('.user-msg span');
    const statusEl = card.querySelector('.status-text, [class*="status"]');
    const timeEl = card.querySelector('.timestamp, [class*="time"]');
    const unreadEl = card.querySelector('.unread-count, [class*="unread"]');
    
    return {
      element: card,
      name: nameEl?.textContent?.trim() || '',
      lastMessage: msgEl?.textContent?.trim() || msgEl?.title || '',
      status: statusEl?.textContent?.trim() || '',
      time: timeEl?.textContent?.trim() || '',
      unreadCount: parseInt(unreadEl?.textContent) || 0,
      isSelected: card.classList.contains('selected') || 
                  card.classList.contains('active')
    };
  });
}
```

### 3.6.4 Clicar em um Chat

```javascript
// Por índice
function selectChatByIndex(index) {
  const cards = document.querySelectorAll('.list__user-card');
  if (cards[index]) {
    cards[index].click();
    return true;
  }
  return false;
}

// Por nome
function selectChatByName(name) {
  const cards = document.querySelectorAll('.list__user-card');
  for (const card of cards) {
    const nameEl = card.querySelector('.user-name');
    if (nameEl?.textContent?.trim() === name) {
      card.click();
      return true;
    }
  }
  return false;
}

// Obter chat selecionado
function getSelectedChat() {
  const selected = document.querySelector('.list__user-card.selected, .list__user-card.active');
  if (!selected) return null;
  
  // Também disponível via URL hash
  const chatId = window.location.hash.replace('#', '');
  
  return {
    element: selected,
    chatId: chatId,
    name: selected.querySelector('.user-name')?.textContent?.trim()
  };
}
```

### 3.6.5 Scroll e Carregamento

```javascript
// O ChatGuru usa scroll infinito
// Novos chats são carregados ao scrollar para baixo

function scrollToLoadMore() {
  const container = getChatListContainer();
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// Observar quando novos chats são carregados
function observeNewChats(callback) {
  const container = getChatListContainer();
  if (!container) return null;
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.classList?.contains('list__user-card')) {
          callback(node);
        }
      });
    });
  });
  
  observer.observe(container, { childList: true });
  return observer;
}

// Aguardar carregamento de chats
function waitForChatsToLoad(timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = () => {
      const cards = document.querySelectorAll('.list__user-card');
      if (cards.length > 0) {
        resolve(cards.length);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(0);
        return;
      }
      
      setTimeout(check, 100);
    };
    
    check();
  });
}
```

---

## 3.7 Extrair Chat ID

O ID do chat pode ser obtido de várias formas:

```javascript
// 1. Via URL hash (quando um chat está selecionado)
function getChatIdFromUrl() {
  const hash = window.location.hash;
  return hash ? hash.replace('#', '') : null;
}

// 2. Via atributo do card (se disponível)
function getChatIdFromCard(card) {
  // Tentar atributo data
  const dataId = card.getAttribute('data-chat-id') || 
                 card.getAttribute('data-id');
  if (dataId) return dataId;
  
  // Tentar extrair de onclick ou href
  const onclick = card.getAttribute('onclick');
  if (onclick) {
    const match = onclick.match(/['"]([a-f0-9]{24})['"]/);
    if (match) return match[1];
  }
  
  return null;
}

// 3. Via API após clicar (observar URL)
function waitForChatId(timeout = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const check = () => {
      const chatId = getChatIdFromUrl();
      if (chatId) {
        resolve(chatId);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        resolve(null);
        return;
      }
      
      setTimeout(check, 100);
    };
    
    check();
  });
}
```

---

## 3.8 Funções Utilitárias Completas

```javascript
/**
 * ChatGuru Left Sidebar Helper
 * Funções para manipular filtros e lista de chats
 */
const ChatGuruSidebar = {
  // ===== FILTROS =====
  
  searchByName(name) {
    const input = document.querySelector('#inChatsName');
    if (input) {
      input.value = name;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  },
  
  searchByPhone(phone) {
    const input = document.querySelector('#inChatsWhatsappNum');
    if (input) {
      input.value = phone;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  },
  
  filterByStatus(status) {
    const select = document.querySelector('#selChatsStatus');
    if (select) {
      select.value = status;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  },
  
  orderBy(orderType) {
    const select = document.querySelector('#selChatsOrder');
    if (!select) return false;
    
    const options = Array.from(select.options);
    for (let i = 0; i < options.length; i++) {
      if (options[i].text.toLowerCase().includes(orderType.toLowerCase())) {
        select.selectedIndex = i;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  },
  
  clearAllFilters() {
    // Limpar inputs
    ['#inChatsName', '#inChatsWhatsappNum'].forEach(sel => {
      const input = document.querySelector(sel);
      if (input) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    
    // Reset selects
    ['#selChatsDevice', '#selChatsStatus', '#selChatsOrder'].forEach(sel => {
      const select = document.querySelector(sel);
      if (select) {
        select.selectedIndex = 0;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  },
  
  // ===== LISTA =====
  
  getChats() {
    return Array.from(document.querySelectorAll('.list__user-card')).map(card => ({
      element: card,
      name: card.querySelector('.user-name')?.textContent?.trim(),
      message: card.querySelector('.user-msg span')?.title || 
               card.querySelector('.user-msg span')?.textContent?.trim(),
      status: card.querySelector('[class*="status"]')?.textContent?.trim(),
      time: card.querySelector('[class*="time"]')?.textContent?.trim(),
      unread: parseInt(card.querySelector('[class*="unread"]')?.textContent) || 0
    }));
  },
  
  getChatsCount() {
    return document.querySelectorAll('.list__user-card').length;
  },
  
  getResultsCount() {
    const match = document.body.innerText.match(/Exibindo (\d+) resultado/);
    return match ? parseInt(match[1]) : null;
  },
  
  selectChat(indexOrName) {
    const cards = document.querySelectorAll('.list__user-card');
    
    if (typeof indexOrName === 'number') {
      if (cards[indexOrName]) {
        cards[indexOrName].click();
        return true;
      }
    } else {
      for (const card of cards) {
        if (card.querySelector('.user-name')?.textContent?.includes(indexOrName)) {
          card.click();
          return true;
        }
      }
    }
    return false;
  },
  
  getSelectedChatId() {
    return window.location.hash.replace('#', '') || null;
  },
  
  // ===== UTILIDADES =====
  
  async waitForChats(timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (this.getChatsCount() > 0) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  },
  
  scrollToBottom() {
    const container = document.querySelector('.list__user-card')?.parentElement;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }
};

// Disponibilizar globalmente
window.ChatGuruSidebar = ChatGuruSidebar;
```

---

## 3.9 Referência Rápida de Seletores

| Elemento | Seletor | Descrição |
|----------|---------|-----------|
| Input Nome | `#inChatsName` | Campo de busca por nome |
| Select Aparelho | `#selChatsDevice` | Dropdown de aparelho |
| Input Telefone | `#inChatsWhatsappNum` | Campo de busca por número |
| Select Status | `#selChatsStatus` | Dropdown de status |
| Select Ordem | `#selChatsOrder` | Dropdown de ordenação |
| Card de Chat | `.list__user-card` | Cada item da lista |
| Nome no Card | `.user-name` | Nome do paciente no card |
| Msg no Card | `.user-msg span` | Preview da mensagem |
| Status Badge | `[class*="status"]` | Badge de status |
| Contador | `/Exibindo (\d+) resultado/` | Regex no texto da página |

---

*Documento atualizado em 02/02/2026*
