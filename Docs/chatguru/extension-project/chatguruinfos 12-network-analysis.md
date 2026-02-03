# 12 - Network Analysis

> Análise do tráfego de rede e comportamento assíncrono da aplicação.

---

## 12.1 WebSockets (Pusher)

O ChatGuru usa **Pusher** para atualizações em tempo real (novas mensagens, mudança de status).

- **Host**: `ws-sa1.pusher.com` (ou similar)
- **Porta**: 443 (WSS)
- **Protocolo**: WebSocket (wss)

### Canais Comuns
- `private-user-{USER_ID}`: Eventos específicos do usuário logado.
- `private-chat-{CHAT_ID}`: Eventos de um chat específico.

### Eventos
- `App\Events\NewMessage`: Nova mensagem recebida.
- `App\Events\MessageStatusUpdated`: ACK (enviado/lido).
- `App\Events\ChatStatusUpdated`: Mudança de aberto/fechado.

> **Nota para Extensão**: Interceptar WebSocket é complexo. Para a extensão, é mais seguro confiar em **MutationObserver** no DOM ou fazer **Polling** leve na API `/messages2/...` quando o chat estiver aberto.

---

## 12.2 Requisições HTTP (XHR/Fetch)

### Padrões de Headers
O frontend envia automaticamente os cookies de sessão. Em requisições de modificação (POST/PUT), geralmente o framework (Laravel/Vue) injeta headers CSRF:

- `X-CSRF-TOKEN`: Token anti-CSRF (presente na meta tag `<meta name="csrf-token">`).
- `X-Requested-With`: `XMLHttpRequest`

**Importante**: Ao usar `fetch` na extensão (content script), o browser anexa cookies automaticamente, mas pode ser necessário ler o CSRF token do DOM se a API rejeitar o request.

```javascript
function getCsrfToken() {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
}
```

---

## 12.3 Fluxo de Carregamento de um Chat

1. **User clica no chat** (Evento UI).
2. **URL muda** para `/chats#ID`.
3. **App faz request**: `GET /messages2/{ID}/page/1`.
4. **App renderiza** mensagens iniciais.
5. **App conecta no canal Pusher** do chat (provavelmente).
6. **Scroll up**: Dispara `GET /messages2/{ID}/page/2`...

---

## 12.4 Assets e Mídia

- **Imagens/Áudios**: Hospedados no S3 (`zapguruusers.s3...`).
- **Acesso**: Alguns arquivos exigem header `Referer: https://s21.chatguru.app/` para download (proteção de hotlink).
- **Extensão**: Se precisar baixar áudio para análise, faça o download *background* usando as permissões de host da extensão para contornar CORS, ou use o `chatguru-api.js` local.

---

*Documento atualizado em 02/02/2026*
