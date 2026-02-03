# 05 - Lead Info Panel (Painel Direito)

> Painel direito: informações do lead, tags, campos personalizados, manipulação DOM

---

## 5.1 Visão Geral

O painel direito exibe informações detalhadas do lead/paciente selecionado:

```
┌────────────────────────────────────────┐
│ NOME:                                  │
│ ⭐ Simone - Sandro Chaves Miranda      │
│ +55 (31) 91122780                      │
├────────────────────────────────────────┤
│ 🤖 Chatbot:           [Sim] [Não]      │
│ 📁 Arquivar:          [Não]            │
├────────────────────────────────────────┤
│ Responsável:                           │
│ [Pós-venda ▼]     [Delegar p/ Fila]    │
├────────────────────────────────────────┤
│ Tags:                                  │
│ [+ Nova Tag] [Código de indicação...] │
│ [Parcelamento 6x]                      │
├────────────────────────────────────────┤
│ Campos Personalizados:                 │
│                                        │
│ negotiation_id:    [335141          ] │
│ user_id:           [338177          ] │
│ negotiation:       [https://click...] │
│ payment_consulting:[90646           ] │
│ link_scheduling:   [https://click...] │
│ date_consulting:   [26-12-2025      ] │
│ hour_consulting:   [10:00           ] │
│ link_consulting:   [https://meet...] │
│ link_prescription: [https://crm-...] │
│ anamnese_link:     [https://anamn...] │
│ doctor_name:       [Raphael Mariz  ] │
│ ...                                    │
└────────────────────────────────────────┘
```

---

## 5.2 Identificação do Lead

### 5.2.1 Nome do Paciente

```javascript
// O nome pode ter uma estrela (⭐) se for favorito
function getLeadName() {
  const nameEl = document.querySelector(
    '[class*="lead-name"], ' +
    '[class*="contact-name"], ' +
    '.right-panel [class*="name"]:first-of-type'
  );
  
  if (!nameEl) return null;
  
  let name = nameEl.textContent.trim();
  const isFavorite = name.startsWith('⭐') || 
                     nameEl.querySelector('[class*="star"], [class*="favorite"]');
  
  // Remover estrela do texto
  name = name.replace(/^⭐\s*/, '');
  
  return { name, isFavorite };
}

// Alternar favorito
function toggleFavorite() {
  const starBtn = document.querySelector(
    '[class*="favorite"], ' +
    'button:has([class*="star"]), ' +
    '.btn-favorite'
  );
  if (starBtn) starBtn.click();
}
```

### 5.2.2 Telefone

```javascript
function getLeadPhone() {
  // O telefone aparece logo abaixo do nome
  // Formato: +55 (31) 91122780
  const phoneEl = document.querySelector(
    '[class*="phone"], ' +
    '[class*="tel"], ' +
    '.right-panel a[href^="tel:"]'
  );
  
  if (!phoneEl) return null;
  
  let phone = phoneEl.textContent.trim();
  // Normalizar (remover formatação)
  const normalized = phone.replace(/\D/g, '');
  
  return {
    formatted: phone,
    normalized: normalized,
    countryCode: normalized.substring(0, 2),
    areaCode: normalized.substring(2, 4),
    number: normalized.substring(4)
  };
}
```

---

## 5.3 Configurações do Chat

### 5.3.1 Toggle Chatbot

```javascript
// Chatbot pode estar Ativo (Sim) ou Inativo (Não)
function getChatbotStatus() {
  const chatbotToggle = document.querySelector(
    '[class*="chatbot"] input[type="checkbox"], ' +
    '[class*="chatbot"] [class*="toggle"], ' +
    'button:has-text("Sim"), button:has-text("Não")'
  );
  
  if (!chatbotToggle) return null;
  
  // Verificar estado
  if (chatbotToggle.type === 'checkbox') {
    return chatbotToggle.checked;
  }
  
  // Se for botão toggle
  const activeBtn = document.querySelector('[class*="chatbot"] .active, [class*="chatbot"] .btn-success');
  return activeBtn?.textContent?.includes('Sim');
}

// Ativar/desativar chatbot
function toggleChatbot(enable) {
  const currentStatus = getChatbotStatus();
  if (currentStatus === enable) return; // Já está no estado desejado
  
  const toggleBtn = document.querySelector(
    '[class*="chatbot"] input[type="checkbox"], ' +
    '[class*="chatbot"] button:not(.active)'
  );
  
  if (toggleBtn) toggleBtn.click();
}
```

