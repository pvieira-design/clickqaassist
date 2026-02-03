# ChatGuru Feedback Extension — Referência Técnica

> **⚠️ NOTA IMPORTANTE:** Este documento descreve uma extensão EXISTENTE usada como referência.
> É um projeto separado da nova extensão de report de feedbacks, mas serve como base de conhecimento útil.

**Versão documentada:** 2.1.0  
**Local original:** `~/Desktop/Extensão/`  
**Documentado em:** 2026-02-02  

---

## 1. Visão Geral

A extensão **ChatGuru Feedback - Click Cannabis** é uma Chrome Extension (Manifest V3) que permite:

1. **Registrar feedbacks** de qualidade em mensagens do atendente
2. **Transcrever áudios** do chat usando Whisper API (OpenAI)
3. **Analisar conversas com IA** (Claude) para sugerir feedbacks automaticamente
4. **Exportar chats** em formato Markdown

### Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CHROME EXTENSION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│   │ content.js   │◄──►│ background.js │◄──►│  APIs Externas       │  │
│   │              │    │               │    │  • OpenAI Whisper    │  │
│   │ • Injeção UI │    │ • Bypass CORS │    │  • Claude API        │  │
│   │ • DOM Scrape │    │ • Transcribe  │    │  • Supabase (API)    │  │
│   │ • Observers  │    │ • IA Analyze  │    │  • S3 (áudios)       │  │
│   └──────────────┘    └──────────────┘    └──────────────────────┘  │
│          │                   │                                       │
│          │                   │                                       │
│          ▼                   ▼                                       │
│   ┌──────────────┐    ┌──────────────┐                              │
│   │ styles.css   │    │documentacao.js│                              │
│   │              │    │               │                              │
│   │ • Modal      │    │ • Manual      │                              │
│   │ • Badges     │    │ • Guia IA     │                              │
│   │ • Toasts     │    │ • Contexto    │                              │
│   └──────────────┘    └──────────────┘                              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Arquivos

```
~/Desktop/Extensão/
├── manifest.json           # Configuração da extensão (Manifest V3)
├── content.js              # Script injetado na página do ChatGuru
├── background.js           # Service Worker (bypass CORS, APIs)
├── documentacao.js         # Base de conhecimento para análise IA
├── styles.css              # Estilos para modal, badges, botões
├── generate-icons.html     # Utilitário para gerar ícones
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 3. manifest.json — Configuração

```json
{
  "manifest_version": 3,
  "name": "ChatGuru Feedback - Click Cannabis",
  "version": "2.1.0",
  "description": "Extensão para registrar feedbacks de atendimento no ChatGuru",
  
  "permissions": [
    "activeTab",    // Acessa a aba ativa
    "storage"       // Armazenamento local (cache)
  ],
  
  "host_permissions": [
    "https://*.chatguru.app/*",      // ChatGuru (página principal)
    "https://*.chatguru.com.br/*",   // ChatGuru (domínio alternativo)
    "https://*.supabase.co/*",       // Backend API
    "https://api.openai.com/*",      // Whisper transcription
    "https://*.amazonaws.com/*",     // S3 (download de áudios)
    "https://api.anthropic.com/*"    // Claude API
  ],
  
  "background": {
    "service_worker": "background.js"
  },
  
  "content_scripts": [
    {
      "matches": ["https://*.chatguru.app/*", "https://*.chatguru.com.br/*"],
      "js": ["content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ]
}
```

### Pontos Importantes:
- **Manifest V3**: Usa `service_worker` em vez de `background.page`
- **host_permissions**: Separadas das permissions normais (necessário para fetch cross-origin)
- **run_at: document_idle**: Script roda após página carregar

---

## 4. content.js — Script Principal

### 4.1 Configuração e Constantes

```javascript
const API_URL = 'https://wqbezwfplltdsjlmahee.supabase.co/functions/v1/extension-api';
const FEEDBACKS_HISTORY_URL = 'https://wqbezwfplltdsjlmahee.supabase.co/functions/v1/get-recent-feedbacks';
const API_KEY = '123';
const DEBUG = true;
```

A API é um backend Supabase Edge Function que gerencia:
- Tipos de feedback disponíveis
- Lista de atendentes
- Feedbacks existentes por chat
- Histórico de transcrições

### 4.2 Estado Global

```javascript
let feedbackTypes = [];        // Tipos de feedback carregados da API
let agents = [];               // Lista de atendentes
let existingFeedbacks = [];    // Feedbacks já registrados para este chat
let chatHistoryId = null;      // ID do histórico do chat
let transcribedAudioIds = [];  // IDs de áudios já transcritos (economia de custo)
let modalAtual = null;         // Referência ao modal aberto
let mensagensProcessadas = new Map();  // Cache de mensagens já processadas
let transcricoesCache = new Map();     // Cache de transcrições
let inicializacaoCompleta = false;     // Flag de inicialização
let historicalFeedbacks = [];          // Feedbacks históricos para treinar IA
```

### 4.3 Funções de API

```javascript
// Chamada genérica para a API do Supabase
async function callAPI(action, params = {}) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    },
    body: JSON.stringify({ action, ...params })
  });
  return await response.json();
}

