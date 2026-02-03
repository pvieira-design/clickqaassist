# 13 - Implementation Guide (O que faltou)

> Este documento complementa os anteriores com detalhes práticos de implementação que faltaram:
> estrutura de projeto, manifest.json, comunicação entre scripts, integração com LLM, CSS, e fluxos completos.

---

## 13.1 Estrutura de Pastas da Extensão

```
chatguru-feedback-extension/
├── manifest.json           # Configuração da extensão (Manifest V3)
├── background.js           # Service Worker (sempre rodando)
├── content.js              # Injeta na página do ChatGuru
├── popup/
│   ├── popup.html          # Interface de configurações
│   ├── popup.js            # Lógica do popup
│   └── popup.css           # Estilos do popup
├── styles/
│   └── overlay.css         # Estilos injetados na página
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── lib/
│   └── chatguru-api.js     # Helper de API (copiar do doc 06)
└── README.md
```

---

## 13.2 Manifest.json Completo (Manifest V3)

```json
{
  "manifest_version": 3,
  "name": "ChatGuru Feedback Analyzer",
  "version": "1.0.0",
  "description": "Analisa qualidade de atendimentos no ChatGuru usando IA",
  
  "permissions": [
    "storage",
    "activeTab"
  ],
  
  "host_permissions": [
    "https://s21.chatguru.app/*",
    "https://api.openai.com/*",
    "https://api.anthropic.com/*"
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "content_scripts": [
    {
      "matches": ["https://s21.chatguru.app/chats*"],
      "js": ["lib/chatguru-api.js", "content.js"],
      "css": ["styles/overlay.css"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## 13.3 Background Service Worker (background.js)

O Service Worker gerencia chamadas de API que precisam contornar CORS (ex: OpenAI).

```javascript
// background.js

// Listener para mensagens do content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeFeedback') {
    handleAnalysis(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Indica resposta assíncrona
  }
  
  if (request.action === 'getApiKey') {
    chrome.storage.sync.get(['openaiApiKey', 'llmProvider'], (result) => {
      sendResponse(result);
    });
    return true;
  }
});

// Chama LLM para análise
async function handleAnalysis(chatData) {
  const { openaiApiKey, llmProvider } = await chrome.storage.sync.get(['openaiApiKey', 'llmProvider']);
  
  if (!openaiApiKey) {
    throw new Error('API Key não configurada. Clique no ícone da extensão para configurar.');
  }
  
  const prompt = buildPrompt(chatData);
  
  // OpenAI
  if (llmProvider === 'openai' || !llmProvider) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // ou gpt-4o para melhor qualidade
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Erro na API OpenAI');
    }
    
    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }
  
  // Anthropic Claude
  if (llmProvider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': openaiApiKey, // Reusa o campo
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: `${getSystemPrompt()}\n\n${prompt}` }]
      })
    });
    
    const data = await response.json();
    return JSON.parse(data.content[0].text);
  }
}

function getSystemPrompt() {
  return `Você é um especialista em QA de atendimento ao cliente da Click Cannabis, a maior plataforma de telemedicina canábica do Brasil.

Sua tarefa é analisar transcrições de conversas entre AGENTE (atendente) e PACIENTE (lead/cliente).

Critérios de avaliação:
1. TEMPO DE RESPOSTA: Agente demorou mais de 10 minutos sem avisar?
2. CORDIALIDADE: Tom educado, empático, acolhedor?
3. CLAREZA: Explicações claras sobre processo, preços, prazos?
4. RESOLUÇÃO: Problema foi resolvido ou encaminhado corretamente?
5. ADERÊNCIA AO PROCESSO: Seguiu o funil correto? Usou templates quando apropriado?

Retorne APENAS um JSON válido no formato:
{
  "score": 8.5,
  "resumo": "Atendimento bom no geral, mas...",
  "pontos_positivos": ["Cordial", "Rápido"],
  "pontos_atencao": ["Não explicou o processo de importação"],
  "sugestao_acao": "Enviar mensagem explicando prazo de entrega",
  "tempo_resposta_medio_min": 3.5
}`;
}