### 5.3.2 Arquivar Chat

```javascript
function getArchiveStatus() {
  const archiveToggle = document.querySelector(
    '[class*="archive"] input[type="checkbox"], ' +
    '[class*="arquivar"]'
  );
  
  if (!archiveToggle) return null;
  return archiveToggle.checked || archiveToggle.classList.contains('active');
}

function toggleArchive(archive) {
  const btn = document.querySelector(
    '[class*="archive"] button, ' +
    '[class*="arquivar"] button'
  );
  if (btn) btn.click();
}
```

---

## 5.4 Delegação

### 5.4.1 Responsável Atual

```javascript
// Seletor do dropdown de delegação
const DELEGATE_SELECTOR = '#delegateuserform';

function getCurrentResponsible() {
  const select = document.querySelector(DELEGATE_SELECTOR);
  if (!select) return null;
  
  const selected = select.options[select.selectedIndex];
  return {
    id: selected?.value,
    name: selected?.text,
    type: selected?.closest('optgroup')?.label // 'Departamentos' ou 'Usuários'
  };
}

// Opções disponíveis
function getDelegateOptions() {
  const select = document.querySelector(DELEGATE_SELECTOR);
  if (!select) return [];
  
  const options = [];
  const optgroups = select.querySelectorAll('optgroup');
  
  optgroups.forEach(group => {
    const groupLabel = group.label;
    group.querySelectorAll('option').forEach(opt => {
      options.push({
        value: opt.value,
        text: opt.text,
        group: groupLabel
      });
    });
  });
  
  return options;
}

// Departamentos disponíveis
const DEPARTMENTS = [
  { id: '66f58149561db40cd028a608', name: 'Atendimento Inicial' },
  { id: '686e7698b2a96c27483beff2', name: 'Atendimento Inicial - Clico' },
  { id: '66f581a8ef31a77bda792158', name: 'Consulta Médica' },
  { id: '69163ae0b8004547d8af8774', name: 'Consulta Médica - Chat' },
  { id: '6841b7de63a57d5dbe80671d', name: 'Documentaçao - Chat' },
  { id: '6841b7b188948b5a77983a98', name: 'Documentação - Análise' },
  { id: '66f5822b3cebcd6647067c90', name: 'Documentação - Geral' },
  { id: '66f5824422ee223bfd9be25b', name: 'Entrega' },
  { id: '66f58267a47be2a07797af24', name: 'Pós-venda' },
  { id: '66f581f75b8da8a95a8d8a46', name: 'Receita e Orçamento' }
];
```

### 5.4.2 Delegar Chat

```javascript
// Delegar para departamento específico
function delegateToDepartment(deptName) {
  const select = document.querySelector(DELEGATE_SELECTOR);
  if (!select) return false;
  
  const options = Array.from(select.options);
  for (const opt of options) {
    if (opt.text === deptName || opt.text.includes(deptName)) {
      select.value = opt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  return false;
}

// Delegar para usuário específico
function delegateToUser(userName) {
  const select = document.querySelector(DELEGATE_SELECTOR);
  if (!select) return false;
  
  const options = Array.from(select.options);
  for (const opt of options) {
    if (opt.text === userName || opt.text.includes(userName)) {
      select.value = opt.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  return false;
}

// Delegar para fila (remover delegação)
function delegateToQueue() {
  const btn = document.querySelector(
    'button:has-text("Delegar p/ Fila"), ' +
    'button:has-text("Delegar para Fila"), ' +
    '[class*="delegate-queue"]'
  );
  if (btn) {
    btn.click();
    return true;
  }
  return false;
}
```

---

## 5.5 Tags

### 5.5.1 Obter Tags do Chat

```javascript
function getChatTags() {
  const tagElements = document.querySelectorAll(
    '[class*="tag-badge"], ' +
    '[class*="tag-chip"], ' +
    '.tags-area span, ' +
    '.tags-area .badge'
  );
  
  return Array.from(tagElements).map(el => ({
    element: el,
    name: el.textContent.trim().replace(/×$/, ''), // Remover X de delete
    hasRemove: !!el.querySelector('[class*="remove"], .close')
  }));
}

// Via API
async function fetchChatTags(chatId) {
  const response = await fetch(`/chat_tags/${chatId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  return response.text(); // Retorna HTML
}
```

### 5.5.2 Adicionar Tag

```javascript
// Abrir modal de nova tag
function openAddTagModal() {
  const btn = document.querySelector(
    'button:has-text("Nova Tag"), ' +
    'button:has-text("+ Nova Tag"), ' +
    '[class*="add-tag"]'
  );
  if (btn) btn.click();
}