// Funções específicas
async function carregarFeedbackTypes()      // GET tipos de feedback
async function carregarAgents()             // GET lista de atendentes
async function carregarFeedbacksExistentes() // GET feedbacks do chat atual
async function carregarAudiosJaTranscritos() // GET áudios já transcritos
async function criarFeedback(...)           // POST criar novo feedback
```

### 4.4 Extração de Dados do DOM

```javascript
// Extrai o external_id (data-message-id) de uma mensagem
function extrairExternalId(elementoMensagem) {
  // 1. Verifica se o próprio elemento tem o atributo
  if (elementoMensagem.hasAttribute('data-message-id')) {
    return elementoMensagem.getAttribute('data-message-id');
  }
  
  // 2. Busca no ancestral mais próximo
  const ancestral = elementoMensagem.closest('[data-message-id]');
  if (ancestral) {
    return ancestral.getAttribute('data-message-id');
  }
  
  // 3. Busca em filhos diretos
  // ...
}

// Extrai o texto da mensagem
function extrairTextoMensagem(elementoMensagem) {
  // Verifica se é áudio → retorna '[Áudio]'
  // Verifica se é imagem → retorna '[Imagem]'
  // Extrai texto via seletores: .msg-contentT.ct, .msg-contentT, etc.
}

// Extrai nome do atendente
function extrairNomeAtendenteDaMensagem(elementoMensagem) {
  // Busca em: msg_options_{messageId} → .small → "Enviada por X"
}
```

### 4.5 Snapshot do Chat

A extensão captura um "snapshot" completo do chat para processar offline:

```javascript
function capturarSnapshotDoChat() {
  const snapshot = {
    chatUrl: window.location.href,
    timestamp: new Date().toISOString(),
    mensagens: [],
    audios: []
  };
  
  // Itera por todas as mensagens (.row_msg ou .novo-display-teste)
  todasMensagens.forEach((rowMsg, index) => {
    const externalId = extrairExternalId(mensagemElement);
    const hora = extrairHoraMensagem(mensagemElement);
    const isEnviada = mensagemElement.classList.contains('enviada');
    
    // Detecta tipo: text, audio, image
    // Se áudio, adiciona à lista de áudios para transcrever
    
    snapshot.mensagens.push({
      index,
      external_id: externalId,
      type: tipo,
      content: conteudo,
      timestamp: hora,
      is_sent: isEnviada,
      audio_url: audioUrl,
      transcription: null  // Preenchido depois
    });
  });
  
  return snapshot;
}
```

### 4.6 Carregamento de Todas as Mensagens (Paginação)

O ChatGuru carrega mensagens em páginas. A extensão clica automaticamente em "Carregar mais":

```javascript
async function carregarTodasMensagens() {
  const SELETOR_BOTAO_CARREGAR = '.alert.alert-info.text-center.pointer';
  let tentativas = 0;
  
  while (tentativas < MAX_TENTATIVAS) {
    const botaoCarregar = document.querySelector(SELETOR_BOTAO_CARREGAR);
    
    if (!botaoCarregar || !botaoCarregar.textContent.toLowerCase().includes('carregar mais')) {
      break;  // Todas carregadas
    }
    
    botaoCarregar.click();
    await aguardarCarregamentoMensagens(1500);
    tentativas++;
  }
  
  return tentativas;
}
```

### 4.7 Processamento de Mensagens

```javascript
function processarMensagens() {
  // Só processa após inicialização completa
  if (!inicializacaoCompleta) return;
  
  const mensagens = encontrarMensagensEnviadas();  // .novo-display-teste.enviada
  
  mensagens.forEach((mensagem, idx) => {
    const externalId = extrairExternalId(mensagem);
    
    // Verifica se já tem botões com esse external_id
    if (mensagensProcessadas.has(externalId)) return;
    
    // Verifica se já tem feedback existente
    const feedbacksExistentes = existingFeedbacks.filter(f => 
      f.external_id === externalId
    );
    
    // Cria container com botões (Erro/Atenção/Acerto) e badges
    const container = criarBotoesFeedback(externalId, mensagem);
    
    // Se já tem feedbacks, adiciona badges
    if (feedbacksExistentes.length > 0) {
      feedbacksExistentes.forEach(fb => adicionarBadge(container, fb));
    }
    
    // Insere no DOM
    msgContainer.appendChild(container);
    mensagensProcessadas.set(externalId, mensagem);
  });
}
```

### 4.8 Observer para Novas Mensagens

```javascript
function iniciarObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        // Verifica se adicionou mensagens
        if (node.classList.contains('novo-display-teste') || 
            node.classList.contains('msg-container')) {
          // Processa novas mensagens com debounce
          clearTimeout(window.clickFeedbackTimeout);
          window.clickFeedbackTimeout = setTimeout(processarMensagens, 500);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
```

### 4.9 Observer para Mudança de Chat

```javascript
function iniciarObserverURL() {
  let urlAtual = window.location.href;
  
  setInterval(async () => {
    if (window.location.href !== urlAtual) {
      urlAtual = window.location.href;
      
      // Limpa estado
      inicializacaoCompleta = false;
      existingFeedbacks = [];
      mensagensProcessadas.clear();
      
      // Remove botões existentes
      document.querySelectorAll('.click-feedback-buttons').forEach(el => el.remove());
      
      // Recarrega dados para o novo chat
      await carregarFeedbacksExistentes();
      await carregarAudiosJaTranscritos();
      
      inicializacaoCompleta = true;
      setTimeout(processarMensagens, 1000);
    }
  }, 1000);
}
```

### 4.10 Modal de Feedback

```javascript
function criarModal() {
  const overlay = document.createElement('div');
  overlay.className = 'click-modal-overlay';
  overlay.innerHTML = `
    <div class="click-modal">
      <div class="click-modal-header">...</div>
      <div class="click-modal-body">
        <!-- Info da mensagem -->
        <!-- Select de atendente -->
        <!-- Select de tipo de feedback -->
        <!-- Textarea de observações -->
      </div>
      <div class="click-modal-footer">
        <button class="click-btn-cancel">Cancelar</button>
        <button class="click-btn-submit">Enviar Feedback</button>
      </div>
    </div>
  `;
  // Event listeners para fechar, submit, etc.
  return overlay;
}
```

### 4.11 Envio de Feedback

O fluxo de envio é assíncrono e em background:

```javascript
async function enviarFeedback(externalId, elementoMensagem) {
  // 1. Captura dados ANTES de fechar o modal
  const chatUrl = window.location.href;
  const registeredBy = extrairNomeResponsavel();  // Nome do usuário logado
  
  // 2. Fecha modal imediatamente (UX)
  fecharModal();
  adicionarBadge(elementoMensagem, feedbackType);
  
  // 3. Processa em background
  processarFeedbackCompletoEmBackground({
    chatUrl, externalId, feedbackTypeId, agentId, notes, registeredBy
  });
}

async function processarFeedbackCompletoEmBackground(dados) {
  // PASSO 1: Carrega todas as mensagens
  await carregarTodasMensagens();
  
  // PASSO 2: Captura snapshot
  const snapshot = capturarSnapshotDoChat();
  
  // PASSO 3: Transcreve áudios (via background.js)
  for (const audioInfo of snapshot.audios) {
    if (!audioJaTranscrito(audioInfo.externalId)) {
      const transcricao = await transcreverAudioPorExternalId(audioInfo.externalId, audioInfo.url);
      // Atualiza snapshot com transcrição
    }
  }
  
  // PASSO 4: Envia para API
  await criarFeedback(externalId, feedbackTypeId, agentId, notes, chatHistory, audioTranscriptions);
}
```

### 4.12 Análise com IA (Claude)

```javascript
async function iniciarAnaliseIA() {
  // 1. Carrega todas as mensagens
  await carregarTodasMensagens();
  
  // 2. Captura snapshot
  const snapshot = capturarSnapshotDoChat();
  
  // 3. Transcreve áudios
  for (const audioInfo of snapshot.audios) {
    const transcricao = await transcreverAudioPorExternalId(...);
    // Atualiza snapshot
  }
  
  // 4. Busca feedbacks históricos (exemplos para IA)
  await carregarFeedbacksHistoricos();
  
  // 5. Envia para Claude via background.js
  const response = await chrome.runtime.sendMessage({
    action: 'analyzeWithClaude',
    chatHistory: snapshot.mensagens,
    feedbackTypes: feedbackTypes,
    historicalFeedbacks: historicalFeedbacks
  });
  
  // 6. Mostra modal de revisão com sugestões
  if (response.success && response.suggestions.length > 0) {
    abrirModalRevisaoIA(response.suggestions);
  }
}
```

---

## 5. background.js — Service Worker

O background script é responsável por:
1. **Bypass de CORS** — Faz requests que o content script não pode
2. **Transcrição de áudio** — Baixa áudio e envia para Whisper API
3. **Análise com Claude** — Envia chat para Claude API

### 5.1 Listener de Mensagens

```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'transcribeAudio') {
    handleTranscription(request.audioUrl)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;  // Resposta assíncrona
  }
  
  if (request.action === 'transcribeBlob') {
    handleBlobTranscription(request.audioData)
      .then(result => sendResponse(result));
    return true;
  }
  
  if (request.action === 'analyzeWithClaude') {
    analyzeWithClaude(request.chatHistory, request.feedbackTypes, request.historicalFeedbacks)
      .then(result => sendResponse(result));
    return true;
  }
});
```

### 5.2 Transcrição de Áudio

```javascript
async function handleTranscription(audioUrl) {
  // 1. Verifica cache
  if (transcriptionCache.has(audioUrl)) {
    return { success: true, transcription: transcriptionCache.get(audioUrl) };
  }
  
  // 2. Baixa o áudio (background NÃO tem limitação CORS)
  const audioResponse = await fetch(audioUrl);
  const audioBlob = await audioResponse.blob();
  
  // 3. Envia para Whisper API
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.ogg');
  formData.append('model', 'whisper-1');
  formData.append('language', 'pt');
  
  const whisperResponse = await fetch(WHISPER_API_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData
  });
  
  const data = await whisperResponse.json();
  
  // 4. Cacheia e retorna
  transcriptionCache.set(audioUrl, data.text);
  return { success: true, transcription: data.text };
}
```

### 5.3 Análise com Claude

```javascript
async function analyzeWithClaude(chatHistory, feedbackTypes, historicalFeedbacks) {
  // 1. Formata tipos de feedback
  const tiposFormatados = feedbackTypes.map(ft => 
    `- ID: "${ft.id}" | Título: "${ft.title}" | Tipo: ${ft.type} | Pontos: ${ft.points}`
  ).join('\n');
  
  // 2. Formata histórico do chat
  const chatFormatado = chatHistory.map((msg, idx) => {
    const remetente = msg.is_sent ? 'ATENDENTE' : 'CLIENTE';
    return `[${idx}] external_id="${msg.external_id}" | ${remetente}: ${msg.content}`;
  }).join('\n');
  
  // 3. Monta prompt com DOCUMENTAÇÃO DE TREINAMENTO
  const fullSystemPrompt = `${MANUAL_ATENDIMENTO}\n\n${GUIA_ANALISE_QUALIDADE}\n\n${systemPrompt}`;
  
  // 4. Chama Claude API
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'  // IMPORTANTE!
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: fullSystemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  
  // 5. Parseia resposta JSON
  const data = await response.json();
  const content = data.content[0].text;
  const suggestions = JSON.parse(content.match(/\[[\s\S]*\]/)[0]);
  
  return { success: true, suggestions };
}
```

### 5.4 Header Especial para Anthropic

```javascript
'anthropic-dangerous-direct-browser-access': 'true'
```

Este header é **NECESSÁRIO** quando chamando a Claude API diretamente do browser (sem backend intermediário). Ele bypassa a proteção padrão da Anthropic contra uso direto em browsers.

---

## 6. documentacao.js — Base de Conhecimento

Este arquivo contém duas constantes gigantes com o treinamento para a IA:

### 6.1 MANUAL_ATENDIMENTO

~1200 linhas com:
- Missão e valores da Click Cannabis
- Fluxo completo do atendimento
- Papel do Clico (IA) vs. Atendente Humano
- Scripts prontos para cada situação
- FAQ técnico
- Do's e Don'ts
- Glossário

### 6.2 GUIA_ANALISE_QUALIDADE

~500 linhas com:
- Categorias de feedback (ERRO, ACERTO, ATENÇÃO)
- Exemplos detalhados de cada tipo
- Como identificar cada situação
- Formato de resposta esperado

### Uso:

```javascript
// No background.js
importScripts('documentacao.js');

