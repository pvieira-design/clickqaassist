(function () {
  'use strict';

  if (window.__clickQAInjected) return;
  window.__clickQAInjected = true;

  // ============================================
  // Constants
  // ============================================
  const BUTTON_ID = 'clickqa-import-btn';
  const TOAST_ID = 'clickqa-toast';
  const MAX_PAGES = 200;
  const MAX_MESSAGES = 50000;

  // ============================================
  // Import State
  // ============================================
  let currentChatId = null;
  let isImporting = false;

  // ============================================
  // Feedback State
  // ============================================
  let feedbackTypes = [];
  let existingFeedbacks = {};
  let chatImported = false;
  let processedMessages = new Set();
  let feedbackModal = null;
  let initComplete = false;
  let importPromise = null;

  // ============================================
  // Shared Utilities
  // ============================================

  async function getConfig() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getConfig' }, (result) => {
        resolve(result || {});
      });
    });
  }

  function showToast(message, type) {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `clickqa-toast clickqa-toast--${type} clickqa-toast--visible`;

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('clickqa-toast--visible');
    }, type === 'error' ? 5000 : 3000);
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector);
      if (existing) return resolve(existing);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
  }

  function getChatIdFromUrl() {
    const hash = window.location.hash.replace('#', '') || null;
    console.log('[ClickQA] getChatIdFromUrl:', hash, '| full URL:', window.location.href);
    return hash;
  }

  // ============================================
  // Import: URL Observation & Button Injection
  // ============================================

  function observeUrlChanges() {
    window.addEventListener('hashchange', () => {
      const newChatId = getChatIdFromUrl();
      if (newChatId !== currentChatId) {
        currentChatId = newChatId;
        removeButton();
        if (newChatId) injectButton();
      }
    });

    document.addEventListener('click', (e) => {
      const card = e.target.closest('.list__user-card');
      if (card) {
        setTimeout(() => {
          const newChatId = getChatIdFromUrl();
          if (newChatId !== currentChatId) {
            currentChatId = newChatId;
            removeButton();
            injectButton();
          }
        }, 200);
      }
    });
  }

  function removeButton() {
    document.getElementById(BUTTON_ID)?.remove();
  }

  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;

    waitForElement('.chat-header, [class*="chat-header"]').then(header => {
      if (!header || document.getElementById(BUTTON_ID)) return;

      const btn = document.createElement('button');
      btn.id = BUTTON_ID;
      btn.innerHTML = '<span class="clickqa-btn-icon">&#x2B06;</span> Importar QA';
      btn.title = 'Importar este chat para o Click QA Assist';
      btn.className = 'clickqa-import-button';
      btn.addEventListener('click', handleImportClick);

      const actionsArea = header.querySelector('.chat-header__actions, [class*="actions"]');
      if (actionsArea) {
        actionsArea.prepend(btn);
      } else {
        header.appendChild(btn);
      }
    });
  }

  // ============================================
  // Import: Handler
  // ============================================

  async function handleImportClick() {
    if (isImporting) return;

    if (importPromise) {
      showToast('Importação já em andamento...', 'info');
      return;
    }

    // Capture chatId and chatUrl NOW, at click time
    const chatId = getChatIdFromUrl();
    const chatUrl = window.location.href;
    if (!chatId) {
      showToast('Nenhum chat selecionado', 'error');
      return;
    }

    const config = await getConfig();
    if (!config.webAppUrl || !config.apiKey || !config.userEmail) {
      showToast('Configure a extensão primeiro (clique no ícone)', 'error');
      return;
    }

    isImporting = true;
    const btn = document.getElementById(BUTTON_ID);
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="clickqa-spinner"></span> Importando...';
    }

    try {
      showToast('Carregando mensagens...', 'info');

      const chatInfo = getChatInfo();
      const [allMessages, usersMap] = await Promise.all([
        fetchAllMessages(chatId),
        fetchChatGuruUsers(chatId),
      ]);

      if (allMessages.length === 0) {
        throw new Error('Nenhuma mensagem encontrada');
      }

      showToast(`${allMessages.length} mensagens. Transcrevendo áudios...`, 'info');

      let formatted = formatMessages(allMessages, chatId, chatUrl, chatInfo, usersMap);
      formatted = await transcribeAudioMessages(formatted);

      showToast('Enviando ao servidor...', 'info');

      const response = await chrome.runtime.sendMessage({
        action: 'importChat',
        data: {
          webAppUrl: config.webAppUrl,
          apiKey: config.apiKey,
          userEmail: config.userEmail,
          chatUrl,
          messages: formatted,
        },
      });

      if (response.success) {
        const data = response.data;
        const transcribed = formatted.filter(m => m.transcribed).length;
        const label = data.isExisting ? 'Reimportado' : 'Importado';
        showToast(`${label}! ${data.totalMessages} msgs, ${transcribed} áudios transcritos`, 'success');

        chatImported = true;
        refreshFeedbackData();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      showToast(`Erro: ${error.message}`, 'error');
      console.error('[ClickQA]', error);
    } finally {
      isImporting = false;
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span class="clickqa-btn-icon">&#x2B06;</span> Importar QA';
      }
    }
  }

  // ============================================
  // Import: Chat Info & Message Fetching
  // ============================================

  function getChatInfo() {
    const nameEl = document.querySelector('#chat_name, .chat-name, [class*="chat-header"] [class*="name"]');
    const statusEl = document.querySelector('.chat-status-dropdown button, [class*="status"] button');
    const phoneEl = document.querySelector('.lead-phone, a[href^="tel:"]');

    return {
      leadName: nameEl?.textContent?.trim() || 'Desconhecido',
      chatStatus: statusEl?.textContent?.trim()?.replace(/[▼▲\s]+$/, '') || 'INDEFINIDO',
      leadPhone: phoneEl?.textContent?.trim() || phoneEl?.getAttribute('href')?.replace('tel:', '') || '',
    };
  }

  function yieldToMainThread() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  function getMessageId(wrapper) {
    return wrapper.m?._id?.$oid || wrapper.m?._id || null;
  }

  async function fetchAllMessages(chatId) {
    console.log('[ClickQA] fetchAllMessages chatId:', chatId);
    const seenIds = new Set();
    const firstPage = await fetchMessagesPage(chatId, 1);
    const firstItems = firstPage.messages_and_notes || [];

    for (const item of firstItems) {
      const id = getMessageId(item);
      if (id) seenIds.add(id);
    }

    let allMsgs = [...firstItems];
    const firstPageSize = firstItems.length;
    console.log('[ClickQA] Page 1:', firstPageSize, 'items, total sent:', firstPage.count_msg_sent);

    if (firstPageSize > 0) {
      for (let page = 2; page <= MAX_PAGES; page++) {
        if (allMsgs.length >= MAX_MESSAGES) break;
        await yieldToMainThread();
        try {
          const data = await fetchMessagesPage(chatId, page);
          const pageMessages = data.messages_and_notes || [];
          if (pageMessages.length === 0) break;

          let newCount = 0;
          for (const item of pageMessages) {
            const id = getMessageId(item);
            if (id && !seenIds.has(id)) {
              seenIds.add(id);
              allMsgs.push(item);
              newCount++;
            }
          }

          console.log('[ClickQA] Page', page, ':', pageMessages.length, 'items,', newCount, 'new,', allMsgs.length, 'total');

          if (newCount === 0) {
            console.log('[ClickQA] Página', page, 'sem mensagens novas — fim da paginação');
            break;
          }

          if (page % 10 === 0) {
            showToast(`Carregando... ${allMsgs.length} msgs`, 'info');
          }

          if (pageMessages.length < firstPageSize) break;
        } catch (err) {
          console.warn(`[ClickQA] Falha na página ${page}:`, err);
          break;
        }
      }
    }

    console.log('[ClickQA] Total único:', allMsgs.length, 'mensagens');

    return allMsgs
      .filter(item => item.type === 'message' && item.m)
      .sort((a, b) => {
        const ta = getTimestamp(a);
        const tb = getTimestamp(b);
        return ta - tb;
      });
  }

  async function fetchMessagesPage(chatId, page) {
    const response = await fetch(`/messages2/${chatId}/page/${page}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao carregar página ${page}`);
    }

    return response.json();
  }

  function getTimestamp(msgWrapper) {
    const m = msgWrapper.m;
    if (m?.timestamp?.$date) {
      return typeof m.timestamp.$date === 'number'
        ? m.timestamp.$date
        : new Date(m.timestamp.$date).getTime();
    }
    if (msgWrapper.date?.$date) {
      return typeof msgWrapper.date.$date === 'number'
        ? msgWrapper.date.$date
        : new Date(msgWrapper.date.$date).getTime();
    }
    return Date.now();
  }

  // ============================================
  // Import: ChatGuru Users Map
  // ============================================

  /**
   * Fetches the ChatGuru users map for a given chat.
   * Calls POST /chat_delegate_input/{chatId} which returns HTML containing
   * <option value="U{oid}">{name}</option> elements.
   * Returns a Map of authorOid → agentName.
   */
  async function fetchChatGuruUsers(chatId) {
    const usersMap = new Map();
    try {
      const response = await fetch(`/chat_delegate_input/${chatId}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        console.warn(`[ClickQA] Failed to fetch users map: HTTP ${response.status}`);
        return usersMap;
      }
      const html = await response.text();
      // Parse <option value="U{oid}">{name}</option> or <option title="{name}" value="U{oid}">{name}</option>
      const optionRegex = /<option[^>]*value="U([a-f0-9]+)"[^>]*>([^<]+)<\/option>/gi;
      let match;
      while ((match = optionRegex.exec(html)) !== null) {
        const oid = match[1];
        const name = match[2].trim();
        if (oid && name) {
          usersMap.set(oid, name);
        }
      }
      console.log(`[ClickQA] Loaded ${usersMap.size} ChatGuru users`);
    } catch (err) {
      console.warn('[ClickQA] Error fetching ChatGuru users:', err);
    }
    return usersMap;
  }

  // ============================================
  // Import: Message Formatting
  // ============================================

  function extractAudioUrl(m) {
    const candidates = [
      m.body,
      m.media_url,
      m.mediaUrl,
      m.file_url,
      m.fileUrl,
      m.file,
      m.link,
      m.url,
      m.audio,
      m.audio_url,
      m.audioUrl,
      m.media,
    ];
    for (const val of candidates) {
      if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
        return val;
      }
    }
    return null;
  }

  function formatMessages(rawMessages, chatId, chatUrl, chatInfo, usersMap) {
    return rawMessages.map(wrapper => {
      const m = wrapper.m;
      const ts = getTimestamp(wrapper);
      const date = new Date(ts);

      let text = m.text || '';
      let audioUrl = null;

      if (m.type === 'audio' || m.type === 'ptt') {
        audioUrl = extractAudioUrl(m);
        if (!audioUrl) {
          console.log('[ClickQA] Audio message sem URL conhecida. Keys:', Object.keys(m).join(', '), '| raw:', JSON.stringify(m).substring(0, 500));
        }
        if (!text) text = '[Audio]';
      }
      if (m.type === 'image' && !text) text = '[Imagem]';
      if (m.type === 'video' && !text) text = '[Video]';
      if (m.type === 'document' && !text) text = '[Documento]';
      if (m.type === 'sticker' && !text) text = '[Sticker]';

      let templateName = null;
      if (m.is_template && m.template) {
        templateName = m.template.name || m.template.template_name || null;
      }

      return {
        chatId,
        chatUrl,
        chatStatus: chatInfo.chatStatus,
        leadName: chatInfo.leadName,
        leadPhone: chatInfo.leadPhone,
        messageId: m._id?.$oid || m._id || `gen_${ts}_${Math.random().toString(36).slice(2, 8)}`,
        direction: m.is_out ? 'agent' : 'patient',
        agentName: extractAgentName(m, usersMap),
        text,
        audioUrl,
        messageType: m.type || 'chat',
        timestamp: date.toISOString(),
        timestampBR: date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        status: m.status || 'sent',
        isTemplate: !!m.is_template,
        templateName,
        deleted: !!m.deleted,
        transcribed: false,
      };
    });
  }

  async function transcribeAudioMessages(formatted) {
    const audioMsgs = formatted.filter(msg => msg.audioUrl);
    if (audioMsgs.length === 0) return formatted;

    console.log(`[ClickQA] Transcrevendo ${audioMsgs.length} áudios...`);
    showToast(`Transcrevendo ${audioMsgs.length} áudio(s)...`, 'info');

    const BATCH_SIZE = 5;
    let done = 0;

    for (let i = 0; i < audioMsgs.length; i += BATCH_SIZE) {
      const batch = audioMsgs.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(msg =>
          chrome.runtime.sendMessage({
            action: 'transcribeAudio',
            data: { audioUrl: msg.audioUrl },
          })
        )
      );

      results.forEach((result, idx) => {
        const msg = batch[idx];
        if (result.status === 'fulfilled' && result.value?.success && result.value.data?.transcript) {
          msg.text = result.value.data.transcript;
          msg.transcribed = true;
        } else {
          const err = result.status === 'rejected' ? result.reason : result.value?.error;
          console.warn(`[ClickQA] Falha ao transcrever áudio ${msg.messageId}:`, err);
        }
      });

      done += batch.length;
      if (audioMsgs.length > BATCH_SIZE) {
        showToast(`Transcrevendo... ${done}/${audioMsgs.length}`, 'info');
      }
      await yieldToMainThread();
    }

    const transcribed = formatted.filter(m => m.transcribed).length;
    console.log(`[ClickQA] Transcrição completa: ${transcribed}/${audioMsgs.length} sucesso`);
    return formatted;
  }

  function extractAgentName(m, usersMap) {
    if (!m.is_out) return null;

    const authorOid = m.author?.$oid;
    if (authorOid && usersMap && usersMap.has(authorOid)) {
      return usersMap.get(authorOid);
    }

    return null;
  }

  // ============================================
  // Feedback: Helper Functions
  // ============================================

  function extractExternalId(element) {
    try {
      if (!element) return null;

      // 1. Check the element itself
      if (element.hasAttribute && element.hasAttribute('data-message-id')) {
        return element.getAttribute('data-message-id');
      }

      // 2. Check closest ancestor
      const ancestor = element.closest('[data-message-id]');
      if (ancestor) {
        return ancestor.getAttribute('data-message-id');
      }

      // 3. Check direct children (up to 2 levels deep)
      const childrenWithId = element.querySelectorAll(':scope > [data-message-id], :scope > * > [data-message-id]');
      if (childrenWithId.length === 1) {
        return childrenWithId[0].getAttribute('data-message-id');
      }

      // 4. If multiple, try to find the most relevant one
      if (childrenWithId.length > 1) {
        for (const child of childrenWithId) {
          const container = child.closest('.msg-container');
          if (container && (container.classList.contains('bg-sent-msg') || child.closest('.enviada'))) {
            return child.getAttribute('data-message-id');
          }
        }
        // Fallback to first
        return childrenWithId[0].getAttribute('data-message-id');
      }
    } catch (e) {
      console.error('[ClickQA] Error extracting external id:', e);
    }
    return null;
  }

  function extractMessageText(element) {
    try {
      if (!element) return '[Conteúdo não identificado]';

      // Check audio
      if (element.querySelector('audio')) {
        return '[Áudio]';
      }

      // Check image
      if (element.querySelector('img.img-fluid, img.chat-image')) {
        return '[Imagem]';
      }

      // Try specific text selectors
      const textEl = element.querySelector('.msg-contentT.ct, .msg-contentT, span.ct, .ct');
      if (textEl) {
        return textEl.textContent.trim().replace(/\s+/g, ' ');
      }

      // Fallback: clone message container and strip non-content
      const msgContainer = element.querySelector('.m-cont-in');
      if (msgContainer) {
        const clone = msgContainer.cloneNode(true);
        clone.querySelectorAll('.msg-timestamp, .msg-ack, .clearfix, button, .btn, .clickqa-feedback-buttons').forEach(el => el.remove());
        const text = clone.textContent.trim().replace(/\s+/g, ' ');
        if (text) return text;
      }

      return '[Conteúdo não identificado]';
    } catch (e) {
      return '[Conteúdo não identificado]';
    }
  }

  /**
   * Extracts agent name from ChatGuru DOM by opening the message info panel.
   * Panel lives at #msg_options_{messageId} and contains "Enviada por [Name]".
   */
  async function extractAgentNameFromDOM(messageElement) {
    try {
      const messageId = extractExternalId(messageElement);
      if (!messageId) return null;

      let optionsContainer = document.getElementById(`msg_options_${messageId}`);

      if (!optionsContainer || !optionsContainer.innerHTML.trim()) {
        const msgNode = messageElement.querySelector(`[data-message-id="${messageId}"]`) ||
          messageElement.closest(`[data-message-id]`);
        const infoIcon = (msgNode || messageElement).querySelector(
          `i[data-message-id="${messageId}"].msg-option-box, .msg-option-box, i.fa-caret-down`
        );

        if (infoIcon) {
          infoIcon.click();
          await new Promise(r => setTimeout(r, 800));
          optionsContainer = document.getElementById(`msg_options_${messageId}`);
        }
      }

      if (!optionsContainer) return null;

      const smallEl = optionsContainer.querySelector('.small');
      if (!smallEl) return null;

      const text = smallEl.textContent.trim();
      const match = text.match(/Enviada?\s+por\s+(.+)/i);
      return match ? match[1].trim() : null;
    } catch (e) {
      console.warn('[ClickQA] Failed to extract agent name from DOM:', e);
      return null;
    }
  }

  function categoryToCssClass(category) {
    const map = { NEGATIVE: 'erro', NEUTRAL: 'atencao', POSITIVE: 'acerto' };
    return map[category] || 'atencao';
  }

  function categoryToIcon(category) {
    const map = { NEGATIVE: '\u2715', NEUTRAL: '\u26A0', POSITIVE: '\u2713' };
    return map[category] || '\u2022';
  }

  function categoryToLabel(category) {
    const map = { NEGATIVE: 'Erro', NEUTRAL: 'Atenção', POSITIVE: 'Acerto' };
    return map[category] || 'Feedback';
  }

  function categoryToTitle(category) {
    const map = { NEGATIVE: 'Registrar Erro', NEUTRAL: 'Registrar Atenção', POSITIVE: 'Registrar Acerto' };
    return map[category] || 'Registrar Feedback';
  }

  // ============================================
  // Feedback: Initialization
  // ============================================

  async function initFeedbacks() {
    try {
      const config = await getConfig();
      if (!config.webAppUrl || !config.apiKey || !config.userEmail) {
        console.warn('[ClickQA] Config incomplete — feedback features disabled. Import button still works.');
        return;
      }

      // Fetch feedback types
      try {
        const typesResponse = await chrome.runtime.sendMessage({
          action: 'fetchFeedbackTypes',
          data: { webAppUrl: config.webAppUrl, apiKey: config.apiKey },
        });

        if (typesResponse.success && Array.isArray(typesResponse.data)) {
          feedbackTypes = typesResponse.data.filter(ft => ft.isActive);
          console.log(`[ClickQA] Loaded ${feedbackTypes.length} feedback types`);
        } else {
          console.warn('[ClickQA] Could not load feedback types:', typesResponse.error);
        }
      } catch (err) {
        console.warn('[ClickQA] Failed to fetch feedback types:', err);
      }

      // Fetch existing feedbacks for this chat
      await fetchChatFeedbacks(config);

      initComplete = true;
      console.log('[ClickQA] Feedback init complete. chatImported:', chatImported);

      // Process existing messages
      processMessages();

      // Start observers
      startFeedbackObserver();
      startFeedbackUrlObserver();
    } catch (err) {
      console.error('[ClickQA] Error initializing feedbacks:', err);
    }
  }

  async function fetchChatFeedbacks(config, chatUrl) {
    try {
      if (!config) config = await getConfig();
      const url = chatUrl || window.location.href;

      const feedbacksResponse = await chrome.runtime.sendMessage({
        action: 'fetchChatFeedbacks',
        data: {
          webAppUrl: config.webAppUrl,
          apiKey: config.apiKey,
          chatUrl: url,
        },
      });

      if (feedbacksResponse.success && feedbacksResponse.data) {
        chatImported = !!feedbacksResponse.data.imported;
        existingFeedbacks = feedbacksResponse.data.feedbacks || {};
        const count = Object.values(existingFeedbacks).reduce((sum, arr) => sum + arr.length, 0);
        console.log(`[ClickQA] Loaded ${count} existing feedbacks. Chat imported: ${chatImported}`);
      } else {
        existingFeedbacks = {};
        chatImported = false;
      }
    } catch (err) {
      console.warn('[ClickQA] Failed to fetch chat feedbacks:', err);
      existingFeedbacks = {};
      chatImported = false;
    }
  }

  async function refreshFeedbackData() {
    const config = await getConfig();
    if (!config.webAppUrl || !config.apiKey) return;
    await fetchChatFeedbacks(config);

    // Re-process to update badges
    processedMessages.clear();
    document.querySelectorAll('.clickqa-feedback-buttons').forEach(el => el.remove());
    processMessages();
  }

  // ============================================
  // Feedback: Auto-Import (background)
  // ============================================

  /**
   * Ensures the chat is imported before creating feedback.
   * If already imported, resolves immediately.
   * If import is in progress, returns the existing promise.
   * Otherwise, starts a new silent import.
   */
  async function ensureChatImported(chatId, chatUrl) {
    if (chatImported) return true;
    if (importPromise) return importPromise;

    importPromise = autoImportChat(chatId, chatUrl);
    try {
      return await importPromise;
    } finally {
      importPromise = null;
    }
  }

  async function autoImportChat(chatId, chatUrl) {
    if (!chatId || !chatUrl) return false;

    const config = await getConfig();
    if (!config.webAppUrl || !config.apiKey || !config.userEmail) return false;

    try {
      console.log('[ClickQA] Auto-importing chat:', chatId);
      const chatInfo = getChatInfo();
      const [allMessages, usersMap] = await Promise.all([
        fetchAllMessages(chatId),
        fetchChatGuruUsers(chatId),
      ]);

      if (allMessages.length === 0) {
        console.warn('[ClickQA] Auto-import: no messages found');
        return false;
      }

      let formatted = formatMessages(allMessages, chatId, chatUrl, chatInfo, usersMap);
      formatted = await transcribeAudioMessages(formatted);

      const response = await chrome.runtime.sendMessage({
        action: 'importChat',
        data: {
          webAppUrl: config.webAppUrl,
          apiKey: config.apiKey,
          userEmail: config.userEmail,
          chatUrl,
          messages: formatted,
        },
      });

      if (response.success) {
        chatImported = true;
        const transcribed = formatted.filter(m => m.transcribed).length;
        console.log(`[ClickQA] Auto-import complete: ${response.data.totalMessages} msgs, ${transcribed} áudios transcritos`);
        await fetchChatFeedbacks(config, chatUrl);

        const btn = document.getElementById(BUTTON_ID);
        if (btn && !isImporting) {
          btn.innerHTML = '<span class="clickqa-btn-icon">&#x2714;</span> Importado';
          setTimeout(() => {
            if (btn && !isImporting) {
              btn.innerHTML = '<span class="clickqa-btn-icon">&#x2B06;</span> Importar QA';
            }
          }, 3000);
        }

        return true;
      } else {
        console.error('[ClickQA] Auto-import failed:', response.error);
        return false;
      }
    } catch (err) {
      console.error('[ClickQA] Auto-import error:', err);
      return false;
    }
  }

  // ============================================
  // Feedback: Message Processing
  // ============================================

  function processMessages() {
    if (!initComplete) return;

    try {
      // Find all sent (agent) messages
      let messages = document.querySelectorAll('.novo-display-teste.enviada');
      if (messages.length === 0) {
        messages = document.querySelectorAll('.msg-out');
      }

      messages.forEach(msgElement => {
        const messageId = extractExternalId(msgElement);
        if (!messageId) return;

        // Skip if already processed
        if (processedMessages.has(messageId)) return;
        if (msgElement.querySelector('.clickqa-feedback-buttons')) return;

        // Create feedback UI container
        const container = document.createElement('div');
        container.className = 'clickqa-feedback-buttons';
        container.setAttribute('data-external-id', messageId);

        const messageFeedbacks = existingFeedbacks[messageId];
        const hasFeedbacks = Array.isArray(messageFeedbacks) && messageFeedbacks.length > 0;

        // Add badges if existing feedbacks
        if (hasFeedbacks) {
          container.classList.add('clickqa-has-feedback');
          const badgesContainer = document.createElement('div');
          badgesContainer.className = 'clickqa-badges-container';

          messageFeedbacks.forEach(fb => {
            const cssClass = categoryToCssClass(fb.category);
            const icon = categoryToIcon(fb.category);

            const badge = document.createElement('span');
            badge.className = `clickqa-feedback-badge clickqa-${cssClass}`;
            badge.textContent = `${icon} ${fb.feedbackTypeName}`;
            badge.title = `${fb.points > 0 ? '+' : ''}${fb.points} pts${fb.comment ? ' — ' + fb.comment : ''}`;
            badgesContainer.appendChild(badge);
          });

          container.appendChild(badgesContainer);
        }

        // Create action buttons
        const actionsWrapper = document.createElement('div');
        actionsWrapper.className = 'clickqa-feedback-actions';

        const buttons = [
          { category: 'NEGATIVE', cssClass: 'erro', label: 'Erro' },
          { category: 'NEUTRAL', cssClass: 'atencao', label: 'Atenção' },
          { category: 'POSITIVE', cssClass: 'acerto', label: 'Acerto' },
        ];

        buttons.forEach(({ category, cssClass, label }) => {
          const btn = document.createElement('button');
          btn.className = `clickqa-feedback-btn clickqa-${cssClass}`;
          btn.textContent = label;
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Capture at click time to avoid race conditions
            const clickChatId = getChatIdFromUrl();
            const clickChatUrl = window.location.href;
            const currentId = container.getAttribute('data-external-id') || messageId;
            openFeedbackModal(category, currentId, msgElement, clickChatId, clickChatUrl);

            if (!chatImported && !importPromise) {
              ensureChatImported(clickChatId, clickChatUrl);
            }
          });
          actionsWrapper.appendChild(btn);
        });

        container.appendChild(actionsWrapper);
        msgElement.appendChild(container);
        processedMessages.add(messageId);
      });
    } catch (err) {
      console.error('[ClickQA] Error processing messages:', err);
    }
  }

  // ============================================
  // Feedback: Modal
  // ============================================

  function openFeedbackModal(category, chatGuruMessageId, messageElement, chatId, chatUrl) {
    closeFeedbackModal();

    const cssClass = categoryToCssClass(category);
    const icon = categoryToIcon(category);
    const title = categoryToTitle(category);
    const preview = extractMessageText(messageElement);
    const truncatedPreview = preview.length > 200 ? preview.substring(0, 200) + '...' : preview;
    const filteredTypes = feedbackTypes.filter(ft => ft.category === category);

    let resolvedAgentName = null;
    const agentNamePromise = extractAgentNameFromDOM(messageElement).then(name => {
      resolvedAgentName = name;
      const agentEl = overlay.querySelector('#clickqa-agent-name');
      if (agentEl && name) {
        agentEl.textContent = name;
        agentEl.classList.remove('clickqa-agent-loading');
      } else if (agentEl) {
        agentEl.textContent = 'Não identificado';
        agentEl.classList.add('clickqa-agent-unknown');
      }
      return name;
    });

    const overlay = document.createElement('div');
    overlay.className = 'clickqa-modal-overlay';

    overlay.innerHTML = `
      <div class="clickqa-modal">
        <div class="clickqa-modal-header">
          <div class="clickqa-modal-title">
            <span class="clickqa-modal-title-icon clickqa-icon-${cssClass}">${icon}</span>
            <span>${title}</span>
          </div>
          <button class="clickqa-modal-close" type="button">\u2715</button>
        </div>
        <div class="clickqa-modal-body">
          <div class="clickqa-message-preview">
            <div class="clickqa-preview-row">
              <span class="clickqa-preview-label">Atendente:</span>
              <span class="clickqa-agent-loading" id="clickqa-agent-name">Identificando...</span>
            </div>
            <div class="clickqa-preview-row">
              <span class="clickqa-preview-label">Mensagem:</span>
              <span class="clickqa-preview-text">${escapeHtml(truncatedPreview)}</span>
            </div>
          </div>
          <div class="clickqa-form-group">
            <label class="clickqa-form-label">Tipo de Feedback *</label>
            <select class="clickqa-form-select" id="clickqa-feedback-type-select">
              <option value="">Selecione o tipo...</option>
              ${filteredTypes.map(ft => `<option value="${ft.id}">${escapeHtml(ft.name)} (${ft.points > 0 ? '+' : ''}${ft.points} pts)</option>`).join('')}
            </select>
          </div>
          <div class="clickqa-form-group">
            <label class="clickqa-form-label">Observações (opcional)</label>
            <textarea class="clickqa-form-textarea" id="clickqa-feedback-comment" placeholder="Descreva detalhes adicionais sobre o feedback..." rows="3"></textarea>
          </div>
        </div>
        <div class="clickqa-modal-footer">
          <button class="clickqa-btn clickqa-btn-cancel" type="button">Cancelar</button>
          <button class="clickqa-btn clickqa-btn-submit" type="button">Enviar Feedback</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    feedbackModal = overlay;

    const closeBtn = overlay.querySelector('.clickqa-modal-close');
    const cancelBtn = overlay.querySelector('.clickqa-btn-cancel');
    const submitBtn = overlay.querySelector('.clickqa-btn-submit');

    closeBtn.addEventListener('click', closeFeedbackModal);
    cancelBtn.addEventListener('click', closeFeedbackModal);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeFeedbackModal();
    });

    const escHandler = (e) => {
      if (e.key === 'Escape' && feedbackModal) {
        closeFeedbackModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    submitBtn.addEventListener('click', async () => {
      const typeSelect = overlay.querySelector('#clickqa-feedback-type-select');
      const commentEl = overlay.querySelector('#clickqa-feedback-comment');
      const feedbackTypeId = typeSelect.value;
      const comment = commentEl.value.trim();

      if (!feedbackTypeId) {
        showToast('Selecione o tipo de feedback', 'error');
        return;
      }

      submitBtn.disabled = true;

      if (!chatImported) {
        submitBtn.textContent = 'Importando chat...';
        const imported = await ensureChatImported(chatId, chatUrl);
        if (!imported) {
          showToast('Falha ao importar chat. Tente importar manualmente.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Enviar Feedback';
          return;
        }
      }

      submitBtn.textContent = 'Enviando...';
      await agentNamePromise;
      await submitFeedback(chatGuruMessageId, feedbackTypeId, comment, messageElement, resolvedAgentName, false, chatId, chatUrl);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar Feedback';
    });

    setTimeout(() => {
      const select = overlay.querySelector('#clickqa-feedback-type-select');
      if (select) select.focus();
    }, 100);
  }

  function closeFeedbackModal() {
    if (feedbackModal) {
      feedbackModal.remove();
      feedbackModal = null;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // Feedback: Submit
  // ============================================

  async function submitFeedback(chatGuruMessageId, feedbackTypeId, comment, messageElement, agentName, isRetry = false, chatId, chatUrl) {
    try {
      const config = await getConfig();
      if (!config.webAppUrl || !config.apiKey || !config.userEmail) {
        showToast('Configure a extensão primeiro', 'error');
        return;
      }

      const url = chatUrl || window.location.href;

      const response = await chrome.runtime.sendMessage({
        action: 'createFeedback',
        data: {
          config: { webAppUrl: config.webAppUrl, apiKey: config.apiKey },
          body: {
            userEmail: config.userEmail,
            chatUrl: url,
            chatGuruMessageId,
            feedbackTypeId,
            comment,
            agentName: agentName || null,
          },
        },
      });

      if (response.success && response.data) {
        closeFeedbackModal();
        showToast('Feedback registrado com sucesso!', 'success');

        const fb = response.data.feedback || response.data;

        if (!existingFeedbacks[chatGuruMessageId]) {
          existingFeedbacks[chatGuruMessageId] = [];
        }
        existingFeedbacks[chatGuruMessageId].push({
          id: fb.id,
          feedbackTypeId: feedbackTypeId,
          feedbackTypeName: fb.feedbackTypeName,
          category: fb.category,
          points: fb.points,
          comment: comment,
        });

        addBadgeToMessage(chatGuruMessageId, messageElement, {
          feedbackTypeName: fb.feedbackTypeName,
          category: fb.category,
          points: fb.points,
          comment: comment,
        });
      } else {
        const errMsg = response.error || 'Erro ao registrar feedback';
        const isMessageNotFound = errMsg.includes('não encontrada') || errMsg.includes('not found');

        if (isMessageNotFound && !isRetry) {
          showToast('Mensagem não encontrada. Reimportando chat...', 'info');
          chatImported = false;
          importPromise = null;
          const reimported = await ensureChatImported(chatId, chatUrl);
          if (reimported) {
            await submitFeedback(chatGuruMessageId, feedbackTypeId, comment, messageElement, agentName, true, chatId, chatUrl);
            return;
          }
        }

        showToast(`Erro: ${errMsg}`, 'error');
      }
    } catch (err) {
      console.error('[ClickQA] Error submitting feedback:', err);
      showToast(`Erro: ${err.message}`, 'error');
    }
  }

  // ============================================
  // Feedback: Badge Management
  // ============================================

  function addBadgeToMessage(messageId, messageElement, feedback) {
    const container = messageElement.querySelector('.clickqa-feedback-buttons');
    if (!container) return;

    container.classList.add('clickqa-has-feedback');

    let badgesContainer = container.querySelector('.clickqa-badges-container');
    if (!badgesContainer) {
      badgesContainer = document.createElement('div');
      badgesContainer.className = 'clickqa-badges-container';
      container.insertBefore(badgesContainer, container.firstChild);
    }

    const cssClass = categoryToCssClass(feedback.category);
    const icon = categoryToIcon(feedback.category);

    const badge = document.createElement('span');
    badge.className = `clickqa-feedback-badge clickqa-${cssClass}`;
    badge.textContent = `${icon} ${feedback.feedbackTypeName}`;
    badge.title = `${feedback.points > 0 ? '+' : ''}${feedback.points} pts${feedback.comment ? ' — ' + feedback.comment : ''}`;

    badgesContainer.appendChild(badge);
  }

  // ============================================
  // Feedback: MutationObserver
  // ============================================

  function startFeedbackObserver() {
    let debounceTimer = null;

    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              if (node.classList &&
                (node.classList.contains('novo-display-teste') ||
                  node.classList.contains('msg-container') ||
                  node.classList.contains('row_msg') ||
                  node.classList.contains('msg-out'))) {
                shouldProcess = true;
                break;
              }
              if (node.querySelector && node.querySelector('.novo-display-teste, .msg-container, .msg-out')) {
                shouldProcess = true;
                break;
              }
            }
          }
        }
        if (shouldProcess) break;
      }

      if (shouldProcess) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(processMessages, 500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ============================================
  // Feedback: URL Change Observer
  // ============================================

  function startFeedbackUrlObserver() {
    let lastUrl = window.location.href;

    const handleUrlChange = async () => {
      initComplete = false;
      processedMessages.clear();
      existingFeedbacks = {};
      chatImported = false;
      importPromise = null;

      document.querySelectorAll('.clickqa-feedback-buttons').forEach(el => el.remove());

      // Re-fetch data
      const config = await getConfig();
      if (config.webAppUrl && config.apiKey) {
        // Reuse cached feedback types (they don't change per chat)
        await fetchChatFeedbacks(config);
      }

      initComplete = true;
      processMessages();
    };

    // Interval check
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        handleUrlChange();
      }
    }, 1000);

    // Also listen to hashchange
    window.addEventListener('hashchange', () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        handleUrlChange();
      }
    });
  }

  // ============================================
  // Initialization
  // ============================================

  function init() {
    // Import functionality
    observeUrlChanges();
    const chatId = getChatIdFromUrl();
    if (chatId) {
      currentChatId = chatId;
      injectButton();
    }

    // Feedback functionality (independent, async)
    initFeedbacks();
  }

  // ============================================
  // Entry Point
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
