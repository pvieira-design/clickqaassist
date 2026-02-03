// ============================================
// Background Script - ChatGuru Feedback Extension
// Responsável por baixar áudios (bypass CORS)
// e análise com IA (Claude)
// ============================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const WHISPER_API_URL = 'https://api.openai.com/v1/audio/transcriptions';

// Claude API
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// ============================================
// Documentação de Treinamento (Base de Conhecimento)
// ============================================
importScripts('documentacao.js');

// Cache de transcrições
const transcriptionCache = new Map();

// Listener para mensagens do content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'transcribeAudio') {
    handleTranscription(request.audioUrl)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    // Retorna true para indicar que a resposta será assíncrona
    return true;
  }
  
  if (request.action === 'transcribeMultipleAudios') {
    handleMultipleTranscriptions(request.audios)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true;
  }
  
  // Nova action: transcrever áudio já baixado (em base64)
  if (request.action === 'transcribeBlob') {
    handleBlobTranscription(request.audioData)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true;
  }
  
  // Nova action: obter URL pré-assinada com cookies
  if (request.action === 'getPresignedUrl') {
    getPresignedUrl(request.downloadUrl, request.cookies)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true;
  }
  
  // Nova action: analisar chat com Claude AI
  if (request.action === 'analyzeWithClaude') {
    analyzeWithClaude(request.chatHistory, request.feedbackTypes, request.historicalFeedbacks || [])
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true;
  }
});

// Transcreve áudio já baixado (recebido em base64)
async function handleBlobTranscription(base64Data) {
  console.log('[Background] Transcrevendo áudio (base64), tamanho:', base64Data.length);
  
  try {
    // Converte base64 para Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    
    // Detecta o tipo baseado nos primeiros bytes ou usa webm como padrão
    let mimeType = 'audio/webm';
    let fileName = 'audio.webm';
    
    // Se parece com OGG
    if (byteArray[0] === 0x4F && byteArray[1] === 0x67 && byteArray[2] === 0x67 && byteArray[3] === 0x53) {
      mimeType = 'audio/ogg';
      fileName = 'audio.ogg';
    }
    
    const audioBlob = new Blob([byteArray], { type: mimeType });
    
    console.log('[Background] Blob criado, tamanho:', audioBlob.size, 'tipo:', mimeType);
    
    // Envia para a API Whisper
    console.log('[Background] Enviando para Whisper...');
    const formData = new FormData();
    formData.append('file', audioBlob, fileName);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    
    const whisperResponse = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Erro na API Whisper: ${whisperResponse.status} - ${errorText}`);
    }
    
    const data = await whisperResponse.json();
    const transcription = data.text;
    
    console.log('[Background] Transcrição recebida:', transcription);
    
    return { success: true, transcription };
    
  } catch (error) {
    console.error('[Background] Erro na transcrição do blob:', error);
    return { success: false, error: error.message };
  }
}

// Transcreve um único áudio
async function handleTranscription(audioUrl) {
  console.log('[Background] Transcrevendo áudio:', audioUrl);
  
  // Verifica cache
  if (transcriptionCache.has(audioUrl)) {
    console.log('[Background] Transcrição em cache');
    return { success: true, transcription: transcriptionCache.get(audioUrl) };
  }
  
  try {
    // Baixa o áudio (background script não tem limitação CORS)
    console.log('[Background] Baixando áudio...');
    const audioResponse = await fetch(audioUrl);
    
    if (!audioResponse.ok) {
      throw new Error(`Erro ao baixar áudio: ${audioResponse.status} ${audioResponse.statusText}`);
    }
    
    const audioBlob = await audioResponse.blob();
    console.log('[Background] Áudio baixado, tamanho:', audioBlob.size);
    
    // Envia para a API Whisper
    console.log('[Background] Enviando para Whisper...');
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    
    const whisperResponse = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: formData
    });
    
    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Erro na API Whisper: ${whisperResponse.status} - ${errorText}`);
    }
    
    const data = await whisperResponse.json();
    const transcription = data.text;
    
    console.log('[Background] Transcrição recebida:', transcription);
    
    // Salva no cache
    transcriptionCache.set(audioUrl, transcription);
    
    return { success: true, transcription };
    
  } catch (error) {
    console.error('[Background] Erro na transcrição:', error);
    return { success: false, error: error.message };
  }
}