// No prompt para Claude
const fullSystemPrompt = `${MANUAL_ATENDIMENTO}\n\n${GUIA_ANALISE_QUALIDADE}`;
```

---

## 7. Comunicação Content ↔ Background

### Pattern usado:

**Content Script (sender):**
```javascript
const response = await chrome.runtime.sendMessage({
  action: 'transcribeAudio',
  audioUrl: presignedUrl
});

if (response.success) {
  // Usa response.transcription
}
```

**Background Script (receiver):**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'transcribeAudio') {
    handleTranscription(request.audioUrl)
      .then(result => sendResponse(result));
    return true;  // IMPORTANTE: indica resposta assíncrona
  }
});
```

### Ponto Crucial: `return true`

Quando a resposta é assíncrona, o listener **DEVE** retornar `true` para manter o canal de comunicação aberto até o `sendResponse()` ser chamado.

---

## 8. Pontos-Chave para Reutilização

### 8.1 URLs Pré-Assinadas (S3)

Os áudios do ChatGuru estão no S3 da AWS com URLs pré-assinadas. A extensão usa uma abordagem em duas etapas:

```javascript
// 1. Obter URL pré-assinada via API do ChatGuru
const downloadApiUrl = `https://${currentHost}/attachments/message/download/${externalId}`;