function buildPrompt(chatData) {
  const { leadName, messages, customFields } = chatData;
  
  // Formatar histórico
  const history = messages.map(m => {
    const sender = m.isOut ? 'AGENTE' : 'PACIENTE';
    const time = new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let content = m.text || '';
    if (m.type === 'audio') content = `[ÁUDIO: ${m.transcription || 'não transcrito'}]`;
    if (m.type === 'image') content = '[IMAGEM]';
    if (m.type === 'document') content = '[DOCUMENTO]';
    return `[${time}] ${sender}: ${content}`;
  }).join('\n');
  
  return `CONTEXTO DO LEAD:
- Nome: ${leadName}
- Etapa no CRM: ${customFields?.negotiation || 'Não informado'}
- Médico: ${customFields?.doctor_name || 'Não atribuído'}

HISTÓRICO DA CONVERSA:
${history}

Analise este atendimento e retorne o JSON de avaliação.`;
}
```

---

## 13.4 Content Script (content.js)

Script que roda no contexto da página do ChatGuru.

```javascript
// content.js

(function() {
  'use strict';
  
  // Evitar re-injeção
  if (window.__cgFeedbackInjected) return;
  window.__cgFeedbackInjected = true;
  
  console.log('[CG Feedback] Extensão carregada');
  
  // === CONFIG ===
  const BUTTON_ID = 'cg-feedback-btn';
  const OVERLAY_ID = 'cg-feedback-overlay';
  
  // === INICIALIZAÇÃO ===
  let currentChatId = null;
  
  function init() {
    // Observar mudanças na URL (SPA)
    observeUrlChanges();
    
    // Injetar botão se já estiver em um chat
    const chatId = getChatIdFromUrl();
    if (chatId) {
      injectButton();
      currentChatId = chatId;
    }
  }
  
  // === DETECÇÃO DE NAVEGAÇÃO SPA ===
  function observeUrlChanges() {
    // Método 1: Observar hash
    window.addEventListener('hashchange', () => {
      const newChatId = getChatIdFromUrl();
      if (newChatId !== currentChatId) {
        currentChatId = newChatId;
        removeOverlay(); // Limpar feedback anterior
        if (newChatId) injectButton();
      }
    });
    
    // Método 2: Observar clicks na lista de chats
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.list__user-card');
      if (card) {
        setTimeout(() => {
          const newChatId = getChatIdFromUrl();
          if (newChatId !== currentChatId) {
            currentChatId = newChatId;
            removeOverlay();
            injectButton();
          }
        }, 100);
      }
    });
  }
  
  function getChatIdFromUrl() {
    return window.location.hash.replace('#', '') || null;
  }
  
  // === INJEÇÃO DO BOTÃO ===
  function injectButton() {
    // Evitar duplicação
    if (document.getElementById(BUTTON_ID)) return;
    
    // Aguardar header carregar
    waitForElement('.chat-header, [class*="chat-header"]').then(header => {
      if (!header) return;
      
      const btn = document.createElement('button');
      btn.id = BUTTON_ID;
      btn.innerHTML = '🧠 Analisar';
      btn.title = 'Analisar qualidade do atendimento com IA';
      btn.className = 'btn btn-sm btn-outline-primary ms-2';
      btn.style.cssText = 'margin-left: 10px; font-size: 12px;';
      
      btn.addEventListener('click', handleAnalyzeClick);
      
      // Inserir no header (após o dropdown de status)
      const statusDropdown = header.querySelector('[class*="status"], .dropdown');
      if (statusDropdown) {
        statusDropdown.after(btn);
      } else {
        header.appendChild(btn);
      }
    });
  }
  
  // === HANDLER DO BOTÃO ===
  async function handleAnalyzeClick() {
    const btn = document.getElementById(BUTTON_ID);
    btn.disabled = true;
    btn.innerHTML = '⏳ Analisando...';
    
    try {
      // 1. Coletar dados
      const chatId = getChatIdFromUrl();
      if (!chatId) throw new Error('Nenhum chat selecionado');
      
      const chatData = await collectChatData(chatId);
      
      // 2. Enviar para background (que chama o LLM)
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeFeedback',
        data: chatData
      });
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      // 3. Exibir resultado
      showFeedbackOverlay(response.data);
      
    } catch (error) {
      alert('Erro ao analisar: ' + error.message);
      console.error('[CG Feedback]', error);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🧠 Analisar';
    }
  }
  
  // === COLETA DE DADOS ===
  async function collectChatData(chatId) {
    // Usar helper do doc 06
    const messages = await CG_API.getFullHistory(chatId);
    
    // Parsear mensagens
    const parsed = messages.map(msg => ({
      text: msg.m?.text || '',
      isOut: msg.m?.is_out || false,
      type: msg.m?.type || 'chat',
      timestamp: msg.m?.timestamp?.$date || msg.date?.$date,
      transcription: msg.m?.transcription // Se tiver
    })).filter(m => m.text || m.type !== 'chat'); // Remover vazias
    
    // Coletar info do lead
    const leadName = document.querySelector('[class*="lead-name"], .chat-name')?.textContent?.trim() || 'Lead';
    
    // Custom fields (simplificado)
    const customFields = {};
    document.querySelectorAll('input[name]').forEach(input => {
      if (input.name && input.value) {
        customFields[input.name] = input.value;
      }
    });
    
    return {
      chatId,
      leadName,
      messages: parsed.slice(-100), // Últimas 100 msgs
      customFields
    };
  }
  
  // === OVERLAY DE FEEDBACK ===
  function showFeedbackOverlay(feedback) {
    removeOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <div class="cg-feedback-header">
        <span>📊 Análise de Atendimento</span>
        <button class="cg-feedback-close">×</button>
      </div>
      <div class="cg-feedback-body">
        <div class="cg-score cg-score-${getScoreClass(feedback.score)}">
          <span class="score-value">${feedback.score.toFixed(1)}</span>
          <span class="score-label">/10</span>
        </div>
        <p class="cg-summary">${feedback.resumo}</p>
        
        <div class="cg-section">
          <strong>✅ Pontos Positivos</strong>
          <ul>${(feedback.pontos_positivos || []).map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
        
        <div class="cg-section">
          <strong>⚠️ Pontos de Atenção</strong>
          <ul>${(feedback.pontos_atencao || []).map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
        
        <div class="cg-section">
          <strong>💡 Sugestão</strong>
          <p>${feedback.sugestao_acao || 'Nenhuma sugestão específica.'}</p>
        </div>
      </div>
      <div class="cg-feedback-footer">
        <button class="cg-btn-copy">📋 Copiar</button>
        <button class="cg-btn-note">📝 Salvar como Nota</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Event listeners
    overlay.querySelector('.cg-feedback-close').onclick = removeOverlay;
    overlay.querySelector('.cg-btn-copy').onclick = () => copyFeedback(feedback);
    overlay.querySelector('.cg-btn-note').onclick = () => saveAsNote(feedback);
    
    // Tornar draggable
    makeDraggable(overlay);
  }
  
  function removeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
  }
  
  function getScoreClass(score) {
    if (score >= 8) return 'good';
    if (score >= 5) return 'medium';
    return 'bad';
  }
  
  function copyFeedback(feedback) {
    const text = `📊 Feedback de Atendimento
Score: ${feedback.score}/10
${feedback.resumo}

✅ Positivos: ${feedback.pontos_positivos?.join(', ')}
⚠️ Atenção: ${feedback.pontos_atencao?.join(', ')}
💡 Sugestão: ${feedback.sugestao_acao}`;
    
    navigator.clipboard.writeText(text);
    alert('Feedback copiado!');
  }
  
  async function saveAsNote(feedback) {
    // Usar API do ChatGuru para adicionar nota interna
    const chatId = getChatIdFromUrl();
    const noteText = `📊 Análise IA (${new Date().toLocaleDateString()})
Score: ${feedback.score}/10 - ${feedback.resumo}`;
    
    try {
      // Via API REST v1 (simplificado - ajustar conforme doc 06)
      // Ou usar fetch interno se a rota existir
      alert('Nota salva! (implementar API)');
    } catch (e) {
      alert('Erro ao salvar nota: ' + e.message);
    }
  }
  
  function makeDraggable(element) {
    const header = element.querySelector('.cg-feedback-header');
    let isDragging = false;
    let offsetX, offsetY;
    
    header.style.cursor = 'move';
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - element.offsetLeft;
      offsetY = e.clientY - element.offsetTop;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        element.style.left = (e.clientX - offsetX) + 'px';
        element.style.top = (e.clientY - offsetY) + 'px';
        element.style.right = 'auto';
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  // === UTILS ===
  function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector));
      }
      
      const observer = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          observer.disconnect();
          resolve(document.querySelector(selector));
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  }
  
  // === START ===
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
```

---

## 13.5 CSS do Overlay (styles/overlay.css)

```css
/* overlay.css - Estilos injetados na página do ChatGuru */