// Transcreve múltiplos áudios
async function handleMultipleTranscriptions(audios) {
  console.log('[Background] Transcrevendo', audios.length, 'áudios...');
  
  const results = [];
  
  for (const audioInfo of audios) {
    const result = await handleTranscription(audioInfo.url);
    
    results.push({
      external_id: audioInfo.externalId,
      audio_url: audioInfo.url,
      transcription: result.success ? result.transcription : null,
      error: result.error || null
    });
    
    // Pequeno delay entre transcrições
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  const successCount = results.filter(r => r.transcription).length;
  console.log('[Background] Transcrições concluídas:', successCount, '/', audios.length);
  
  return { success: true, results };
}

// Obtém a URL pré-assinada fazendo requisição com cookies
async function getPresignedUrl(downloadUrl, cookies) {
  console.log('[Background] Obtendo URL pré-assinada:', downloadUrl);
  console.log('[Background] Cookies:', cookies.substring(0, 100) + '...');
  
  try {
    // Faz a requisição com os cookies no header
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookies
      },
      redirect: 'follow'
    });
    
    console.log('[Background] Response status:', response.status);
    console.log('[Background] Response URL (após redirects):', response.url);
    
    // Se a URL final contém a assinatura AWS, retorna ela
    if (response.url && response.url.includes('X-Amz-Signature')) {
      console.log('[Background] ✅ URL pré-assinada encontrada no redirect!');
      return { success: true, presignedUrl: response.url };
    }
    
    // Tenta extrair a URL do corpo da resposta
    const text = await response.text();
    console.log('[Background] Response body (primeiros 500 chars):', text.substring(0, 500));
    
    // Procura por URL com assinatura AWS no corpo
    const urlMatch = text.match(/(https:\/\/[^"'\s<>]+X-Amz-Signature[^"'\s<>]+)/);
    if (urlMatch) {
      const presignedUrl = urlMatch[1].replace(/&amp;/g, '&');
      console.log('[Background] ✅ URL pré-assinada encontrada no body!');
      return { success: true, presignedUrl };
    }
    
    // Tenta parsear como JSON
    try {
      const json = JSON.parse(text);
      if (json.url) {
        console.log('[Background] ✅ URL encontrada no JSON!');
        return { success: true, presignedUrl: json.url };
      }
      if (json.data && json.data.url) {
        console.log('[Background] ✅ URL encontrada no JSON (data.url)!');
        return { success: true, presignedUrl: json.data.url };
      }
    } catch (e) {
      // Não é JSON
    }
    
    console.log('[Background] ⚠️ URL pré-assinada não encontrada');
    return { success: false, error: 'URL pré-assinada não encontrada na resposta' };
    
  } catch (error) {
    console.error('[Background] Erro ao obter URL pré-assinada:', error);
    return { success: false, error: error.message };
  }
}

// ============================================
// Análise com Claude AI
// ============================================

async function analyzeWithClaude(chatHistory, feedbackTypes, historicalFeedbacks = []) {
  console.log('[Background] Analisando chat com Claude...');
  console.log('[Background] Mensagens:', chatHistory.length);
  console.log('[Background] Tipos de feedback:', feedbackTypes.length);
  console.log('[Background] Feedbacks históricos:', historicalFeedbacks.length);
  
  try {
    // Formata os tipos de feedback para o prompt
    const tiposFormatados = feedbackTypes.map(ft => 
      `- ID: "${ft.id}" | Título: "${ft.title}" | Tipo: ${ft.type} | Pontos: ${ft.points}${ft.description ? ` | Descrição: ${ft.description}` : ''}`
    ).join('\n');
    
    // Formata os feedbacks históricos como exemplos (máximo 50 para não sobrecarregar o prompt)
    const exemplosHistoricos = historicalFeedbacks.slice(0, 50).map(fb => {
      const tipo = fb.feedback_type?.type || 'unknown';
      const titulo = fb.feedback_type?.title || 'Desconhecido';
      const notas = fb.notes || '';
      return `- Tipo: ${tipo} | Feedback: "${titulo}" | Motivo: ${notas}`;
    }).join('\n');
    
    // Formata o histórico do chat (apenas mensagens relevantes)
    const chatFormatado = chatHistory.map((msg, idx) => {
      const remetente = msg.is_sent ? 'ATENDENTE' : 'CLIENTE';
      const hora = msg.timestamp || '';
      const conteudo = msg.content || '[Sem conteúdo]';
      return `[${idx}] external_id="${msg.external_id}" | ${remetente} (${hora}): ${conteudo}`;
    }).join('\n');
    
    const systemPrompt = `Você é um analista de qualidade de atendimento da Click Cannabis, a maior plataforma de telemedicina canábica do Brasil.

Sua tarefa é analisar conversas de chat entre pacientes e atendentes humanos, identificando mensagens que merecem feedback de qualidade.

═══════════════════════════════════════════════════════════════
                    TIPOS DE FEEDBACK DISPONÍVEIS
═══════════════════════════════════════════════════════════════
${tiposFormatados}

═══════════════════════════════════════════════════════════════
                    CONTEXTO DO ATENDIMENTO
═══════════════════════════════════════════════════════════════

A Click Cannabis democratiza o acesso à cannabis medicinal no Brasil:
- Consultas online por R$ 50 (mais acessível do mercado)
- +50.000 consultas realizadas, +2.000 avaliações 4.9★ no Google
- Medicamentos entre R$ 260-440 (duram 4-8 meses)
- Prazo de entrega: até 15 dias úteis

FLUXO DO ATENDIMENTO:
1. CLICO (IA "Rafa") → Faz primeiro contato, coleta informações básicas
2. ATENDENTE HUMANO → Assume após 2 interações do Clico
3. O paciente NÃO SABE que mudou de atendente - é conversa contínua

═══════════════════════════════════════════════════════════════
                    ERROS QUE VOCÊ DEVE IDENTIFICAR
═══════════════════════════════════════════════════════════════

🚨 ERRO CRÍTICO 1: SAUDAÇÃO DUPLICADA
O atendente disse "Olá", "Oi", "Boa noite/tarde/dia" quando o Clico já saudou.
- Palavras-chave: "Olá", "Oi", "Boa tarde", "Boa noite", "Bom dia", "Tudo bem?"
- POR QUE É ERRO: Quebra continuidade, paciente percebe que algo mudou

❌ ERRADO:
- "Olá, Laiz! Boa noite. 😉 Meu nome é Mauro..."
- "Oi Stephanie, tudo bem? Me chamo Gabriel..."
- "Oi Douglas, boa noite, tudo bem? Sou o Tiago..."

✅ CORRETO:
- "Muito obrigada por compartilhar. Me chamo Nathalia e vou te ajudar..."
- "Desculpa não me apresentar, meu nome é Andressa 😅"
- "Acabei esquecendo de me apresentar 😁 Me chamo Mauro..."

---

🚨 ERRO CRÍTICO 2: RESPOSTA GENÉRICA / FALTA DE PERSONALIZAÇÃO
O atendente ignorou informações específicas que o paciente compartilhou.
- POR QUE É ERRO: Demonstra falta de atenção, paciente se sente ignorado

❌ ERRADO:
- Paciente disse "Já tomei Canabidiol" → Atendente ignorou e seguiu script
- Paciente disse "Perdi 5kg com jejum" → Atendente não parabenizou a conquista
- Paciente disse "4 anos com dor" → Atendente não mencionou o tempo

✅ CORRETO:
- "Que bom que você já tem experiência com canabidiol! Como foi?"
- "Parabéns pela conquista de perder 5kg! Nosso tratamento pode complementar..."
- "Imagino que 4 anos convivendo com isso não deve ser fácil..."

---

🚨 ERRO CRÍTICO 3: NÃO ENVIOU DEPOIMENTOS DO GOOGLE
Quando o lead diz que vai "pensar", é OBRIGATÓRIO enviar os depoimentos.
- POR QUE É ERRO: Perde oportunidade de conversão futura
- Palavras-chave do paciente: "vou pensar", "preciso pensar", "depois volto", "vou avaliar"

❌ ERRADO:
- Paciente: "Posso pensar e voltar depois?"
- Atendente: "Tudo bem! Boas festas 💫" (FIM sem enviar depoimentos)

✅ CORRETO:
- "Claro! Enquanto você pensa, quero te convidar a ver os depoimentos de quem já passou pelo nosso cuidado..."
- "➡ Google: https://bit.ly/3U6l2iL"

---

🚨 ERRO CRÍTICO 4: INFORMAÇÃO INCORRETA
Afirmações incorretas ou que podem ser propaganda enganosa.

❌ ERRADO:
- "Importados são mais baratos e têm mais qualidade" (simplificação incorreta)
- Dar certezas sobre preços/dosagens específicos antes da consulta
- Afirmar resultados garantidos do tratamento

✅ CORRETO:
- "O médico vai avaliar qual é a melhor opção para o seu caso"
- "Depende da prescrição médica"
- "A variedade de produtos importados é maior, o médico vai indicar o ideal"

---

🚨 ERRO 5: PERGUNTA NÃO RESPONDIDA
O paciente fez uma pergunta e o atendente não respondeu diretamente.

❌ ERRADO:
- Paciente: "Posso agendar para hoje?"
- Atendente: [Enviou link de pagamento sem responder a pergunta]

✅ CORRETO:
- "Deixa eu verificar... Para hoje temos horário às [X]. Quer que envie o link?"

---

🚨 ERRO 6: MENSAGEM SEM GANCHO/PERGUNTA
Terminou a mensagem sem pergunta ou direcionamento claro.
- POR QUE É ERRO: Paciente não sabe como prosseguir, conversa morre

❌ ERRADO:
- "Meu nome é Mauro e estou aqui para te ajudar!" (terminou sem pergunta)

✅ CORRETO:
- "...vou te ajudar. Você já sabe como funciona o processo aqui na Click?"

---

🚨 ERRO 7: DEMORA EXCESSIVA
Mais de 5-10 minutos para responder. Acima de 10 minutos é crítico.
- Observe os timestamps das mensagens para identificar

---

🚨 ERRO 8: FORMATAÇÃO INADEQUADA
- Bloco de texto muito longo (deveria ser separado em múltiplas mensagens)
- Áudio muito curto (<7 segundos) - para mensagens curtas, prefira texto
- Áudio cortado no final (frase incompleta)

═══════════════════════════════════════════════════════════════
                    ACERTOS QUE VOCÊ DEVE IDENTIFICAR
═══════════════════════════════════════════════════════════════

✅ ACERTO: PERSONALIZOU O ATENDIMENTO
Mencionou detalhes específicos que o paciente compartilhou.
- "Vi que você está lidando com ansiedade, insônia e TDAH ao mesmo tempo..."
- "Parabéns pela conquista de perder peso com jejum!"

✅ ACERTO: DEMONSTROU EMPATIA GENUÍNA
Validou sentimentos, compartilhou experiência pessoal relevante.
- "Eu mesmo já sofri com ansiedade e sei como afeta o dia a dia..."
- Não apenas frases genéricas como "imagino que deve ser difícil"

✅ ACERTO: PROATIVIDADE
Antecipou dúvidas antes do paciente perguntar.
- "Você pode pagar agora e agendar para o dia que preferir"
- Ofereceu informação útil sem ser perguntado

✅ ACERTO: SEGUIU PROTOCOLO CORRETAMENTE
- Enviou depoimentos quando lead hesitou
- Perguntou nome do paciente real (quando atendimento é para familiar)
- Respondeu todas as dúvidas antes de avançar

✅ ACERTO: TRANSIÇÃO NATURAL DO CLICO
Se apresentou sem saudação duplicada, continuando a conversa naturalmente.

═══════════════════════════════════════════════════════════════
                    PONTOS DE ATENÇÃO
═══════════════════════════════════════════════════════════════

⚠️ ATENÇÃO: PONTO DE MELHORIA
Não é erro grave, mas poderia ser melhor.
- Mensagem correta mas sem gancho no final
- Resposta correta mas poderia ser mais personalizada
- Processo seguido mas de forma mecânica

⚠️ ATENÇÃO: OPORTUNIDADE PERDIDA
Paciente mencionou algo interessante que não foi explorado.
- "Uma amiga me indicou" → Não perguntou sobre a experiência da amiga
- "Já usei canabidiol" → Não perguntou como foi a experiência

═══════════════════════════════════════════════════════════════
                    REGRAS DE ANÁLISE
═══════════════════════════════════════════════════════════════

1. Analise APENAS mensagens do ATENDENTE (is_sent: true)
2. NÃO analise mensagens do Clico (primeiras mensagens automáticas com "Seja bem-vindo(a) à Click")
3. NÃO registre o mesmo erro múltiplas vezes no mesmo chat (apenas na primeira ocorrência)
4. NÃO seja excessivamente crítico em detalhes irrelevantes
5. Considere o contexto da conversa antes de julgar
6. Use EXATAMENTE os IDs dos tipos de feedback fornecidos
7. Feedbacks devem ser construtivos e acionáveis

O QUE NÃO É ERRO:
- Variações de estilo ("Perfeito!" vs "Ótimo!")
- Uso moderado de emojis
- Pequenas diferenças na ordem das informações
- Erros de digitação menores que não afetam compreensão

PRIORIZAÇÃO (do mais importante ao menos):
1. SEMPRE registre: Saudação duplicada (~35% dos chats têm esse erro)
2. SEMPRE registre: Lead vai pensar e não recebe depoimentos
3. SEMPRE registre: Informação incorreta
4. SEMPRE registre: Pergunta do paciente não respondida
5. Registre quando relevante: Personalização excepcional (acerto)
6. Registre quando relevante: Empatia genuína (acerto)
7. Evite registrar: Pequenas variações de estilo

═══════════════════════════════════════════════════════════════
                    EXEMPLOS DE FEEDBACKS ANTERIORES
═══════════════════════════════════════════════════════════════
${exemplosHistoricos || 'Nenhum exemplo disponível'}

═══════════════════════════════════════════════════════════════
                    FORMATO DE RESPOSTA
═══════════════════════════════════════════════════════════════

Retorne APENAS um JSON array. Para cada feedback sugerido:
[
  {
    "message_index": 5,
    "external_id": "id-exato-da-mensagem",
    "feedback_type_id": "uuid-exato-do-tipo",
    "feedback_type_title": "Título do Tipo",
    "reason": "Explicação clara e construtiva. Se for erro, inclua como deveria ser feito.",
    "message_preview": "Primeiros 100 caracteres da mensagem..."
  }
]

Se não houver nenhum feedback a sugerir, retorne: []`;

    const userPrompt = `Analise o seguinte chat e sugira feedbacks para as mensagens do atendente:

${chatFormatado}

Retorne APENAS o JSON com as sugestões.`;

    console.log('[Background] Enviando para Claude API...');
    
    // Monta o system prompt com a documentação completa
    const fullSystemPrompt = `${MANUAL_ATENDIMENTO}

${GUIA_ANALISE_QUALIDADE}

═══════════════════════════════════════════════════════════════
                    INSTRUÇÕES DE ANÁLISE
═══════════════════════════════════════════════════════════════

${systemPrompt}`;
    
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: fullSystemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      })
    });

    console.log('[Background] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Background] Erro da Claude API:', errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('[Background] Resposta da Claude:', data);
    
    const content = data.content[0].text;
    console.log('[Background] Conteúdo da resposta:', content);
    
    // Tenta parsear o JSON da resposta
    // Procura por array JSON na resposta
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const suggestions = JSON.parse(jsonMatch[0]);
        console.log('[Background] Sugestões parseadas:', suggestions.length);
        return { success: true, suggestions };
      } catch (parseError) {
        console.error('[Background] Erro ao parsear JSON:', parseError);
        return { success: false, error: 'Erro ao parsear resposta da IA: ' + parseError.message };
      }
    }
    
    // Se não encontrou array, pode ser resposta vazia
    if (content.includes('[]') || content.toLowerCase().includes('nenhum feedback')) {
      return { success: true, suggestions: [] };
    }
    
    console.error('[Background] Resposta não contém JSON válido:', content);
    return { success: false, error: 'Resposta da IA não contém sugestões válidas' };
    
  } catch (error) {
    console.error('[Background] Erro na análise com Claude:', error);
    return { success: false, error: error.message };
  }
}

console.log('[Background] ChatGuru Feedback Extension - Background script carregado');