// 2. Background script faz o request com cookies
const response = await fetch(downloadApiUrl, {
  headers: { 'Cookie': cookies },
  redirect: 'follow'
});

// A URL final (após redirect) contém X-Amz-Signature
if (response.url.includes('X-Amz-Signature')) {
  return response.url;  // URL pré-assinada
}
```

### 8.2 Economia de Custo (Transcrição)

A extensão mantém lista de áudios já transcritos para não pagar novamente:

```javascript
let transcribedAudioIds = [];

async function carregarAudiosJaTranscritos() {
  const result = await callAPI('get_transcribed_audios', { chat_url: chatUrl });
  transcribedAudioIds = result.transcribed_ids || [];
}

function audioJaTranscrito(externalId) {
  return transcribedAudioIds.includes(externalId);
}
```

### 8.3 Identificação de Atendente

A extensão tenta identificar automaticamente o atendente:

```javascript
// 1. Abre o painel de info da mensagem
await abrirInfoMensagem(elementoMensagem);

// 2. Extrai o nome
const nomeAtendente = extrairNomeAtendenteDaMensagem(elementoMensagem);

// 3. Busca na lista de atendentes (fuzzy match)
const agenteEncontrado = encontrarAtendentePorNome(nomeAtendente);
```

### 8.4 Captura de URL no Início

A extensão captura a URL **imediatamente** antes de processar, para garantir que não mude se o usuário trocar de chat:

```javascript
async function enviarFeedback(externalId, elementoMensagem) {
  // Captura URL ANTES de qualquer processamento async
  const chatUrl = window.location.href;
  
  // ... processamento em background usa chatUrl capturado
  await criarFeedback(..., chatUrl);
}
```

### 8.5 Processamento em Background

O modal fecha imediatamente e o processamento acontece em background:

```javascript
// 1. Captura dados necessários
const chatUrl = window.location.href;
const feedbackType = feedbackTypes.find(...);