#cg-feedback-overlay {
  position: fixed;
  top: 80px;
  right: 400px;
  width: 320px;
  max-height: 80vh;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 99999;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  overflow: hidden;
}

.cg-feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
  color: white;
  font-weight: 600;
}

.cg-feedback-close {
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.cg-feedback-body {
  padding: 16px;
  max-height: 50vh;
  overflow-y: auto;
}

.cg-score {
  text-align: center;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.cg-score-good { background: #d4edda; color: #155724; }
.cg-score-medium { background: #fff3cd; color: #856404; }
.cg-score-bad { background: #f8d7da; color: #721c24; }

.cg-score .score-value {
  font-size: 48px;
  font-weight: 700;
}

.cg-score .score-label {
  font-size: 18px;
  opacity: 0.7;
}

.cg-summary {
  font-style: italic;
  color: #666;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.cg-section {
  margin-bottom: 12px;
}

.cg-section strong {
  display: block;
  margin-bottom: 4px;
  color: #333;
}

.cg-section ul {
  margin: 0;
  padding-left: 20px;
}

.cg-section li {
  margin-bottom: 4px;
  color: #555;
}

.cg-feedback-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-top: 1px solid #eee;
}

.cg-feedback-footer button {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.cg-feedback-footer button:hover {
  background: #e9ecef;
}

/* Botão injetado no header */
#cg-feedback-btn {
  background: #25d366 !important;
  border-color: #25d366 !important;
  color: white !important;
  font-weight: 500;
}

#cg-feedback-btn:hover {
  background: #128c7e !important;
  border-color: #128c7e !important;
}

#cg-feedback-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}
```

---

## 13.6 Popup de Configurações (popup/)

### popup.html
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <h1>🧠 CG Feedback</h1>
    
    <div class="form-group">
      <label>Provedor de IA</label>
      <select id="llmProvider">
        <option value="openai">OpenAI (GPT-4)</option>
        <option value="anthropic">Anthropic (Claude)</option>
      </select>
    </div>
    
    <div class="form-group">
      <label>API Key</label>
      <input type="password" id="apiKey" placeholder="sk-...">
      <small>Sua chave fica salva localmente, nunca é enviada para nossos servidores.</small>
    </div>
    
    <button id="saveBtn">💾 Salvar</button>
    <div id="status"></div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

### popup.js
```javascript
document.addEventListener('DOMContentLoaded', () => {
  // Carregar configurações salvas
  chrome.storage.sync.get(['openaiApiKey', 'llmProvider'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
    }
    if (result.llmProvider) {
      document.getElementById('llmProvider').value = result.llmProvider;
    }
  });
  
  // Salvar
  document.getElementById('saveBtn').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value.trim();
    const llmProvider = document.getElementById('llmProvider').value;
    
    if (!apiKey) {
      showStatus('⚠️ Insira uma API Key', 'error');
      return;
    }
    
    chrome.storage.sync.set({ openaiApiKey: apiKey, llmProvider }, () => {
      showStatus('✅ Salvo com sucesso!', 'success');
    });
  });
  
  function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = type;
    setTimeout(() => status.textContent = '', 3000);
  }
});
```

### popup.css
```css
body {
  width: 300px;
  padding: 16px;
  font-family: -apple-system, sans-serif;
}