// Adicionar tag pelo nome
async function addTag(tagName) {
  openAddTagModal();
  
  // Aguardar modal abrir
  await new Promise(r => setTimeout(r, 200));
  
  // Buscar tag no input
  const searchInput = document.querySelector(
    '.modal input[type="text"], ' +
    '[class*="tag-search"] input'
  );
  
  if (searchInput) {
    searchInput.value = tagName;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  
  // Aguardar resultados
  await new Promise(r => setTimeout(r, 300));
  
  // Clicar na tag
  const tagOption = document.querySelector(
    `.modal [class*="tag-option"]:has-text("${tagName}"), ` +
    `.modal li:has-text("${tagName}")`
  );
  
  if (tagOption) {
    tagOption.click();
    return true;
  }
  return false;
}
```

### 5.5.3 Remover Tag

```javascript
function removeTag(tagName) {
  const tags = getChatTags();
  const tag = tags.find(t => t.name === tagName || t.name.includes(tagName));
  
  if (tag && tag.hasRemove) {
    const removeBtn = tag.element.querySelector('[class*="remove"], .close, button');
    if (removeBtn) {
      removeBtn.click();
      return true;
    }
  }
  return false;
}
```

---

## 5.6 Campos Personalizados

### 5.6.1 Estrutura dos Campos

Os campos personalizados são inputs que fazem a ponte entre ChatGuru e o CRM Click Cannabis:

```javascript
const CUSTOM_FIELDS = {
  // Identificadores
  negotiation_id: {
    fieldId: '66ede1fc4e46ce3c33c0c22b',
    label: 'negotiation_id',
    description: 'ID do lead no CRM (leads.id)',
    type: 'text',
    editable: true
  },
  user_id: {
    fieldId: '66f1847b988cd3a4b4d4dedf',
    label: 'user_id',
    description: 'ID do paciente no CRM (users.id)',
    type: 'text',
    editable: true
  },
  
  // Links do CRM
  negotiation: {
    fieldId: '66f1886bb89f290bb89b274c',
    label: 'negotiation',
    description: 'Link do pipeline/negociação',
    type: 'url',
    editable: true
  },
  
  // Pagamento
  payment_consulting_id: {
    label: 'payment_consulting_id',
    description: 'ID do pagamento da consulta',
    type: 'text',
    editable: true
  },
  
  // Agendamento
  link_scheduling_consult: {
    label: 'link_scheduling_consult',
    description: 'Link para agendamento',
    type: 'url',
    editable: true
  },
  date_consulting: {
    label: 'date_consulting',
    description: 'Data da consulta (DD-MM-YYYY)',
    type: 'date',
    editable: true
  },
  hour_consulting: {
    label: 'hour_consulting',
    description: 'Horário da consulta (HH:MM)',
    type: 'time',
    editable: true
  },
  
  // Links da consulta
  link_consulting: {
    label: 'link_consulting',
    description: 'Link da videochamada',
    type: 'url',
    editable: true
  },
  link_prescription: {
    label: 'link_prescription',
    description: 'Link da receita médica',
    type: 'url',
    editable: false // Gerado automaticamente
  },
  anamnese_link: {
    label: 'anamnese_link',
    description: 'Link para anamnese do paciente',
    type: 'url',
    editable: true
  },
  
  // Dados médicos
  doctor_name: {
    label: 'doctor_name',
    description: 'Nome do médico responsável',
    type: 'text',
    editable: false // Preenchido pelo sistema
  },
  
  // Dados do paciente
  full_name: {
    label: 'full_name',
    description: 'Nome completo do paciente',
    type: 'text',
    editable: true
  },
  pacient_name: {
    label: 'pacient_name',
    description: 'Nome do paciente (pode diferir do chat)',
    type: 'text',
    editable: true
  },
  patologias: {
    label: 'patologias',
    description: 'Patologias do paciente',
    type: 'text',
    editable: true
  },
  
  // Entrega
  cod_rastreio: {
    label: 'cod_rastreio',
    description: 'Código de rastreio do pedido',
    type: 'text',
    editable: true
  },
  
  // Programa de indicação
  cod_indicacao: {
    label: 'cod_indicacao',
    description: 'Código de indicação do paciente',
    type: 'text',
    editable: false
  },
  
  // NPS
  review_link: {
    label: 'review_link',
    description: 'Link para avaliação',
    type: 'url',
    editable: false
  },
  nps_link: {
    label: 'nps_link',
    description: 'Link para pesquisa NPS',
    type: 'url',
    editable: false
  },
  
  // WhatsApp
  whatsapp_code: {
    label: 'whatsapp_code',
    description: 'Código de verificação WhatsApp',
    type: 'text',
    editable: false
  }
};
```

### 5.6.2 Obter Valores dos Campos

```javascript
function getCustomFields() {
  const fields = {};
  
  // Buscar todos os inputs na área de campos personalizados
  const customFieldsArea = document.querySelector(
    '[class*="custom-fields"], ' +
    '[class*="campos-personalizados"]'
  );
  
  if (!customFieldsArea) {
    // Fallback: buscar por labels conhecidos
    Object.keys(CUSTOM_FIELDS).forEach(fieldName => {
      const input = document.querySelector(
        `input[name*="${fieldName}"], ` +
        `input[placeholder*="${fieldName}"], ` +
        `label:has-text("${fieldName}") + input`
      );
      
      if (input) {
        fields[fieldName] = input.value;
      }
    });
    return fields;
  }
  
  // Se encontrou a área, buscar inputs dentro
  const inputs = customFieldsArea.querySelectorAll('input');
  inputs.forEach(input => {
    const label = input.previousElementSibling?.textContent?.trim()?.replace(':', '') ||
                  input.name ||
                  input.placeholder;
    
    if (label) {
      fields[label] = input.value;
    }
  });
  
  return fields;
}

// Via API
async function fetchCustomFields(chatId) {
  const response = await fetch(`/chat/custom_fields/${chatId}/view`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  
  const html = await response.text();
  
  // Parse HTML para extrair valores
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const fields = {};
  doc.querySelectorAll('input').forEach(input => {
    const name = input.name || input.id;
    if (name) {
      fields[name] = input.value;
    }
  });
  
  return fields;
}
```

### 5.6.3 Atualizar Campo Personalizado

```javascript
// Via DOM
function setCustomField(fieldName, value) {
  const input = document.querySelector(
    `input[name*="${fieldName}"], ` +
    `label:has-text("${fieldName}") + input`
  );
  
  if (input) {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// Via API
async function updateCustomFieldViaAPI(chatId, fieldName, value) {
  // Usar API REST v1
  const formData = new URLSearchParams({
    key: 'CKW0ZPD7R8KNC34DOK8CKPABRM9OU417IHKF7R5J1JRB1JG5LP6MT719YGKY69QB',
    account_id: '66eb2b7691396bcd24682bab',
    phone_id: '66ec42044b5a871161feffa9',
    chat_id: chatId,
    action: 'chat_update_custom_fields',
    custom_fields: JSON.stringify({ [fieldName]: value })
  });
  
  const response = await fetch('https://s21.chatguru.app/api/v1', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
}
```

---

## 5.7 Cruzamento com Banco de Dados

### 5.7.1 Mapear Chat para Lead

```javascript
/**
 * Busca dados do lead no banco Click Cannabis
 * usando o negotiation_id do ChatGuru
 */
async function fetchLeadFromDB(negotiationId) {
  // Esta função seria executada em servidor/n8n
  // Não é possível acessar o banco diretamente do browser
  
  const query = `
    SELECT 
      l.id,
      l.name,
      l.phone,
      l.email,
      l.status,
      u.id as user_id,
      u.name as user_name,
      c.id as consulting_id,
      c.status as consulting_status,
      c.scheduled_at
    FROM leads l
    LEFT JOIN users u ON l.user_id = u.id
    LEFT JOIN consultings c ON c.lead_id = l.id
    WHERE l.id = $1
    ORDER BY c.scheduled_at DESC
    LIMIT 1
  `;
  
  // Via webhook n8n
  const response = await fetch('https://clickcannabis.app.n8n.cloud/webhook/6WdaglLNkVEoq1yw', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      query, 
      params: [negotiationId] 
    })
  });
  
  return response.json();
}
```

---

## 5.8 Funções Utilitárias Completas

```javascript
/**
 * ChatGuru Lead Info Panel Helper
 * Funções para manipular o painel direito
 */
const ChatGuruLeadInfo = {
  // ===== IDENTIFICAÇÃO =====
  
  getName() {
    const nameEl = document.querySelector('[class*="lead"] [class*="name"], .right-panel h4');
    if (!nameEl) return null;
    
    let name = nameEl.textContent.trim();
    const isFavorite = name.startsWith('⭐');
    name = name.replace(/^⭐\s*/, '');
    
    return { name, isFavorite };
  },
  
  getPhone() {
    const phoneEl = document.querySelector('[class*="phone"], [href^="tel:"]');
    if (!phoneEl) return null;
    
    const text = phoneEl.textContent || phoneEl.href?.replace('tel:', '');
    return {
      formatted: text.trim(),
      normalized: text.replace(/\D/g, '')
    };
  },
  
  // ===== CONFIGURAÇÕES =====
  
  isChatbotEnabled() {
    const toggle = document.querySelector('[class*="chatbot"] .active, [class*="chatbot"] .btn-success');
    return toggle?.textContent?.includes('Sim') || false;
  },
  
  toggleChatbot() {
    const btn = document.querySelector('[class*="chatbot"] button:not(.active)');
    if (btn) btn.click();
  },
  
  // ===== DELEGAÇÃO =====
  
  getResponsible() {
    const select = document.querySelector('#delegateuserform');
    if (!select) return null;
    return select.options[select.selectedIndex]?.text;
  },
  
  delegateTo(nameOrId) {
    const select = document.querySelector('#delegateuserform');
    if (!select) return false;
    
    for (const opt of select.options) {
      if (opt.text === nameOrId || opt.value === nameOrId) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  },
  
  // ===== TAGS =====
  
  getTags() {
    const tags = [];
    document.querySelectorAll('[class*="tag-badge"], .tags-area .badge').forEach(el => {
      tags.push(el.textContent.trim().replace(/×$/, ''));
    });
    return tags;
  },
  
  hasTag(tagName) {
    return this.getTags().some(t => t.includes(tagName));
  },
  
  // ===== CAMPOS PERSONALIZADOS =====
  
  getCustomField(fieldName) {
    const input = document.querySelector(`input[name*="${fieldName}"]`);
    return input?.value || null;
  },
  
  setCustomField(fieldName, value) {
    const input = document.querySelector(`input[name*="${fieldName}"]`);
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  },
  
  getAllCustomFields() {
    const fields = {};
    const knownFields = [
      'negotiation_id', 'user_id', 'negotiation',
      'payment_consulting_id', 'link_scheduling_consult',
      'date_consulting', 'hour_consulting', 'link_consulting',
      'link_prescription', 'anamnese_link', 'doctor_name',
      'full_name', 'pacient_name', 'cod_rastreio',
      'cod_indicacao', 'patologias'
    ];
    
    knownFields.forEach(field => {
      const value = this.getCustomField(field);
      if (value) fields[field] = value;
    });
    
    return fields;
  },
  
  // ===== CRUZAMENTO CRM =====
  
  getNegotiationId() {
    return this.getCustomField('negotiation_id');
  },
  
  getUserId() {
    return this.getCustomField('user_id');
  },
  
  // ===== EXPORT =====
  
  exportLeadInfo() {
    return {
      ...this.getName(),
      phone: this.getPhone(),
      chatbotEnabled: this.isChatbotEnabled(),
      responsible: this.getResponsible(),
      tags: this.getTags(),
      customFields: this.getAllCustomFields(),
      chatId: window.location.hash.replace('#', '')
    };
  }
};

// Disponibilizar globalmente
window.ChatGuruLeadInfo = ChatGuruLeadInfo;
```

---

## 5.9 Referência Rápida

| Elemento | Seletor | Descrição |
|----------|---------|-----------|
| Nome do lead | `[class*="lead"] [class*="name"]` | Nome do paciente |
| Telefone | `[class*="phone"], [href^="tel:"]` | Número formatado |
| Toggle chatbot | `[class*="chatbot"] button` | Ativar/desativar bot |
| Dropdown delegação | `#delegateuserform` | Responsável |
| Tags | `.tags-area .badge` | Lista de tags |
| Campo custom | `input[name*="negotiation_id"]` | Campos personalizados |
| Botão nova tag | `button:has-text("Nova Tag")` | Adicionar tag |

---

## 5.10 Campos Personalizados - IDs de Referência

| Campo | ID ChatGuru | Mapeamento DB |
|-------|-------------|---------------|
| negotiation_id | 66ede1fc4e46ce3c33c0c22b | leads.id |
| user_id | 66f1847b988cd3a4b4d4dedf | users.id |
| negotiation | 66f1886bb89f290bb89b274c | (URL interna) |

---

*Documento atualizado em 02/02/2026*