// 2. FECHA MODAL IMEDIATAMENTE
fecharModal();
adicionarBadge(elementoMensagem, feedbackType);  // Feedback visual
mostrarToast('📜 Processando em background...', 'info');

// 3. Processa async (não bloqueia)
processarFeedbackCompletoEmBackground({ chatUrl, ... });
```

---

## 9. API Backend (Supabase)

A extensão usa Supabase Edge Functions como backend. Actions disponíveis:

| Action | Descrição |
|--------|-----------|
| `get_feedback_types` | Lista tipos de feedback disponíveis |
| `get_agents` | Lista atendentes |
| `get_feedbacks` | Feedbacks existentes para um chat |
| `get_transcribed_audios` | Áudios já transcritos para um chat |
| `create_feedback` | Registra novo feedback |

### Payload de create_feedback:

```javascript
{
  chat_url: 'https://s21.chatguru.app/chats#...',
  agent_id: 'uuid-do-atendente',
  feedbacks: [{
    external_id: 'id-da-mensagem',
    feedback_type_id: 'uuid-do-tipo',
    notes: 'Observações...'
  }],
  chat_history: [/* array de mensagens */],
  audio_transcriptions: [/* transcrições */],
  registered_by: 'Nome do Analista'
}
```

---

## 10. Seletores DOM Importantes

```javascript
// Mensagens enviadas pelo atendente
'.novo-display-teste.enviada'
'.msg-container.bg-sent-msg'

