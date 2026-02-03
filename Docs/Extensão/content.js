// ============================================
// ChatGuru Feedback Extension - Click Cannabis
// Integrado com Extension API
// ============================================

(function() {
  'use strict';

  // ============================================
  // Configuração da API
  // ============================================
  
  const API_URL = 'https://wqbezwfplltdsjlmahee.supabase.co/functions/v1/extension-api';
  const FEEDBACKS_HISTORY_URL = 'https://wqbezwfplltdsjlmahee.supabase.co/functions/v1/get-recent-feedbacks';
  const API_KEY = '123';
  const DEBUG = true;
  
  // OpenAI Whisper API
  const OPENAI_API_KEY = ''; // Set via environment
  const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';
  
  function log(...args) {
    if (DEBUG) console.log('[ClickFeedback]', ...args);
  }

  function logError(...args) {
    console.error('[ClickFeedback ERROR]', ...args);
  }

  // ============================================
  // Estado Global
  // ============================================
  
  let feedbackTypes = [];      // Tipos de feedback da API
  let agents = [];             // Lista de atendentes da API
  let existingFeedbacks = [];  // Feedbacks já registrados para este chat
  let chatHistoryId = null;    // ID do histórico do chat (se existir)
  let transcribedAudioIds = []; // IDs de áudios já transcritos (para evitar re-transcrição)
  let modalAtual = null;
  let mensagensProcessadas = new Map(); // Map de message_index -> elemento
  let transcricoesCache = new Map();    // Cache de transcrições: URL -> texto
  let processosEmAndamento = new Map(); // Map de chatUrl -> status (permite múltiplos processos)
  let inicializacaoCompleta = false;    // Flag para evitar processar antes de carregar dados
  let historicalFeedbacks = [];         // Últimos feedbacks para treinar a IA

  // ============================================
  // Funções da API
  // ============================================

  async function callAPI(action, params = {}) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY
        },
        body: JSON.stringify({ action, ...params })
      });
      
      const data = await response.json();
      log(`API ${action}:`, data);
      return data;
    } catch (error) {
      logError(`Erro na API ${action}:`, error);
      return { success: false, error: error.message };
    }
  }

  async function carregarFeedbackTypes() {
    const result = await callAPI('get_feedback_types');
    if (result.success && result.data) {
      feedbackTypes = result.data;
      log('Tipos de feedback carregados:', feedbackTypes.length);
    }
    return feedbackTypes;
  }

  async function carregarAgents() {
    const result = await callAPI('get_agents');
    if (result.success && result.data) {
      agents = result.data;
      log('Atendentes carregados:', agents.length);
    }
    return agents;
  }

  async function carregarFeedbacksExistentes() {
    const chatUrl = getChatUrl();
    log('📋 Buscando feedbacks para:', chatUrl);
    
    const result = await callAPI('get_feedbacks', { chat_url: chatUrl });
    
    log('📋 Resposta COMPLETA da API get_feedbacks:', JSON.stringify(result, null, 2));
    log('📋 result.success:', result.success);
    log('📋 result.exists:', result.exists);
    log('📋 result.data:', result.data);
    
    if (result.success && result.exists && result.data) {
      chatHistoryId = result.data.chat_history_id;
      existingFeedbacks = result.data.feedbacks || [];
      log('📋 ✅ Feedbacks existentes carregados:', existingFeedbacks.length);
      
      // Debug: mostra cada feedback e seu external_id
      if (existingFeedbacks.length > 0) {
        log('📋 Detalhes dos feedbacks:');
        existingFeedbacks.forEach((f, i) => {
          log(`   ${i + 1}. external_id: "${f.external_id}" | message_external_id: "${f.message_external_id}" | keys:`, Object.keys(f));
        });
      }
    } else {
      existingFeedbacks = [];
      chatHistoryId = null;
      log('📋 ⚠️ Nenhum feedback carregado. Motivo:');
      log('   - success:', result.success);
      log('   - exists:', result.exists);
      log('   - data:', result.data);
    }
    return existingFeedbacks;
  }

  async function carregarAudiosJaTranscritos() {
    const chatUrl = getChatUrl();
    const result = await callAPI('get_transcribed_audios', { chat_url: chatUrl });
    
    if (result.success && result.transcribed_ids) {
      transcribedAudioIds = result.transcribed_ids;
      log('🎵 Áudios já transcritos carregados:', transcribedAudioIds.length);
      if (transcribedAudioIds.length > 0) {
        log('🎵 IDs:', transcribedAudioIds);
      }
    } else {
      transcribedAudioIds = [];
      log('🎵 Nenhum áudio transcrito anteriormente para este chat');
    }
    return transcribedAudioIds;
  }

  // Verifica se um áudio já foi transcrito (para economizar custos)
  function audioJaTranscrito(externalId) {
    return transcribedAudioIds.includes(externalId);
  }

  // Carrega os últimos 100 feedbacks para treinar a IA
  async function carregarFeedbacksHistoricos() {
    try {
      log('📚 Buscando feedbacks históricos para treinar IA...');
      
      const response = await fetch(FEEDBACKS_HISTORY_URL);
      const result = await response.json();
      
      if (result.success && result.data) {
        historicalFeedbacks = result.data;
        log(`📚 Feedbacks históricos carregados: ${historicalFeedbacks.length}`);
      } else {
        historicalFeedbacks = [];
        log('📚 Nenhum feedback histórico encontrado');
      }
    } catch (error) {
      logError('Erro ao carregar feedbacks históricos:', error);
      historicalFeedbacks = [];
    }
    return historicalFeedbacks;
  }

  async function criarFeedback(externalId, feedbackTypeId, agentId, notes, chatHistory = [], audioTranscriptions = [], registeredBy = null, chatUrl = null) {
    // Usa o chatUrl passado como parâmetro, ou captura o atual se não foi passado
    const finalChatUrl = chatUrl || getChatUrl();
    
    const payload = {
      chat_url: finalChatUrl,
      agent_id: agentId,
      feedbacks: [{
        external_id: externalId,
        feedback_type_id: feedbackTypeId,
        notes: notes || ''
      }],
      chat_history: chatHistory,
      audio_transcriptions: audioTranscriptions
    };
    
    // Adiciona registered_by se disponível (será armazenado como created_by na API)
    if (registeredBy) {
      payload.registered_by = registeredBy;
      log('👤 Feedback registrado por:', registeredBy);
    }
    
    log('📤 Enviando payload completo:', payload);
    
    const result = await callAPI('create_feedback', payload);
    
    return result;
  }

  // ============================================
  // Funções Utilitárias
  // ============================================

  function getChatUrl() {
    return window.location.href;
  }

  // Normaliza texto para comparação (remove acentos, lowercase)
  function normalizarTexto(texto) {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s]/g, '')     // Remove caracteres especiais
      .trim();
  }

  // Extrai o nome do atendente da mensagem do ChatGuru
  function extrairNomeAtendenteDaMensagem(elementoMensagem) {
    try {
      if (!elementoMensagem) {
        log('⚠️ [extrairNome] elementoMensagem é null');
        return null;
      }
      
      // Busca o data-message-id
      const msgContainer = elementoMensagem.querySelector('[data-message-id]') || 
                           elementoMensagem.closest('[data-message-id]');
      
      if (msgContainer) {
        const messageId = msgContainer.getAttribute('data-message-id');
        log(`🔍 [extrairNome] messageId: ${messageId}`);
        
        const optionsContainer = document.getElementById(`msg_options_${messageId}`);
        log(`🔍 [extrairNome] optionsContainer existe: ${!!optionsContainer}`);
        
        if (optionsContainer) {
          log(`🔍 [extrairNome] optionsContainer HTML: ${optionsContainer.innerHTML.substring(0, 200)}`);
          
          const smallElement = optionsContainer.querySelector('.small');
          log(`🔍 [extrairNome] smallElement existe: ${!!smallElement}`);
          
          if (smallElement) {
            const texto = smallElement.textContent.trim();
            log(`🔍 [extrairNome] texto encontrado: "${texto}"`);
            
            const match = texto.match(/Enviada por\s+(.+)/i);
            if (match && match[1]) {
              log(`✅ [extrairNome] Nome extraído: "${match[1].trim()}"`);
              return match[1].trim();
            } else {
              log(`⚠️ [extrairNome] Regex não encontrou match em: "${texto}"`);
            }
          }
        } else {
          log(`⚠️ [extrairNome] optionsContainer não encontrado para msg_options_${messageId}`);
        }
      } else {
        log('⚠️ [extrairNome] msgContainer não encontrado');
      }
    } catch (e) {
      logError('Erro ao extrair nome do atendente:', e);
    }
    return null;
  }

  // Tenta abrir as informações da mensagem (clica no ícone ▼)
  async function abrirInfoMensagem(elementoMensagem) {
    try {
      if (!elementoMensagem) {
        log('⚠️ [abrirInfo] elementoMensagem é null');
        return;
      }
      
      const msgContainer = elementoMensagem.querySelector('[data-message-id]') || 
                           elementoMensagem.closest('[data-message-id]');
      
      if (msgContainer) {
        const messageId = msgContainer.getAttribute('data-message-id');
        log(`🔍 [abrirInfo] Tentando abrir info para messageId: ${messageId}`);
        
        const optionsContainer = document.getElementById(`msg_options_${messageId}`);
        
        // Se ainda não tem conteúdo, clica para abrir
        if (!optionsContainer || !optionsContainer.innerHTML.trim()) {
          log(`🔍 [abrirInfo] optionsContainer vazio, tentando clicar...`);
          
          // Tenta vários seletores para encontrar o ícone
          const infoIcon = elementoMensagem.querySelector(`i[data-message-id="${messageId}"].msg-option-box`) ||
                           elementoMensagem.querySelector('.msg-option-box') ||
                           elementoMensagem.querySelector('i.fa-caret-down') ||
                           elementoMensagem.querySelector('.msg-options-icon') ||
                           msgContainer.querySelector('.msg-option-box');
          
          if (infoIcon) {
            log(`✅ [abrirInfo] Ícone encontrado, clicando...`);
            infoIcon.click();
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Verifica se carregou
            const optionsAfter = document.getElementById(`msg_options_${messageId}`);
            log(`🔍 [abrirInfo] Após click, optionsContainer tem conteúdo: ${!!(optionsAfter && optionsAfter.innerHTML.trim())}`);
          } else {
            log(`⚠️ [abrirInfo] Ícone não encontrado para messageId: ${messageId}`);
            
            // Debug: mostra estrutura do elemento
            log(`🔍 [abrirInfo] Estrutura do elemento: ${elementoMensagem.innerHTML.substring(0, 300)}`);
          }
        } else {
          log(`✅ [abrirInfo] optionsContainer já tem conteúdo`);
        }
      } else {
        log('⚠️ [abrirInfo] msgContainer não encontrado');
      }
    } catch (e) {
      logError('Erro ao abrir info da mensagem:', e);
    }
  }

  // Encontra o atendente mais similar na lista
  function encontrarAtendentePorNome(nomeBuscado) {
    if (!nomeBuscado || agents.length === 0) return null;
    
    const nomeNormalizado = normalizarTexto(nomeBuscado);
    const partesNome = nomeNormalizado.split(/\s+/);
    
    log('Buscando atendente:', nomeBuscado, '→', nomeNormalizado);
    
    let melhorMatch = null;
    let melhorScore = 0;
    
    for (const agent of agents) {
      const nomeAgenteNormalizado = normalizarTexto(agent.full_name);
      const partesAgente = nomeAgenteNormalizado.split(/\s+/);
      
      // Score baseado em quantas partes do nome coincidem
      let score = 0;
      
      // Match exato
      if (nomeNormalizado === nomeAgenteNormalizado) {
        score = 100;
      }
      // Nome buscado está contido no nome do agente
      else if (nomeAgenteNormalizado.includes(nomeNormalizado)) {
        score = 80;
      }
      // Nome do agente está contido no nome buscado
      else if (nomeNormalizado.includes(nomeAgenteNormalizado)) {
        score = 70;
      }
      else {
        // Compara partes do nome
        for (const parte of partesNome) {
          if (parte.length < 2) continue; // Ignora partes muito curtas
          
          for (const parteAgente of partesAgente) {
            // Match exato de parte
            if (parte === parteAgente) {
              score += 30;
            }
            // Parte começa igual (ex: "juli" match com "juliana")
            else if (parteAgente.startsWith(parte) || parte.startsWith(parteAgente)) {
              score += 15;
            }
          }
        }
        
        // Bonus se o primeiro nome é igual
        if (partesNome[0] && partesAgente[0] && partesNome[0] === partesAgente[0]) {
          score += 20;
        }
      }
      
      if (score > melhorScore) {
        melhorScore = score;
        melhorMatch = agent;
      }
    }
    
    // Só retorna se tiver um score mínimo de confiança
    if (melhorScore >= 30) {
      log(`Match encontrado: "${nomeBuscado}" → "${melhorMatch.full_name}" (score: ${melhorScore})`);
      return melhorMatch;
    }
    
    log(`Nenhum match encontrado para: "${nomeBuscado}"`);
    return null;
  }

  function formatarDataHora() {
    return new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // Extrai o nome do responsável (usuário logado) do header da página
  function extrairNomeResponsavel() {
    try {
      // Busca o link para /user/me no nav_top que contém o nome do usuário
      const userLink = document.querySelector('#nav_top a[href="/user/me"].text-muted2.fs-5');
      
      if (userLink) {
        const textoCompleto = userLink.textContent.trim();
        // O formato é "Nome Completo | Empresa" - queremos apenas o nome
        const partes = textoCompleto.split('|');
        if (partes.length > 0) {
          const nome = partes[0].trim();
          log('👤 Responsável detectado:', nome);
          return nome;
        }
      }
      
      // Fallback: tenta outros seletores
      const navTop = document.getElementById('nav_top');
      if (navTop) {
        const links = navTop.querySelectorAll('a[href="/user/me"]');
        for (const link of links) {
          const texto = link.textContent.trim();
          if (texto && texto.length > 2 && !texto.includes('img')) {
            const partes = texto.split('|');
            const nome = partes[0].trim();
            if (nome.length > 2) {
              log('👤 Responsável detectado (fallback):', nome);
              return nome;
            }
          }
        }
      }
      
      log('⚠️ Não foi possível detectar o nome do responsável');
      return null;
    } catch (e) {
      logError('Erro ao extrair nome do responsável:', e);
      return null;
    }
  }

  function extrairTextoMensagem(elementoMensagem) {
    try {
      if (!elementoMensagem) return '[Conteúdo não identificado]';
      
      // Verifica se é áudio
      if (elementoMensagem.querySelector('audio')) {
        return '[Áudio]';
      }

      // Verifica se é imagem
      if (elementoMensagem.querySelector('img.img-fluid, img.chat-image')) {
        return '[Imagem]';
      }

      // Extrai o texto
      const textoElement = elementoMensagem.querySelector('.msg-contentT.ct, .msg-contentT, span.ct, .ct');
      if (textoElement) {
        return textoElement.textContent.trim().replace(/\s+/g, ' ');
      }

      const msgContainer = elementoMensagem.querySelector('.m-cont-in');
      if (msgContainer) {
        const clone = msgContainer.cloneNode(true);
        clone.querySelectorAll('.msg-timestamp, .msg-ack, .clearfix, button, .btn').forEach(el => el.remove());
        const texto = clone.textContent.trim().replace(/\s+/g, ' ');
        if (texto) return texto;
      }

      return '[Conteúdo não identificado]';
    } catch (e) {
      return '[Conteúdo não identificado]';
    }
  }

  function extrairHoraMensagem(elementoMensagem) {
    try {
      const timestampElement = elementoMensagem.querySelector('.msg-timestamp');
      return timestampElement ? timestampElement.textContent.trim() : '';
    } catch (e) {
      return '';
    }
  }

  // ============================================
  // Transcrição de Áudio (via URL pré-assinada)
  // ============================================

  // Obtém a URL pré-assinada usando a API do ChatGuru (via background com cookies)
  async function obterUrlPreAssinada(externalId, audioUrlBase) {
    try {
      log(`🔗 [${externalId}] Buscando URL pré-assinada via API...`);
      
      // Extrai o subdomínio atual (ex: s21 de s21.chatguru.app)
      const currentHost = window.location.host;
      
      // Monta a URL da API de download
      const downloadApiUrl = `https://${currentHost}/attachments/message/download/${externalId}`;
      log(`🔗 [${externalId}] URL da API: ${downloadApiUrl}`);
      
      // Pega os cookies da página
      const cookies = document.cookie;
      log(`🔗 [${externalId}] Cookies capturados: ${cookies.substring(0, 100)}...`);
      
      // Envia para o background script que vai fazer a requisição com os cookies
      const response = await chrome.runtime.sendMessage({
        action: 'getPresignedUrl',
        downloadUrl: downloadApiUrl,
        cookies: cookies
      });
      
      log(`🔗 [${externalId}] Resposta do background:`, response);
      
      if (response && response.success && response.presignedUrl) {
        log(`✅ [${externalId}] URL pré-assinada obtida: ${response.presignedUrl.substring(0, 80)}...`);
        return response.presignedUrl;
      }
      
      log(`⚠️ [${externalId}] Não conseguiu URL pré-assinada, usando URL base`);
      return audioUrlBase;
      
    } catch (error) {
      logError(`Erro ao obter URL pré-assinada [${externalId}]:`, error);
      return audioUrlBase;
    }
  }

  // Encontra o elemento da mensagem pelo external_id
  function encontrarContainerMensagem(externalId) {
    const msgContainer = document.querySelector(`[data-message-id="${externalId}"]`);
    if (msgContainer) {
      return msgContainer.closest('.novo-display-teste') || 
             msgContainer.closest('.row_msg') || 
             msgContainer;
    }
    return null;
  }

  // Transcreve um áudio pelo external_id (usando URL pré-assinada)
  async function transcreverAudioPorExternalId(externalId, audioUrl) {
    // Verifica cache primeiro
    if (transcricoesCache.has(audioUrl)) {
      log('Transcrição em cache para:', audioUrl);
      return transcricoesCache.get(audioUrl);
    }
    
    try {
      log(`🎙️ [${externalId}] Obtendo URL pré-assinada...`);
      
      // Tenta obter a URL pré-assinada clicando no botão de download
      let presignedUrl;
      try {
        presignedUrl = await obterUrlPreAssinada(externalId, audioUrl);
        log(`🔗 [${externalId}] URL obtida: ${presignedUrl.substring(0, 100)}...`);
      } catch (e) {
        log(`⚠️ [${externalId}] Não conseguiu URL pré-assinada, usando URL original: ${e.message}`);
        presignedUrl = audioUrl;
      }
      
      // Verifica se a URL tem assinatura AWS
      const hasSignature = presignedUrl.includes('X-Amz-Signature');
      log(`🔗 [${externalId}] URL tem assinatura AWS: ${hasSignature}`);
      
      // Envia para o background script baixar e transcrever
      log(`🎙️ [${externalId}] Enviando para background script...`);
      
      const response = await chrome.runtime.sendMessage({
        action: 'transcribeAudio',
        audioUrl: presignedUrl
      });
      
      log(`🎙️ [${externalId}] Resposta da transcrição:`, response);
      
      if (response && response.success && response.transcription) {
        transcricoesCache.set(audioUrl, response.transcription);
        return response.transcription;
      } else {
        logError(`Erro na transcrição [${externalId}]:`, response?.error || 'Resposta inválida');
        return null;
      }
    } catch (error) {
      logError(`Erro ao transcrever áudio [${externalId}]:`, error);
      return null;
    }
  }

  // Converte Blob para Base64
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ============================================
  // Carregar Todas as Mensagens (Paginação)
  // ============================================

  // Carrega todas as mensagens do chat clicando no botão "Carregar mais"
  async function carregarTodasMensagens() {
    const SELETOR_BOTAO_CARREGAR = '.alert.alert-info.text-center.pointer';
    const MAX_TENTATIVAS = 100; // Limite de segurança para evitar loop infinito
    const DELAY_ENTRE_CLIQUES = 1500; // Tempo para aguardar resposta da API
    
    let tentativas = 0;
    
    // Verifica se existe o botão
    let botaoCarregar = document.querySelector(SELETOR_BOTAO_CARREGAR);
    
    // Se não tem botão ou não é o botão correto, já está tudo carregado
    if (!botaoCarregar || !botaoCarregar.textContent.toLowerCase().includes('carregar mais')) {
      log('📜 Não há mais mensagens para carregar (botão não encontrado)');
      return 0;
    }
    
    // Conta mensagens iniciais
    const mensagensIniciais = document.querySelectorAll('.row_msg, .novo-display-teste').length;
    log(`📜 Iniciando carregamento de todas as mensagens... (${mensagensIniciais} já carregadas)`);
    mostrarToast(`📜 Carregando histórico completo...`, 'info');
    
    while (tentativas < MAX_TENTATIVAS) {
      // Busca o botão "Carregar mais mensagens"
      botaoCarregar = document.querySelector(SELETOR_BOTAO_CARREGAR);
      
      // Se não encontrou o botão ou não é o botão correto, todas as mensagens foram carregadas
      if (!botaoCarregar || !botaoCarregar.textContent.toLowerCase().includes('carregar mais')) {
        log(`✅ Todas as mensagens carregadas! (${tentativas} páginas carregadas)`);
        break;
      }
      
      tentativas++;
      log(`📜 Carregando página ${tentativas}...`);
      
      // Clica no botão
      botaoCarregar.click();
      
      // Aguarda a resposta da API e renderização das novas mensagens
      await aguardarCarregamentoMensagens(DELAY_ENTRE_CLIQUES);
      
      // Atualiza toast a cada 5 páginas
      if (tentativas % 5 === 0) {
        const mensagensAtuais = document.querySelectorAll('.row_msg, .novo-display-teste').length;
        mostrarToast(`📜 Carregando... (${mensagensAtuais} mensagens)`, 'info');
      }
    }
    
    if (tentativas >= MAX_TENTATIVAS) {
      log('⚠️ Limite de tentativas atingido. Algumas mensagens podem não ter sido carregadas.');
    }
    
    const mensagensFinais = document.querySelectorAll('.row_msg, .novo-display-teste').length;
    const mensagensNovas = mensagensFinais - mensagensIniciais;
    
    if (tentativas > 0) {
      mostrarToast(`✅ ${mensagensFinais} mensagens carregadas! (+${mensagensNovas} novas)`, 'success');
    }
    
    return tentativas;
  }

  // Função auxiliar para esperar o carregamento das mensagens estabilizar
  async function aguardarCarregamentoMensagens(tempoBase = 1500) {
    // Primeiro aguarda o tempo base para a requisição
    await new Promise(resolve => setTimeout(resolve, tempoBase));
    
    // Depois verifica se o número de mensagens estabilizou
    let ultimoCount = document.querySelectorAll('.row_msg, .novo-display-teste').length;
    let tentativasEstabilizacao = 0;
    const MAX_TENTATIVAS_ESTABILIZACAO = 5;
    
    while (tentativasEstabilizacao < MAX_TENTATIVAS_ESTABILIZACAO) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const novoCount = document.querySelectorAll('.row_msg, .novo-display-teste').length;
      
      if (novoCount === ultimoCount) {
        // Estabilizou
        return;
      }
      
      ultimoCount = novoCount;
      tentativasEstabilizacao++;
    }
  }

  // ============================================
  // Captura de Dados do Chat (Snapshot)
  // ============================================

  // Captura TODOS os dados do chat de uma vez (snapshot imediato)
  // Isso permite processar mesmo se o usuário mudar de tela
  function capturarSnapshotDoChat() {
    log('📸 Capturando snapshot do chat...');
    
    const snapshot = {
      chatUrl: window.location.href,
      timestamp: new Date().toISOString(),
      mensagens: [],
      audios: []
    };
    
    try {
      // Tenta múltiplos seletores para encontrar as mensagens
      let todasMensagens = document.querySelectorAll('.row_msg');
      log(`📸 Encontradas ${todasMensagens.length} mensagens via .row_msg`);
      
      // Se não encontrou, tenta outros seletores
      if (todasMensagens.length === 0) {
        todasMensagens = document.querySelectorAll('.novo-display-teste');
        log(`📸 Encontradas ${todasMensagens.length} mensagens via .novo-display-teste`);
      }
      
      // Busca direta por todos os áudios na página para debug
      const todosAudios = document.querySelectorAll('audio');
      log(`🔍 Total de elementos <audio> na página: ${todosAudios.length}`);
      todosAudios.forEach((audio, i) => {
        const source = audio.querySelector('source');
        const url = source?.src || audio.src;
        log(`🔍 Áudio ${i}: ${url}`);
      });
      
      todasMensagens.forEach((rowMsg, index) => {
        // Tenta encontrar o elemento da mensagem de várias formas
        let mensagemElement = rowMsg.querySelector('.novo-display-teste');
        if (!mensagemElement) {
          mensagemElement = rowMsg.classList.contains('novo-display-teste') ? rowMsg : null;
        }
        if (!mensagemElement) {
          mensagemElement = rowMsg;
        }
        
        const externalId = extrairExternalId(mensagemElement) || extrairExternalId(rowMsg);
        const hora = extrairHoraMensagem(mensagemElement) || extrairHoraMensagem(rowMsg);
        const isEnviada = mensagemElement.classList.contains('enviada') || rowMsg.classList.contains('enviada') || mensagemElement.querySelector('.bg-sent-msg') !== null;
        
        log(`📸 Processando msg ${index}: externalId=${externalId}, isEnviada=${isEnviada}`);
        
        // Determina o tipo de mensagem
        let tipo = 'text';
        let conteudo = '';
        let audioUrl = null;
        
        // Verifica se é áudio - busca em múltiplos containers
        let audioElement = mensagemElement.querySelector('audio');
        if (!audioElement) {
          audioElement = rowMsg.querySelector('audio');
        }
        
        if (audioElement) {
          tipo = 'audio';
          
          // Tenta pegar a URL do áudio de várias formas
          const sourceElement = audioElement.querySelector('source');
          audioUrl = sourceElement?.src || audioElement.src || audioElement.getAttribute('src');
          
          // Se ainda não encontrou, tenta pegar do currentSrc
          if (!audioUrl && audioElement.currentSrc) {
            audioUrl = audioElement.currentSrc;
          }
          
          log(`🎵 Áudio encontrado na msg ${index} - URL: ${audioUrl}`);
          conteudo = '[Áudio]';
          
          // Adiciona à lista de áudios para transcrever
          if (audioUrl && audioUrl.length > 0) {
            snapshot.audios.push({
              index: index,
              externalId: externalId,
              url: audioUrl
            });
            log(`🎵 Áudio adicionado ao snapshot: ${externalId} -> ${audioUrl}`);
          } else {
            log(`⚠️ Áudio sem URL para mensagem ${externalId}. AudioElement:`, audioElement);
          }
        }
        // Verifica se é imagem
        else if (mensagemElement.querySelector('img.img-fluid, img.chat-image')) {
          tipo = 'image';
          conteudo = '[Imagem]';
        }
        // Mensagem de texto
        else {
          conteudo = extrairTextoMensagem(mensagemElement);
        }
        
        // Tenta extrair o nome do remetente
        let remetente = isEnviada ? 'atendente' : 'cliente';
        const nomeAtendente = extrairNomeAtendenteDaMensagem(mensagemElement);
        if (nomeAtendente) {
          remetente = nomeAtendente;
        }
        
        snapshot.mensagens.push({
          index: index,
          external_id: externalId,
          type: tipo,
          content: conteudo,
          timestamp: hora,
          sender: remetente,
          is_sent: isEnviada,
          audio_url: audioUrl,
          transcription: null // Será preenchido depois
        });
      });
      
      log(`📸 Snapshot capturado: ${snapshot.mensagens.length} mensagens, ${snapshot.audios.length} áudios`);
      return snapshot;
    } catch (error) {
      logError('Erro ao capturar snapshot:', error);
      return snapshot;
    }
  }

  // Mapeia tipo da API para classe CSS
  function tipoParaClasse(tipo) {
    const mapa = {
      'error': 'erro',
      'attention': 'atencao',
      'success': 'acerto'
    };
    return mapa[tipo] || 'atencao';
  }

  // Mapeia tipo da API para ícone
  function tipoParaIcone(tipo) {
    const mapa = {
      'error': '✕',
      'attention': '⚠',
      'success': '✓'
    };
    return mapa[tipo] || '•';
  }

  // Extrai o data-message-id (external_id) de um elemento de mensagem
  function extrairExternalId(elementoMensagem) {
    try {
      if (!elementoMensagem) return null;
      
      // 1. Primeiro verifica se o próprio elemento tem o atributo
      if (elementoMensagem.hasAttribute('data-message-id')) {
        return elementoMensagem.getAttribute('data-message-id');
      }
      
      // 2. Busca no ancestral mais próximo (subindo na árvore)
      const ancestral = elementoMensagem.closest('[data-message-id]');
      if (ancestral) {
        return ancestral.getAttribute('data-message-id');
      }
      
      // 3. Só como último recurso, busca em filhos DIRETOS (não em toda a subárvore)
      // Isso evita pegar o ID de uma mensagem vizinha/aninhada
      const filhosComId = elementoMensagem.querySelectorAll(':scope > [data-message-id], :scope > * > [data-message-id]');
      if (filhosComId.length === 1) {
        // Só retorna se houver exatamente um match (evita ambiguidade)
        return filhosComId[0].getAttribute('data-message-id');
      }
      
      // 4. Se tem múltiplos, busca o que está mais relacionado à classe .enviada ou .bg-sent-msg
      if (filhosComId.length > 1) {
        for (const filho of filhosComId) {
          const container = filho.closest('.msg-container');
          if (container && (container.classList.contains('bg-sent-msg') || 
                           filho.closest('.enviada'))) {
            return filho.getAttribute('data-message-id');
          }
        }
        // Se não encontrou, pega o primeiro (mantém comportamento anterior)
        log('⚠️ Múltiplos data-message-id encontrados, usando o primeiro');
        return filhosComId[0].getAttribute('data-message-id');
      }
      
    } catch (e) {
      logError('Erro ao extrair external_id:', e);
    }
    return null;
  }

  // ============================================
  // Modal de Feedback
  // ============================================

  function criarModal() {
    const overlay = document.createElement('div');
    overlay.className = 'click-modal-overlay';
    overlay.innerHTML = `
      <div class="click-modal">
        <div class="click-modal-header">
          <div class="click-modal-title">
            <div class="click-modal-title-icon"></div>
            <span>Registrar Feedback</span>
          </div>
          <button class="click-modal-close">✕</button>
        </div>
        <div class="click-modal-body">
          <div class="click-message-info">
            <div class="click-message-info-row">
              <span class="click-message-info-label">Mensagem:</span>
              <span class="click-message-info-value" id="click-info-mensagem"></span>
            </div>
            <div class="click-message-info-row">
              <span class="click-message-info-label">Hora msg:</span>
              <span class="click-message-info-value" id="click-info-hora-msg"></span>
            </div>
            <div class="click-message-info-row">
              <span class="click-message-info-label">Índice:</span>
              <span class="click-message-info-value" id="click-info-index"></span>
            </div>
          </div>

          <div class="click-form-group">
            <label class="click-form-label">Atendente *</label>
            <select class="click-form-select" id="click-atendente">
              <option value="">Selecione o atendente...</option>
            </select>
          </div>

          <div class="click-form-group">
            <label class="click-form-label">Tipo de Feedback *</label>
            <select class="click-form-select" id="click-tipo-feedback">
              <option value="">Selecione o tipo...</option>
            </select>
          </div>

          <div class="click-form-group">
            <label class="click-form-label">Observações</label>
            <textarea class="click-form-textarea" id="click-observacoes" placeholder="Descreva detalhes adicionais sobre o feedback..."></textarea>
          </div>
        </div>
        <div class="click-modal-footer">
          <button class="click-btn click-btn-cancel">Cancelar</button>
          <button class="click-btn click-btn-submit">Enviar Feedback</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    const closeBtn = overlay.querySelector('.click-modal-close');
    const cancelBtn = overlay.querySelector('.click-btn-cancel');
    
    if (closeBtn) closeBtn.addEventListener('click', fecharModal);
    if (cancelBtn) cancelBtn.addEventListener('click', fecharModal);
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) fecharModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalAtual && modalAtual.classList.contains('active')) {
        fecharModal();
      }
    });

    return overlay;
  }

  async function abrirModal(tipoInicial, externalId, elementoMensagem) {
    if (!modalAtual) {
      modalAtual = criarModal();
    }

    const mensagemTexto = extrairTextoMensagem(elementoMensagem);
    const horaMensagem = extrairHoraMensagem(elementoMensagem);

    // Preenche informações da mensagem
    const mensagemField = modalAtual.querySelector('#click-info-mensagem');
    if (mensagemField) {
      mensagemField.textContent = mensagemTexto.length > 200 
        ? mensagemTexto.substring(0, 200) + '...' 
        : mensagemTexto;
    }
    
    const horaField = modalAtual.querySelector('#click-info-hora-msg');
    if (horaField) horaField.textContent = horaMensagem || 'N/A';
    
    const indexField = modalAtual.querySelector('#click-info-index');
    if (indexField) indexField.textContent = externalId ? `ID: ${externalId.substring(0, 12)}...` : 'N/A';

    // Atualiza título e ícone baseado no tipo inicial
    const iconElement = modalAtual.querySelector('.click-modal-title-icon');
    const titleSpan = modalAtual.querySelector('.click-modal-title span');
    
    const tipoMapa = {
      'erro': { icon: '✕', title: 'Registrar Erro', classe: 'erro' },
      'atencao': { icon: '⚠', title: 'Registrar Atenção', classe: 'atencao' },
      'acerto': { icon: '✓', title: 'Registrar Acerto', classe: 'acerto' }
    };
    
    const tipoConfig = tipoMapa[tipoInicial] || tipoMapa['atencao'];
    if (iconElement) {
      iconElement.className = `click-modal-title-icon ${tipoConfig.classe}`;
      iconElement.textContent = tipoConfig.icon;
    }
    if (titleSpan) titleSpan.textContent = tipoConfig.title;

    // Popula dropdown de atendentes
    const selectAtendente = modalAtual.querySelector('#click-atendente');
    if (selectAtendente) {
      selectAtendente.innerHTML = '<option value="">Selecione o atendente...</option>';
      agents.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.id;
        option.textContent = `${agent.full_name}${agent.department ? ` (${agent.department})` : ''}`;
        selectAtendente.appendChild(option);
      });
    }

    // Mostra modal imediatamente
    setTimeout(() => modalAtual.classList.add('active'), 10);

    // Tenta encontrar e pré-selecionar o atendente automaticamente
    setTimeout(async () => {
      // Primeiro tenta pegar o nome direto
      let nomeAtendente = extrairNomeAtendenteDaMensagem(elementoMensagem);
      
      // Se não encontrou, tenta abrir as informações da mensagem
      if (!nomeAtendente) {
        await abrirInfoMensagem(elementoMensagem);
        nomeAtendente = extrairNomeAtendenteDaMensagem(elementoMensagem);
      }
      
      if (nomeAtendente) {
        const agenteEncontrado = encontrarAtendentePorNome(nomeAtendente);
        if (agenteEncontrado && selectAtendente) {
          selectAtendente.value = agenteEncontrado.id;
          log(`Atendente pré-selecionado: ${agenteEncontrado.full_name}`);
        }
      }
    }, 100);

    // Popula dropdown de tipos de feedback (filtrado pelo tipo selecionado)
    const selectTipo = modalAtual.querySelector('#click-tipo-feedback');
    if (selectTipo) {
      selectTipo.innerHTML = '<option value="">Selecione o tipo...</option>';
      
      // Mapeia tipo do botão para tipo da API
      const tipoApiMapa = {
        'erro': 'error',
        'atencao': 'attention',
        'acerto': 'success'
      };
      const tipoApi = tipoApiMapa[tipoInicial];
      
      // Filtra tipos pelo tipo selecionado
      const tiposFiltrados = feedbackTypes.filter(ft => ft.type === tipoApi);
      
      tiposFiltrados.forEach(ft => {
        const option = document.createElement('option');
        option.value = ft.id;
        option.textContent = `${ft.title} (${ft.points > 0 ? '+' : ''}${ft.points} pts)`;
        selectTipo.appendChild(option);
      });
    }

    // Limpa observações
    const obsField = modalAtual.querySelector('#click-observacoes');
    if (obsField) obsField.value = '';

    // Configura submit
    const btnSubmit = modalAtual.querySelector('.click-btn-submit');
    if (btnSubmit) {
      btnSubmit.onclick = () => enviarFeedback(externalId, elementoMensagem);
    }
  }

  function fecharModal() {
    if (modalAtual) {
      modalAtual.classList.remove('active');
    }
  }

  // ============================================
  // Envio do Feedback
  // ============================================

  async function enviarFeedback(externalId, elementoMensagem) {
    const selectAtendente = modalAtual.querySelector('#click-atendente');
    const selectTipo = modalAtual.querySelector('#click-tipo-feedback');
    const obsField = modalAtual.querySelector('#click-observacoes');
    
    const agentId = selectAtendente ? selectAtendente.value : '';
    const feedbackTypeId = selectTipo ? selectTipo.value : '';
    const notes = obsField ? obsField.value : '';

    if (!agentId) {
      mostrarToast('Selecione o atendente', 'error');
      return;
    }

    if (!feedbackTypeId) {
      mostrarToast('Selecione o tipo de feedback', 'error');
      return;
    }

    // Captura dados básicos ANTES de fechar o modal
    const chatUrl = window.location.href;
    const feedbackType = feedbackTypes.find(ft => ft.id === feedbackTypeId);
    const registeredBy = extrairNomeResponsavel();
    
    // FECHA O MODAL IMEDIATAMENTE - tudo acontece em background
    fecharModal();
    
    // Adiciona badge imediatamente (feedback visual)
    if (feedbackType && elementoMensagem) {
      adicionarBadge(elementoMensagem, feedbackType);
    }
    
    // Mostra toast de início - indica que está processando em background
    mostrarToast('📜 Carregando histórico e processando em background...', 'info');
    
    log('🚀 Iniciando processamento completo em background...');
    
    // DISPARA TODO O PROCESSAMENTO EM BACKGROUND (não bloqueia)
    // Carregamento de mensagens + Captura + Transcrição + Envio
    processarFeedbackCompletoEmBackground({
      chatUrl,
      externalId,
      feedbackTypeId,
      agentId,
      notes,
      feedbackType,
      registeredBy
    });
    
    log('✅ Processamento iniciado em background. Você pode continuar usando a interface!');
  }

  // Processa o feedback completo em background (carrega mensagens + captura + transcrição + envio)
  async function processarFeedbackCompletoEmBackground(dadosIniciais) {
    const { 
      chatUrl, 
      externalId, 
      feedbackTypeId, 
      agentId, 
      notes,
      feedbackType,
      registeredBy
    } = dadosIniciais;
    
    const processoId = `${chatUrl}_${Date.now()}`;
    processosEmAndamento.set(processoId, { status: 'carregando_mensagens', inicio: Date.now() });
    
    log(`🚀 [${processoId}] Iniciando processamento completo em background...`);
    
    try {
      // PASSO 1: Carrega todas as mensagens do chat
      log(`📜 [${processoId}] Passo 1: Carregando todas as mensagens...`);
      const paginasCarregadas = await carregarTodasMensagens();
      log(`📜 [${processoId}] ${paginasCarregadas} páginas carregadas`);
      
      // PASSO 2: Captura o snapshot após carregar todas as mensagens
      log(`📸 [${processoId}] Passo 2: Capturando snapshot do chat...`);
      const snapshot = capturarSnapshotDoChat();
      log(`📸 [${processoId}] Snapshot capturado: ${snapshot.mensagens.length} mensagens, ${snapshot.audios.length} áudios`);
      
      // Atualiza status
      processosEmAndamento.set(processoId, { status: 'transcrevendo', inicio: Date.now() });
      
      // PASSO 3: Transcrever áudios
      log(`🎙️ [${processoId}] Passo 3: Transcrevendo ${snapshot.audios.length} áudios...`);
      
      const audioTranscriptions = [];
      let audiosTranscritos = 0;
      let audiosPulados = 0;
      
      for (const audioInfo of snapshot.audios) {
        // Verifica se já foi transcrito (economia de custo)
        if (audioJaTranscrito(audioInfo.externalId)) {
          log(`💰 [${processoId}] Áudio ${audioInfo.externalId} já transcrito - PULANDO`);
          audiosPulados++;
          
          const msgIndex = snapshot.mensagens.findIndex(m => m.external_id === audioInfo.externalId);
          if (msgIndex !== -1) {
            snapshot.mensagens[msgIndex].content = '[Áudio - já transcrito]';
          }
          continue;
        }
        
        log(`🎙️ [${processoId}] Transcrevendo: ${audioInfo.externalId}`);
        
        const transcricao = await transcreverAudioPorExternalId(audioInfo.externalId, audioInfo.url);
        
        if (transcricao) {
          audioTranscriptions.push({
            external_id: audioInfo.externalId,
            audio_url: audioInfo.url,
            transcription: transcricao
          });
          
          const msgIndex = snapshot.mensagens.findIndex(m => m.external_id === audioInfo.externalId);
          if (msgIndex !== -1) {
            snapshot.mensagens[msgIndex].transcription = transcricao;
            snapshot.mensagens[msgIndex].content = `[Áudio] ${transcricao}`;
          }
          audiosTranscritos++;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      log(`✅ [${processoId}] Transcrições: ${audiosTranscritos} novos, ${audiosPulados} pulados`);
      
      // PASSO 4: Enviar para a API
      log(`📤 [${processoId}] Passo 4: Enviando para a API...`);
      processosEmAndamento.set(processoId, { status: 'enviando', inicio: Date.now() });
      
      const chatHistory = snapshot.mensagens;
      // Passa o chatUrl original (capturado no momento do clique) para garantir que não mude se o usuário trocar de chat
      const result = await criarFeedback(externalId, feedbackTypeId, agentId, notes, chatHistory, audioTranscriptions, registeredBy, chatUrl);
      
      if (result.success) {
        mostrarToast('✅ Feedback enviado com sucesso!', 'success');
        log(`✅ [${processoId}] Feedback completo enviado!`);
        
        // Atualiza estado local se ainda estiver no mesmo chat
        if (window.location.href === chatUrl) {
          existingFeedbacks.push({
            external_id: externalId,
            feedback_type: feedbackType,
            notes: notes
          });
          
          if (audioTranscriptions.length > 0) {
            const novosIdsTranscritos = audioTranscriptions.map(at => at.external_id);
            transcribedAudioIds = [...transcribedAudioIds, ...novosIdsTranscritos];
          }
        }
      } else {
        throw new Error(result.error || 'Erro ao enviar feedback');
      }
      
      processosEmAndamento.set(processoId, { status: 'concluido', fim: Date.now() });
      
    } catch (error) {
      logError(`❌ [${processoId}] Erro no processamento:`, error);
      mostrarToast('❌ Erro ao processar feedback', 'error');
      processosEmAndamento.set(processoId, { status: 'erro', erro: error.message });
    } finally {
      // Remove o processo após 5 minutos
      setTimeout(() => {
        processosEmAndamento.delete(processoId);
      }, 5 * 60 * 1000);
    }
  }

  // ============================================
  // Toast de Notificação
  // ============================================

  function mostrarToast(mensagem, tipo) {
    const toastExistente = document.querySelector('.click-toast');
    if (toastExistente) toastExistente.remove();

    const toast = document.createElement('div');
    toast.className = `click-toast ${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ============================================
  // Botões de Feedback
  // ============================================

  function criarBotoesFeedback(externalId, elementoMensagem) {
    const container = document.createElement('div');
    container.className = 'click-feedback-buttons';
    container.setAttribute('data-external-id', externalId);

    const tipos = ['erro', 'atencao', 'acerto'];
    const labels = ['Erro', 'Atenção', 'Acerto'];

    tipos.forEach((tipo, index) => {
      const btn = document.createElement('button');
      btn.className = `click-feedback-btn ${tipo}`;
      btn.textContent = labels[index];
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Verifica se o external_id ainda é válido (não foi alterado pelo DOM)
        const idAtual = container.getAttribute('data-external-id');
        const idVerificado = extrairExternalId(elementoMensagem);
        
        log('🔍 Botão clicado:', tipo);
        log('   - External ID do container:', idAtual);
        log('   - External ID extraído agora:', idVerificado);
        log('   - External ID passado na criação:', externalId);
        
        // Usa o ID do container (mais confiável)
        const idFinal = idAtual || externalId;
        
        if (idAtual !== externalId) {
          log('⚠️ IDs diferentes! Usando ID do container:', idAtual);
        }
        
        abrirModal(tipo, idFinal, elementoMensagem);
      });
      container.appendChild(btn);
    });

    return container;
  }

  function adicionarBadge(elementoMensagem, feedbackType) {
    try {
      if (!elementoMensagem || !feedbackType) return;

      const classe = tipoParaClasse(feedbackType.type);
      const icone = tipoParaIcone(feedbackType.type);

      const botoesContainer = elementoMensagem.querySelector('.click-feedback-buttons');
      if (botoesContainer) {
        botoesContainer.style.opacity = '1';
        
        // Busca ou cria o container de badges
        let badgesContainer = botoesContainer.querySelector('.click-badges-container');
        if (!badgesContainer) {
          badgesContainer = document.createElement('div');
          badgesContainer.className = 'click-badges-container';
          botoesContainer.insertBefore(badgesContainer, botoesContainer.firstChild);
        }
        
        const badge = document.createElement('span');
        badge.className = `click-feedback-badge ${classe}`;
        badge.textContent = `${icone} ${feedbackType.title}`;
        badge.title = `${feedbackType.points > 0 ? '+' : ''}${feedbackType.points} pontos`;
        
        badgesContainer.appendChild(badge);
        botoesContainer.classList.add('has-feedback');
      }
    } catch (e) {
      logError('Erro ao adicionar badge:', e);
    }
  }

  // ============================================
  // Encontrar e Processar Mensagens
  // ============================================

  function encontrarMensagensEnviadas() {
    const seletores = [
      '.novo-display-teste.enviada',
      '.row_msg .novo-display-teste.enviada',
      '.msg-container.bg-sent-msg'
    ];
    
    let mensagens = [];
    
    for (const seletor of seletores) {
      const elementos = document.querySelectorAll(seletor);
      if (elementos.length > 0) {
        mensagens = Array.from(elementos);
        break;
      }
    }
    
    // Se encontrou msg-container, tenta pegar o pai
    if (mensagens.length > 0 && mensagens[0].classList.contains('msg-container')) {
      mensagens = mensagens.map(el => el.closest('.novo-display-teste') || el);
    }

    return mensagens;
  }

  function processarMensagens() {
    // Não processa se a inicialização ainda não terminou
    if (!inicializacaoCompleta) {
      log('⏳ Aguardando inicialização completa...');
      return;
    }
    
    try {
      const mensagens = encontrarMensagensEnviadas();
      log(`Encontradas ${mensagens.length} mensagens enviadas`);
      log(`📋 existingFeedbacks (${existingFeedbacks.length}):`, existingFeedbacks);
      
      // Debug: lista todos os external_ids dos feedbacks para comparação
      const feedbackIds = existingFeedbacks.map(f => f.external_id || f.message_external_id);
      log('📋 IDs de feedbacks existentes para comparar:', feedbackIds);
      
      mensagens.forEach((mensagem, idx) => {
        if (!mensagem) return;
        
        // Extrai o external_id (data-message-id) da mensagem PRIMEIRO
        const externalId = extrairExternalId(mensagem);
        
        if (!externalId) {
          log('Mensagem sem external_id, pulando...');
          return;
        }
        
        // Verifica se já foi processada - busca por botões COM O MESMO external_id
        const botoesExistentes = mensagem.querySelector(`.click-feedback-buttons[data-external-id="${externalId}"]`);
        if (botoesExistentes) {
          return; // Já processada com este ID específico
        }
        
        // Também verifica se já está no Map de processadas
        if (mensagensProcessadas.has(externalId)) {
          return;
        }
        
        log(`🔎 Processando mensagem idx=${idx}, externalId=${externalId}`);
        
        // Debug: mostra informações do elemento
        const debugInfo = {
          tagName: mensagem.tagName,
          classes: mensagem.className,
          hasDataMessageId: mensagem.hasAttribute('data-message-id'),
          ownDataMessageId: mensagem.getAttribute('data-message-id')
        };
        log(`   Elemento:`, debugInfo);
        
        // Verifica se já tem feedback existente para esta mensagem
        // A API pode retornar external_id ou message_external_id
        const feedbackExistente = existingFeedbacks.find(f => {
          const fExtId = f.external_id || f.message_external_id;
          const match = fExtId === externalId;
          if (match) {
            log(`   🎯 Match encontrado! feedback.external_id="${fExtId}" === mensagem.externalId="${externalId}"`);
          }
          return match;
        });
        
        // Busca TODOS os feedbacks existentes para esta mensagem (pode ter mais de um)
        const feedbacksExistentes = existingFeedbacks.filter(f => {
          const fExtId = f.external_id || f.message_external_id;
          return fExtId === externalId;
        });
        
        if (feedbacksExistentes.length > 0) {
          log(`✅ ${feedbacksExistentes.length} feedback(s) encontrado(s) para ${externalId}:`, feedbacksExistentes);
        } else {
          log(`   ❌ Nenhum feedback para ${externalId}`);
        }
        
        // Encontra onde inserir os botões
        const msgContainer = mensagem.querySelector('.msg-container') || mensagem;
        
        // Sempre cria container com botões E badges (se houver)
        const container = document.createElement('div');
        container.className = 'click-feedback-buttons';
        container.setAttribute('data-external-id', externalId);
        
        // Se tem feedbacks existentes, adiciona os badges primeiro
        if (feedbacksExistentes.length > 0) {
          container.classList.add('has-feedback');
          container.style.opacity = '1';
          
          // Container para os badges
          const badgesContainer = document.createElement('div');
          badgesContainer.className = 'click-badges-container';
          
          feedbacksExistentes.forEach(feedbackExistente => {
            // A API pode retornar feedback_type como objeto ou as propriedades diretamente
            const feedbackTypeData = feedbackExistente.feedback_type || feedbackExistente;
            const tipo = feedbackTypeData.type || feedbackExistente.type;
            const titulo = feedbackTypeData.title || feedbackExistente.title || 'Feedback';
            const pontos = feedbackTypeData.points ?? feedbackExistente.points ?? 0;
            const notas = feedbackExistente.notes || '';
            
            const classe = tipoParaClasse(tipo);
            const icone = tipoParaIcone(tipo);
            
            log(`📌 Criando badge: tipo=${tipo}, titulo=${titulo}, classe=${classe}`);
            
            const badge = document.createElement('span');
            badge.className = `click-feedback-badge ${classe}`;
            badge.textContent = `${icone} ${titulo}`;
            badge.title = notas || `${pontos > 0 ? '+' : ''}${pontos} pontos`;
            
            badgesContainer.appendChild(badge);
          });
          
          container.appendChild(badgesContainer);
          log(`✅ ${feedbacksExistentes.length} badge(s) adicionado(s) para mensagem ${externalId}`);
        }
        
        // Sempre adiciona os botões para poder registrar mais feedbacks
        const botoesWrapper = document.createElement('div');
        botoesWrapper.className = 'click-feedback-actions';
        
        const tipos = ['erro', 'atencao', 'acerto'];
        const labels = ['Erro', 'Atenção', 'Acerto'];

        tipos.forEach((tipo, index) => {
          const btn = document.createElement('button');
          btn.className = `click-feedback-btn ${tipo}`;
          btn.textContent = labels[index];
          btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            const idAtual = container.getAttribute('data-external-id');
            log('🔍 Botão clicado:', tipo, '| External ID:', idAtual);
            
            abrirModal(tipo, idAtual, mensagem);
          });
          botoesWrapper.appendChild(btn);
        });
        
        container.appendChild(botoesWrapper);
        
        if (msgContainer !== mensagem && msgContainer.parentNode) {
          msgContainer.parentNode.insertBefore(container, msgContainer.nextSibling);
        } else {
          mensagem.appendChild(container);
        }
        
        mensagem.classList.add('click-message-container');
        mensagensProcessadas.set(externalId, mensagem);
      });
    } catch (e) {
      logError('Erro ao processar mensagens:', e);
    }
  }

  // ============================================
  // Observer para Novas Mensagens
  // ============================================

  function iniciarObserver() {
    try {
      const observer = new MutationObserver((mutations) => {
        let devProcessar = false;
        
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (node.nodeType === 1) {
                if (node.classList && 
                    (node.classList.contains('novo-display-teste') || 
                     node.classList.contains('msg-container') ||
                     node.classList.contains('row_msg'))) {
                  devProcessar = true;
                  break;
                }
                if (node.querySelector && node.querySelector('.novo-display-teste, .msg-container')) {
                  devProcessar = true;
                  break;
                }
              }
            }
          }
          if (devProcessar) break;
        }

        if (devProcessar) {
          clearTimeout(window.clickFeedbackTimeout);
          window.clickFeedbackTimeout = setTimeout(processarMensagens, 500);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      log('Observer iniciado');
      return observer;
    } catch (e) {
      logError('Erro ao iniciar observer:', e);
    }
  }

  // Detecta mudança de chat (URL)
  function iniciarObserverURL() {
    let urlAtual = window.location.href;
    
    setInterval(async () => {
      if (window.location.href !== urlAtual) {
        log('URL mudou! Recarregando feedbacks e áudios transcritos...');
        urlAtual = window.location.href;
        
        // Limpa estado
        inicializacaoCompleta = false; // Bloqueia processamento até recarregar
        existingFeedbacks = [];
        chatHistoryId = null;
        transcribedAudioIds = []; // Limpa lista de áudios transcritos
        mensagensProcessadas.clear();
        
        // Remove botões existentes
        document.querySelectorAll('.click-feedback-buttons').forEach(el => el.remove());
        document.querySelectorAll('.click-message-container').forEach(el => {
          el.classList.remove('click-message-container');
        });
        
        // Recarrega feedbacks e áudios transcritos para o novo chat
        await Promise.all([
          carregarFeedbacksExistentes(),
          carregarAudiosJaTranscritos()
        ]);
        
        // Marca como completa após recarregar
        inicializacaoCompleta = true;
        log('✅ Dados recarregados para novo chat.');
        
        // Aguarda mensagens carregarem e processa
        setTimeout(processarMensagens, 1000);
      }
    }, 1000);
  }

  // ============================================
  // Análise com IA (Claude)
  // ============================================

  function criarBotaoAnalisarIA() {
    // Remove botão existente se houver
    const existente = document.querySelector('.click-ai-analyze-btn');
    if (existente) existente.remove();
    
    const btn = document.createElement('button');
    btn.className = 'click-ai-analyze-btn';
    btn.innerHTML = '🤖 Analisar com IA';
    btn.onclick = iniciarAnaliseIA;
    document.body.appendChild(btn);
    
    log('🤖 Botão de análise IA criado');
    return btn;
  }

  async function iniciarAnaliseIA() {
    const btn = document.querySelector('.click-ai-analyze-btn');
    if (!btn) return;
    
    // Captura a URL IMEDIATAMENTE (antes de qualquer processamento async)
    const chatUrlOriginal = getChatUrl();
    log('🔗 Chat URL capturada para análise IA:', chatUrlOriginal);
    
    btn.disabled = true;
    btn.innerHTML = '⏳ Carregando chat...';
    
    try {
      // 1. Carrega todo o chat
      log('🤖 Passo 1: Carregando todas as mensagens...');
      await carregarTodasMensagens();
      
      // 2. Captura snapshot
      log('🤖 Passo 2: Capturando snapshot do chat...');
      const snapshot = capturarSnapshotDoChat();
      log(`🤖 Snapshot: ${snapshot.mensagens.length} mensagens, ${snapshot.audios.length} áudios`);
      
      // 3. Verifica se há mensagens do atendente
      const mensagensAtendente = snapshot.mensagens.filter(m => m.is_sent);
      if (mensagensAtendente.length === 0) {
        mostrarToast('⚠️ Nenhuma mensagem do atendente encontrada', 'info');
        return;
      }
      
      log(`🤖 Mensagens do atendente: ${mensagensAtendente.length}`);
      
      // 4. Transcreve os áudios (IMPORTANTE para análise correta!)
      if (snapshot.audios.length > 0) {
        btn.innerHTML = `🎙️ Transcrevendo ${snapshot.audios.length} áudios...`;
        mostrarToast(`🎙️ Transcrevendo ${snapshot.audios.length} áudios...`, 'info');
        log(`🤖 Passo 3: Transcrevendo ${snapshot.audios.length} áudios...`);
        
        let transcritosCount = 0;
        for (const audioInfo of snapshot.audios) {
          // Verifica se já foi transcrito antes (economia de custo)
          if (audioJaTranscrito(audioInfo.externalId)) {
            log(`💰 Áudio ${audioInfo.externalId} já transcrito anteriormente - PULANDO`);
            const msgIndex = snapshot.mensagens.findIndex(m => m.external_id === audioInfo.externalId);
            if (msgIndex !== -1) {
              snapshot.mensagens[msgIndex].content = '[Áudio - já transcrito anteriormente]';
            }
            continue;
          }
          
          btn.innerHTML = `🎙️ Transcrevendo ${transcritosCount + 1}/${snapshot.audios.length}...`;
          log(`🎙️ Transcrevendo áudio: ${audioInfo.externalId}`);
          
          const transcricao = await transcreverAudioPorExternalId(audioInfo.externalId, audioInfo.url);
          
          if (transcricao) {
            // Atualiza a mensagem no snapshot com a transcrição
            const msgIndex = snapshot.mensagens.findIndex(m => m.external_id === audioInfo.externalId);
            if (msgIndex !== -1) {
              snapshot.mensagens[msgIndex].transcription = transcricao;
              snapshot.mensagens[msgIndex].content = `[Áudio transcrito]: "${transcricao}"`;
            }
            transcritosCount++;
            log(`✅ Áudio transcrito: ${transcricao.substring(0, 50)}...`);
          } else {
            log(`⚠️ Falha ao transcrever áudio: ${audioInfo.externalId}`);
          }
          
          // Pequeno delay entre transcrições
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        log(`🤖 Transcrição concluída: ${transcritosCount}/${snapshot.audios.length} áudios`);
        mostrarToast(`✅ ${transcritosCount} áudios transcritos!`, 'success');
      }
      
      btn.innerHTML = '🔍 Analisando com IA...';
      
      // 5. Busca feedbacks históricos para treinar a IA
      log('🤖 Passo 4: Buscando feedbacks históricos...');
      await carregarFeedbacksHistoricos();
      
      // 6. Envia para Claude
      log('🤖 Passo 5: Enviando para análise da IA...');
      mostrarToast('🤖 Analisando conversa com IA...', 'info');
      
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeWithClaude',
        chatHistory: snapshot.mensagens,
        feedbackTypes: feedbackTypes,
        historicalFeedbacks: historicalFeedbacks
      });
      
      log('🤖 Resposta da IA:', response);
      
      if (response.success) {
        if (response.suggestions && response.suggestions.length > 0) {
          log(`🤖 ${response.suggestions.length} sugestões recebidas`);
          abrirModalRevisaoIA(response.suggestions, chatUrlOriginal);
        } else {
          mostrarToast('✅ Nenhum feedback sugerido pela IA', 'success');
        }
      } else {
        logError('Erro na análise IA:', response.error);
        mostrarToast('❌ Erro: ' + (response.error || 'Falha na análise'), 'error');
      }
      
    } catch (error) {
      logError('Erro na análise IA:', error);
      mostrarToast('❌ Erro na análise com IA', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🤖 Analisar com IA';
    }
  }

  function abrirModalRevisaoIA(sugestoes, chatUrlOriginal) {
    log('🤖 Abrindo modal de revisão com', sugestoes.length, 'sugestões');
    log('🔗 Chat URL original:', chatUrlOriginal);
    
    // Remove modal existente se houver
    const modalExistente = document.querySelector('.click-ai-modal');
    if (modalExistente) modalExistente.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'click-modal-overlay click-ai-modal active';
    
    // Gera HTML das sugestões
    const sugestoesHTML = sugestoes.map((sug, idx) => {
      // Encontra o tipo de feedback para pegar a classe correta
      const feedbackType = feedbackTypes.find(ft => ft.id === sug.feedback_type_id);
      const tipo = feedbackType?.type || 'attention';
      const classe = tipoParaClasse(tipo);
      const icone = tipoParaIcone(tipo);
      
      const preview = sug.message_preview || sug.reason?.substring(0, 100) || '';
      
      return `
        <div class="click-ai-suggestion" data-index="${idx}" data-external-id="${sug.external_id}" data-feedback-type-id="${sug.feedback_type_id}">
          <div class="click-ai-suggestion-header">
            <span class="click-ai-suggestion-type ${classe}">
              ${icone} ${sug.feedback_type_title || 'Feedback'}
            </span>
            <div class="click-ai-suggestion-actions">
              <button class="click-ai-approve" title="Aprovar">✓</button>
              <button class="click-ai-reject" title="Rejeitar">✕</button>
            </div>
          </div>
          <div class="click-ai-suggestion-message">"${preview.substring(0, 150)}${preview.length > 150 ? '...' : ''}"</div>
          <div class="click-ai-suggestion-reason">
            <strong>Motivo:</strong> ${sug.reason || 'Sem motivo especificado'}
          </div>
        </div>
      `;
    }).join('');
    
    overlay.innerHTML = `
      <div class="click-modal click-ai-review-modal">
        <div class="click-modal-header">
          <div class="click-modal-title">
            <span class="click-modal-title-icon" style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);">🤖</span>
            <span>Sugestões da IA (${sugestoes.length})</span>
          </div>
          <button class="click-modal-close">✕</button>
        </div>
        <div class="click-modal-body">
          <p class="click-ai-instructions">
            Revise cada sugestão e aprove (✓) ou rejeite (✕) os feedbacks. 
            Os feedbacks aprovados serão registrados automaticamente.
          </p>
          <div class="click-ai-suggestions-list">
            ${sugestoesHTML}
          </div>
        </div>
        <div class="click-modal-footer">
          <button class="click-btn click-btn-cancel">Fechar</button>
          <button class="click-btn click-btn-submit click-ai-apply-all">
            Aplicar Aprovados (0)
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Estado das sugestões (null = não decidido, true = aprovado, false = rejeitado)
    const estadoSugestoes = sugestoes.map(() => null);
    
    // Função para atualizar contador
    function atualizarContadorAprovados() {
      const aprovados = estadoSugestoes.filter(s => s === true).length;
      const btnAplicar = overlay.querySelector('.click-ai-apply-all');
      if (btnAplicar) {
        btnAplicar.textContent = `Aplicar Aprovados (${aprovados})`;
        btnAplicar.disabled = aprovados === 0;
      }
    }
    
    // Event listeners - fechar modal
    overlay.querySelector('.click-modal-close').onclick = () => overlay.remove();
    overlay.querySelector('.click-btn-cancel').onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
    
    // Event listeners - aprovar
    overlay.querySelectorAll('.click-ai-approve').forEach((btn, idx) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        estadoSugestoes[idx] = true;
        const card = btn.closest('.click-ai-suggestion');
        card.classList.add('approved');
        card.classList.remove('rejected');
        atualizarContadorAprovados();
        log(`🤖 Sugestão ${idx} aprovada`);
      };
    });
    
    // Event listeners - rejeitar
    overlay.querySelectorAll('.click-ai-reject').forEach((btn, idx) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        estadoSugestoes[idx] = false;
        const card = btn.closest('.click-ai-suggestion');
        card.classList.add('rejected');
        card.classList.remove('approved');
        atualizarContadorAprovados();
        log(`🤖 Sugestão ${idx} rejeitada`);
      };
    });
    
    // Event listener - aplicar aprovados
    overlay.querySelector('.click-ai-apply-all').onclick = async () => {
      const aprovados = sugestoes.filter((_, idx) => estadoSugestoes[idx] === true);
      
      if (aprovados.length === 0) {
        mostrarToast('⚠️ Nenhum feedback aprovado', 'info');
        return;
      }
      
      const btnAplicar = overlay.querySelector('.click-ai-apply-all');
      btnAplicar.disabled = true;
      btnAplicar.textContent = '⏳ Identificando atendente...';
      
      try {
        let sucessos = 0;
        const registeredBy = extrairNomeResponsavel();
        
        // MELHORIA: Identifica o atendente principal do chat uma única vez
        let atendentePrincipalId = null;
        let atendentePrincipalNome = null;
        
        // Tenta encontrar o atendente em várias mensagens enviadas
        const mensagensEnviadas = document.querySelectorAll('.novo-display-teste.enviada, .msg-container.bg-sent-msg');
        log(`🔍 Buscando atendente em ${mensagensEnviadas.length} mensagens enviadas...`);
        
        for (const msg of mensagensEnviadas) {
          // Primeiro tenta abrir as informações da mensagem
          await abrirInfoMensagem(msg);
          
          const nomeAtendente = extrairNomeAtendenteDaMensagem(msg);
          if (nomeAtendente) {
            const agenteEncontrado = encontrarAtendentePorNome(nomeAtendente);
            if (agenteEncontrado) {
              atendentePrincipalId = agenteEncontrado.id;
              atendentePrincipalNome = agenteEncontrado.full_name;
              log(`✅ Atendente identificado: ${atendentePrincipalNome} (ID: ${atendentePrincipalId})`);
              break;
            }
          }
        }
        
        // Se não encontrou, tenta nas mensagens específicas dos feedbacks
        if (!atendentePrincipalId) {
          for (const sug of aprovados) {
            const elementoMensagem = encontrarContainerMensagem(sug.external_id);
            if (elementoMensagem) {
              await abrirInfoMensagem(elementoMensagem);
              const nomeAtendente = extrairNomeAtendenteDaMensagem(elementoMensagem);
              if (nomeAtendente) {
                const agenteEncontrado = encontrarAtendentePorNome(nomeAtendente);
                if (agenteEncontrado) {
                  atendentePrincipalId = agenteEncontrado.id;
                  atendentePrincipalNome = agenteEncontrado.full_name;
                  log(`✅ Atendente identificado via feedback: ${atendentePrincipalNome}`);
                  break;
                }
              }
            }
          }
        }
        
        // ÚLTIMO RECURSO: Se não encontrou, mostra aviso e cancela
        if (!atendentePrincipalId) {
          mostrarToast('⚠️ Não foi possível identificar o atendente. Registre manualmente.', 'error');
          btnAplicar.disabled = false;
          btnAplicar.textContent = `Aplicar Aprovados (${aprovados.length})`;
          logError('Atendente não identificado em nenhuma mensagem do chat');
          return;
        }
        
        btnAplicar.textContent = '⏳ Aplicando...';
        mostrarToast(`👤 Registrando feedbacks para: ${atendentePrincipalNome}`, 'info');
        
        for (const sug of aprovados) {
          // Monta a nota com o motivo da IA
          const notaCompleta = `[IA] ${sug.reason || 'Sugerido pela IA'}`;
          
          log(`🤖 Registrando feedback para: ${sug.external_id} | Atendente: ${atendentePrincipalNome}`);
          
          const result = await criarFeedback(
            sug.external_id,
            sug.feedback_type_id,
            atendentePrincipalId,
            notaCompleta,
            [], // chatHistory - não precisa reenviar
            [], // audioTranscriptions
            registeredBy,
            chatUrlOriginal // Passa o chatUrl original capturado no início da análise
          );
          
          if (result.success) {
            sucessos++;
            
            // Adiciona à lista de feedbacks existentes
            existingFeedbacks.push({
              external_id: sug.external_id,
              feedback_type: feedbackTypes.find(ft => ft.id === sug.feedback_type_id),
              notes: notaCompleta
            });
          } else {
            logError(`Erro ao registrar feedback: ${result.error}`);
          }
          
          // Pequeno delay entre registros
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        if (sucessos > 0) {
          mostrarToast(`✅ ${sucessos} feedback(s) registrado(s) para ${atendentePrincipalNome}!`, 'success');
          
          // Reprocessa mensagens para mostrar badges
          mensagensProcessadas.clear();
          processarMensagens();
        } else {
          mostrarToast('❌ Nenhum feedback foi registrado', 'error');
        }
        
        overlay.remove();
        
      } catch (error) {
        logError('Erro ao aplicar feedbacks:', error);
        mostrarToast('❌ Erro ao registrar feedbacks', 'error');
        btnAplicar.disabled = false;
        btnAplicar.textContent = `Aplicar Aprovados (${aprovados.length})`;
      }
    };
    
    // Inicializa contador
    atualizarContadorAprovados();
  }

  // ============================================
  // Exportar Chat em Markdown
  // ============================================

  function criarBotaoExportarMarkdown() {
    // Remove botão existente se houver
    const existente = document.querySelector('.click-export-md-btn');
    if (existente) existente.remove();
    
    const btn = document.createElement('button');
    btn.className = 'click-export-md-btn';
    btn.innerHTML = '📥 Exportar Chat';
    btn.onclick = iniciarExportacaoMarkdown;
    document.body.appendChild(btn);
    
    log('📥 Botão de exportar Markdown criado');
    return btn;
  }

  async function iniciarExportacaoMarkdown() {
    const btn = document.querySelector('.click-export-md-btn');
    if (!btn) return;
    
    btn.disabled = true;
    btn.innerHTML = '⏳ Carregando...';
    
    try {
      // 1. Carrega todas as mensagens do chat
      log('📥 Passo 1: Carregando todas as mensagens...');
      mostrarToast('📜 Carregando histórico completo...', 'info');
      await carregarTodasMensagens();
      
      btn.innerHTML = '🎙️ Transcrevendo áudios...';
      
      // 2. Captura snapshot do chat
      log('📥 Passo 2: Capturando snapshot do chat...');
      const snapshot = capturarSnapshotDoChat();
      log(`📥 Snapshot: ${snapshot.mensagens.length} mensagens, ${snapshot.audios.length} áudios`);
      
      // 3. Transcreve os áudios (se houver)
      if (snapshot.audios.length > 0) {
        mostrarToast(`🎙️ Transcrevendo ${snapshot.audios.length} áudios...`, 'info');
        
        let transcritosCount = 0;
        for (const audioInfo of snapshot.audios) {
          log(`📥 Transcrevendo áudio ${audioInfo.externalId}...`);
          btn.innerHTML = `🎙️ Transcrevendo ${transcritosCount + 1}/${snapshot.audios.length}...`;
          
          const transcricao = await transcreverAudioPorExternalId(audioInfo.externalId, audioInfo.url);
          
          if (transcricao) {
            // Atualiza a mensagem no snapshot
            const msgIndex = snapshot.mensagens.findIndex(m => m.external_id === audioInfo.externalId);
            if (msgIndex !== -1) {
              snapshot.mensagens[msgIndex].transcription = transcricao;
              snapshot.mensagens[msgIndex].content = `🎤 **[Áudio transcrito]:** ${transcricao}`;
            }
            transcritosCount++;
          }
          
          // Pequeno delay entre transcrições
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        log(`📥 ${transcritosCount} áudios transcritos`);
      }
      
      btn.innerHTML = '📝 Gerando Markdown...';
      
      // 4. Gera o Markdown
      const markdown = gerarMarkdownDoChat(snapshot);
      
      // 5. Faz o download
      downloadMarkdown(markdown, snapshot);
      
      mostrarToast('✅ Chat exportado com sucesso!', 'success');
      
    } catch (error) {
      logError('Erro ao exportar chat:', error);
      mostrarToast('❌ Erro ao exportar chat', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '📥 Exportar Chat';
    }
  }

  function gerarMarkdownDoChat(snapshot) {
    const linhas = [];
    
    // Título e metadados
    linhas.push(`# 💬 Histórico do Chat`);
    linhas.push('');
    linhas.push(`**URL:** ${snapshot.chatUrl}`);
    linhas.push(`**Data de exportação:** ${formatarDataHora()}`);
    linhas.push(`**Total de mensagens:** ${snapshot.mensagens.length}`);
    linhas.push('');
    linhas.push('---');
    linhas.push('');
    
    // Mensagens
    for (const msg of snapshot.mensagens) {
      // Identifica o remetente
      let remetenteLabel;
      let emoji;
      
      if (msg.is_sent) {
        // Mensagem da equipe/atendente
        remetenteLabel = msg.sender && msg.sender !== 'atendente' 
          ? `👨‍💼 **Equipe (${msg.sender})**` 
          : '👨‍💼 **Equipe**';
        emoji = '🟢';
      } else {
        // Mensagem do paciente/cliente
        remetenteLabel = '🧑 **Paciente**';
        emoji = '🔵';
      }
      
      // Timestamp
      const hora = msg.timestamp ? ` _${msg.timestamp}_` : '';
      
      // Linha do remetente
      linhas.push(`### ${emoji} ${remetenteLabel}${hora}`);
      linhas.push('');
      
      // Conteúdo da mensagem
      let conteudo = msg.content || '[Mensagem sem conteúdo]';
      
      // Se tem transcrição de áudio, usa ela
      if (msg.transcription) {
        conteudo = `🎤 **[Áudio transcrito]:** ${msg.transcription}`;
      } else if (msg.type === 'audio' && !msg.transcription) {
        conteudo = '🎤 _[Áudio - não foi possível transcrever]_';
      } else if (msg.type === 'image') {
        conteudo = '📷 _[Imagem]_';
      }
      
      linhas.push(`> ${conteudo}`);
      linhas.push('');
    }
    
    // Rodapé
    linhas.push('---');
    linhas.push('');
    linhas.push(`_Exportado automaticamente pela extensão ChatGuru Feedback - Click Cannabis_`);
    
    return linhas.join('\n');
  }

  function downloadMarkdown(markdown, snapshot) {
    // Gera nome do arquivo com data/hora
    const agora = new Date();
    const dataFormatada = agora.toISOString().slice(0, 10); // YYYY-MM-DD
    const horaFormatada = agora.toTimeString().slice(0, 5).replace(':', 'h'); // HHhMM
    
    // Tenta extrair identificador do chat da URL
    let identificadorChat = 'chat';
    try {
      const urlMatch = snapshot.chatUrl.match(/\/chat\/([^\/\?]+)/);
      if (urlMatch && urlMatch[1]) {
        identificadorChat = urlMatch[1].substring(0, 20); // Limita tamanho
      }
    } catch (e) { /* usa default */ }
    
    const nomeArquivo = `chat_${identificadorChat}_${dataFormatada}_${horaFormatada}.md`;
    
    // Cria o blob e faz download
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Libera a URL
    URL.revokeObjectURL(url);
    
    log(`📥 Arquivo ${nomeArquivo} baixado`);
  }

  // ============================================
  // Inicialização
  // ============================================

  async function init() {
    log('🚀 Iniciando extensão...');
    log('📍 URL:', window.location.href);
    
    try {
      // Carrega dados da API em paralelo
      await Promise.all([
        carregarFeedbackTypes(),
        carregarAgents(),
        carregarFeedbacksExistentes(),
        carregarAudiosJaTranscritos()
      ]);
      
      log('✅ Dados carregados da API');
      log(`   - ${feedbackTypes.length} tipos de feedback`);
      log(`   - ${agents.length} atendentes`);
      log(`   - ${existingFeedbacks.length} feedbacks existentes`);
      log(`   - ${transcribedAudioIds.length} áudios já transcritos`);
      
      // Marca inicialização como completa ANTES de processar
      inicializacaoCompleta = true;
      log('✅ Inicialização completa! Agora pode processar mensagens.');
      
      // Processa mensagens existentes
      processarMensagens();
      
      // Inicia observers
      iniciarObserver();
      iniciarObserverURL();
      
      // Cria botão de análise com IA
      criarBotaoAnalisarIA();
      
      // Cria botão de exportar Markdown
      criarBotaoExportarMarkdown();
      
      // Reprocessa periodicamente
      setInterval(processarMensagens, 3000);
      
      log('✅ Extensão inicializada com sucesso!');
    } catch (error) {
      logError('Erro na inicialização:', error);
    }
  }

  function aguardarCarregamento() {
    const mensagens = document.querySelectorAll('.novo-display-teste, .msg-container');
    
    if (mensagens.length > 0) {
      log('Mensagens encontradas, iniciando...');
      init();
    } else {
      log('Aguardando mensagens carregarem...');
      setTimeout(aguardarCarregamento, 1000);
    }
  }

  // Inicia quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(aguardarCarregamento, 1500);
    });
  } else {
    setTimeout(aguardarCarregamento, 1500);
  }

})();
