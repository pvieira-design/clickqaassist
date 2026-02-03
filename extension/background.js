chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'importChat') {
    handleImportChat(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getConfig') {
    chrome.storage.sync.get(['webAppUrl', 'apiKey', 'userEmail'], (result) => {
      sendResponse(result);
    });
    return true;
  }

  if (request.action === 'testConnection') {
    testConnection(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'fetchFeedbackTypes') {
    apiFetch(request.data, '/api/extension/feedback-types')
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'fetchChatFeedbacks') {
    const { webAppUrl, apiKey, chatUrl } = request.data;
    apiFetch({ webAppUrl, apiKey }, `/api/extension/chat-feedbacks?chatUrl=${encodeURIComponent(chatUrl)}`)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'createFeedback') {
    apiPost(request.data.config, '/api/extension/create-feedback', request.data.body)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'transcribeAudio') {
    transcribeAudio(request.data.audioUrl)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function apiFetch({ webAppUrl, apiKey }, path) {
  const url = `${webAppUrl.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    headers: { 'X-API-Key': apiKey },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function apiPost({ webAppUrl, apiKey }, path, body) {
  const url = `${webAppUrl.replace(/\/$/, '')}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

async function handleImportChat({ webAppUrl, apiKey, userEmail, chatUrl, messages }) {
  return apiPost({ webAppUrl, apiKey }, '/api/extension/import-chat', { userEmail, chatUrl, messages });
}

async function transcribeAudio(audioUrl) {
  const response = await fetch('https://api.clickchathistory.com/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: audioUrl }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Transcription HTTP ${response.status}`);
  return data;
}

async function testConnection({ webAppUrl, apiKey, userEmail }) {
  const url = `${webAppUrl.replace(/\/$/, '')}/api/extension/import-chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ userEmail, chatUrl: '', messages: [] }),
  });
  const data = await response.json();
  if (response.status === 401) throw new Error('API Key inválida');
  if (response.status === 403) throw new Error('Usuário não encontrado ou sem permissão');
  if (response.status === 400) return { connected: true, message: 'Conexão OK!' };
  throw new Error(data.error || `Status inesperado: ${response.status}`);
}