// Container de mensagem
'.row_msg'
'.novo-display-teste'

// ID da mensagem
'[data-message-id]'

// Áudio
'audio'
'audio source'

// Botão carregar mais
'.alert.alert-info.text-center.pointer'

// Nome do atendente
`#msg_options_${messageId} .small`  // Contém "Enviada por X"

// Timestamp
'.msg-timestamp'

// Texto da mensagem
'.msg-contentT.ct'
'.msg-contentT'
'span.ct'
'.ct'
```

---

## 11. Resumo de Funcionalidades

| Funcionalidade | Como Funciona |
|----------------|---------------|
| **Botões de Feedback** | Injetados via content.js em cada mensagem enviada |
| **Badges** | Mostram feedbacks já registrados |
| **Modal** | Criado dinamicamente, pré-seleciona atendente |
| **Transcrição** | Via Whisper API, com cache e economia de custo |
| **Análise IA** | Claude API com documentação completa no prompt |
| **Export Markdown** | Captura snapshot + transcrições → arquivo .md |
| **Paginação** | Clica automaticamente em "Carregar mais" |
| **Detecção de Chat** | Observer de URL detecta mudança de chat |

---

## 12. Para o Novo Projeto

Esta extensão pode servir de base para:

1. **Arquitetura Content + Background** — Pattern comprovado para bypass CORS
2. **Snapshot do Chat** — Código de captura de mensagens
3. **Transcrição** — Fluxo Whisper API via background
4. **Observer Pattern** — Detecção de novas mensagens e mudança de URL
5. **Modal/UI Injection** — Padrão de criação de UI dinâmica
6. **Processamento Assíncrono** — Background processing sem travar UI

### Diferenças para o Novo Projeto:

- **APIs diferentes** — Conectará em outras APIs (não Supabase)
- **Propósito diferente** — Report de feedbacks (não registro)
- **IA diferente?** — Pode usar outro modelo ou abordagem
- **UI diferente** — Interface adaptada ao novo caso de uso

---

*Documento gerado em 02/02/2026 pelo Percival*
