# 08 - Export API (chatguru-api.js)

> Documentação do servidor local Node.js usado para exportação de dados e transcrição de áudios.
> Este código serve como referência de como extrair dados via CDP (Chrome DevTools Protocol).

---

## 8.1 Visão Geral

O `chatguru-api.js` é um servidor **Express** que roda localmente na máquina do Pedro (porta `18900`). Ele atua como um **Proxy Inteligente** entre requisições externas e o browser autenticado.

### Arquitetura
```
┌─────────────┐      HTTP       ┌───────────────────┐      CDP       ┌───────────────────┐
│ Client / n8n│ ──────────────▶ │  chatguru-api.js  │ ─────────────▶ │ Browser OpenClaw  │
└─────────────┘   (Port 18900)  │  (Node.js Server) │  (Port 18800)  │ (Tab Autenticada) │
                                └─────────┬─────────┘                └───────────────────┘
                                          │
                                          │ exec(ffmpeg + whisper)
                                          ▼
                                ┌───────────────────┐
                                │  Áudio Transcrito │
                                └───────────────────┘
```

### Por que existe?
1. **Bypass de Autenticação**: Usa a sessão ativa do browser (cookies).
2. **Transcrição Local**: Processa áudios do WhatsApp usando `whisper-cpp` na CPU local (M1/M2/M3), economizando API costs e mantendo privacidade.
3. **Formatação**: Entrega o chat já formatado para LLMs ou n8n.

---

## 8.2 Instalação e Execução

### Requisitos
- Node.js instalado
- **OpenClaw** rodando com ChatGuru aberto e logado (Porta CDP 18800)
- `ffmpeg` instalado (`brew install ffmpeg`)
- `whisper-cpp` instalado (`brew install whisper-cpp`) e modelo `ggml-base.bin`

### Inicialização
```bash
# No workspace
node chatguru-api.js
```
*Servidor inicia em http://localhost:18900*

---

## 8.3 Endpoints Disponíveis

### 8.3.1 Dashboard (`GET /api/dashboard`)
Retorna o JSON do dashboard de chats não resolvidos.
```json
{
  "total_unresolved": 103198,
  "groups": [...]
}
```

### 8.3.2 Listar Chats (`GET /api/chats`)
Lista chats aplicando filtros padrão (Status=ABERTO, Limit=50).
- Query Params:
  - `status`: Filtro de status (ex: EM ATENDIMENTO)
  - `limit`: Quantidade (max 100)

### 8.3.3 Histórico Completo (`GET /api/chat/:chatId/export`)
Exporta todo o histórico do chat. Itera automaticamente por todas as páginas de mensagens.
- Query Params:
  - `format`: `json` (padrão) ou `text` (txt formatado para leitura humana)
  - `transcribe`: `true` (transcreve áudios usando Whisper - LENTO)

**Exemplo de Output (Text Format):**
```text
[2026-02-02 10:00] Agente (Rogério): Bom dia! Como posso ajudar?
[2026-02-02 10:02] Lead (Maria): Gostaria de saber o preço.
[2026-02-02 10:03] Lead (Maria): [ÁUDIO TRANSCRITO: "Eu vi no Instagram a promoção de 3 frascos..."]
```

---

## 8.4 Transcrição de Áudio (Whisper)

A funcionalidade mais complexa deste servidor é a transcrição offline.

### Fluxo de Transcrição:
1. **Identificação**: API detecta mensagem do tipo `audio` ou `ptt`.
2. **Download**: Baixa o arquivo `.ogg` ou `.opus` do S3 (usando headers `Referer: chatguru.app` para passar na proteção).
3. **Conversão**: Usa `ffmpeg` para converter para WAV 16kHz mono (formato exigido pelo Whisper).
   ```bash
   ffmpeg -y -i input.ogg -ar 16000 -ac 1 -c:a pcm_s16le output.wav
   ```
4. **Inferência**: Executa `whisper-cli` no arquivo WAV.
   ```bash
   whisper-cli -m models/ggml-base.bin -l pt -f output.wav --no-timestamps
   ```
5. **Injeção**: O texto transcrito é inserido no objeto da mensagem no campo `transcription`.

---

## 8.5 Snippets Importantes (CDP Bridge)

Como o servidor Node.js fala com o Browser:

```javascript
/**
 * Executa JavaScript no contexto da aba do ChatGuru via CDP
 */
async function cdpEval(expression) {
  // 1. Conecta no WebSocket do Chrome
  const target = await findChatGuruTarget(); // Busca aba com URL chatguru
  const ws = new WebSocket(target.webSocketDebuggerUrl);

  // 2. Envia comando Runtime.evaluate
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: `(async () => { ${expression} })()`,
      returnByValue: true,
      awaitPromise: true
    }
  }));

  // 3. Aguarda resposta
  // ... (promisify logic)
}

/**
 * Faz fetch dentro do browser (herdando cookies)
 */
async function chatguruFetch(url) {
  const code = `
    const r = await fetch('${url}', { credentials: 'include' });
    return await r.json();
  `;
  return await cdpEval(code);
}
```

---

## 8.6 Considerações para a Extensão

A extensão Chrome **NÃO** terá acesso ao servidor Node.js nem ao `whisper-cli` localmente de forma direta (sandbox do Chrome).

1. **Adaptação**: A extensão deve usar `fetch` nativo do browser (como documentado em `06-api-endpoints.md`), não precisa de CDP.
2. **Transcrição**: 
   - A extensão NÃO conseguirá transcrever áudios offline facilmente.
   - **Solução**: A extensão pode enviar a URL do áudio para um servidor externo (como este `chatguru-api.js` se exposto, ou n8n) para transcrever, ou usar uma API paga (OpenAI Whisper).
   - **Alternativa**: WebAssembly (WASM) do Whisper rodando no browser (pesado, mas possível).

---

*Documento atualizado em 02/02/2026*