h1 {
  font-size: 18px;
  margin: 0 0 16px 0;
}

.form-group {
  margin-bottom: 12px;
}

label {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
}

input, select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

small {
  display: block;
  color: #888;
  margin-top: 4px;
  font-size: 11px;
}

button {
  width: 100%;
  padding: 10px;
  background: #25d366;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}

button:hover {
  background: #128c7e;
}

#status {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
}

#status.success { color: #28a745; }
#status.error { color: #dc3545; }
```

---

## 13.7 Helper de API (lib/chatguru-api.js)

```javascript
// lib/chatguru-api.js
// Copiar aqui o CG_API do documento 06-api-endpoints.md

const CG_API = {
  async request(path, options = {}) {
    const defaultOpts = {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    };
    
    const finalOpts = { ...defaultOpts, ...options };
    if (finalOpts.body && typeof finalOpts.body === 'object') {
      finalOpts.body = JSON.stringify(finalOpts.body);
    }
    
    const res = await fetch(path, finalOpts);
    if (!res.ok) throw new Error(`CG API Error: ${res.status}`);
    
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
  },

  async getFullHistory(chatId) {
    const p1 = await this.request(`/messages2/${chatId}/page/1`);
    let msgs = [...p1.messages_and_notes];
    const totalPages = p1.count_msg_sent_paginated;

    for (let p = 2; p <= Math.min(totalPages, 5); p++) { // Limitar a 5 páginas
      const data = await this.request(`/messages2/${chatId}/page/${p}`);
      msgs.push(...data.messages_and_notes);
    }
    
    return msgs.sort((a, b) => {
      const ta = new Date(a.m?.timestamp?.$date || a.date?.$date).getTime();
      const tb = new Date(b.m?.timestamp?.$date || b.date?.$date).getTime();
      return ta - tb;
    });
  }
};
```

---

## 13.8 Fluxo de Execução (Diagrama)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FLUXO: USUÁRIO CLICA EM "ANALISAR"                    │
└──────────────────────────────────────────────────────────────────────────────┘

1. [Click no Botão]
      │
      ▼
2. content.js::handleAnalyzeClick()
      │
      ├─► Desabilita botão + mostra "⏳ Analisando..."
      │
      ▼
3. content.js::collectChatData()
      │
      ├─► Chama CG_API.getFullHistory(chatId)
      │       │
      │       └─► fetch('/messages2/{id}/page/1..N') [COM cookies]
      │
      ├─► Extrai leadName do DOM
      ├─► Extrai customFields do DOM
      │
      ▼
4. chrome.runtime.sendMessage({ action: 'analyzeFeedback', data })
      │
      │   ════════════════════════════════════════════════
      │   ▼ BACKGROUND SERVICE WORKER (background.js) ▼
      │   ════════════════════════════════════════════════
      │
      ▼
5. background.js::handleAnalysis()
      │
      ├─► Carrega API Key do chrome.storage
      │
      ├─► buildPrompt(chatData) → Monta texto para LLM
      │
      ├─► fetch('https://api.openai.com/...') [COM API Key]
      │
      ▼
6. Resposta JSON do LLM
      │
      │   ════════════════════════════════════════════════
      │   ▲ VOLTA PARA CONTENT SCRIPT ▲
      │   ════════════════════════════════════════════════
      │
      ▼
7. content.js::showFeedbackOverlay(result)
      │
      ├─► Cria div#cg-feedback-overlay
      ├─► Renderiza score, pontos, sugestões
      ├─► Adiciona event listeners (fechar, copiar, salvar)
      │
      ▼
8. [Usuário vê o Feedback]
```

---

## 13.9 Checklist de Desenvolvimento

- [ ] Criar pasta do projeto
- [ ] Criar `manifest.json`
- [ ] Criar `icons/` (16, 48, 128px) - pode usar https://favicon.io
- [ ] Criar `background.js`
- [ ] Criar `content.js`
- [ ] Criar `lib/chatguru-api.js`
- [ ] Criar `styles/overlay.css`
- [ ] Criar `popup/popup.html`, `.js`, `.css`
- [ ] Testar localmente (`chrome://extensions` → Developer Mode → Load Unpacked)
- [ ] Testar com chat real no ChatGuru
- [ ] Ajustar prompt conforme resultados
- [ ] (Opcional) Empacotar para publicação na Chrome Web Store

---

## 13.10 Tratamento de Erros

```javascript
// Erros comuns e como tratar

const ERROR_MESSAGES = {
  'NO_API_KEY': 'Configure sua API Key clicando no ícone da extensão.',
  'RATE_LIMIT': 'Muitas requisições. Aguarde 1 minuto.',
  'INVALID_KEY': 'API Key inválida. Verifique nas configurações.',
  'NO_CHAT': 'Selecione um chat antes de analisar.',
  'FETCH_FAILED': 'Erro ao carregar mensagens. Recarregue a página.',
  'LLM_ERROR': 'Erro na análise. Tente novamente.'
};

function handleError(error) {
  console.error('[CG Feedback]', error);
  
  let userMessage = ERROR_MESSAGES.LLM_ERROR;
  
  if (error.message.includes('API Key')) userMessage = ERROR_MESSAGES.NO_API_KEY;
  if (error.message.includes('429')) userMessage = ERROR_MESSAGES.RATE_LIMIT;
  if (error.message.includes('401')) userMessage = ERROR_MESSAGES.INVALID_KEY;
  
  alert(userMessage);
}
```

---

*Documento criado em 02/02/2026 para complementar gaps identificados na documentação.*
