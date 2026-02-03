# 11 - DOM Selectors Reference

> Referência técnica dos seletores CSS para manipulação da interface via JavaScript.
> **Nota**: O ChatGuru usa Vue.js com atributos de escopo (ex: `data-v-09d3b960`). Evite depender desses atributos pois mudam entre builds. Prefira classes sem hash ou estrutura hierárquica.

---

## 11.1 Pontos de Injeção (Onde colocar o botão?)

Para a extensão, o melhor lugar para injetar o botão "Analisar" é no header do chat.

### Header do Chat
- **Seletor**: `.chat-header`, `.chat-header__actions` (se existir) ou container flex no topo da coluna central.
- **Estratégia**:
  ```javascript
  // Encontrar o botão de "Mais opções" (⋮) e inserir antes dele
  const moreBtn = document.querySelector('button.btn-more, button[data-bs-toggle="dropdown"]');
  const container = moreBtn?.parentElement;
  if (container) {
    container.insertBefore(myButton, moreBtn);
  }
  ```

---

## 11.2 Barra Lateral (Lista de Chats)

| Componente | Seletor Principal | Seletores Alternativos |
|------------|-------------------|------------------------|
| **Container Lista** | `.chat-list` | `div.list-area` |
| **Card de Chat** | `.list__user-card` | `div[class*="user-card"]` |
| **Chat Selecionado** | `.list__user-card--active` | `.list__user-card.selected` |
| **Avatar** | `.user-image-wrapper img` | `img.user-image` |
| **Nome** | `.user-name` | `span[class*="name"]` |
| **Preview Msg** | `.user-msg span` | |
| **Badge Não Lido** | `.unread-count` | `span.badge` |
| **Status Badge** | `.status-badge` | `div[class*="status"]` |

---

## 11.3 Área do Chat (Mensagens)

| Componente | Seletor Principal | Seletores Alternativos |
|------------|-------------------|------------------------|
| **Container Scroll** | `#chat_messages_app` | `.messages_in_out` |
| **Wrapper Msgs** | `.msg-data` | |
| **Botão Load More** | `.alert-info` | `div:contains("Carregar mais")` |
| **Balão Enviado** | `.msg-out` | `div[class*="out"]` |
| **Balão Recebido** | `.msg-in` | `div[class*="in"]` |
| **Conteúdo Texto** | `.msg-text` | `.selectable-text` |
| **Metadata** | `.msg-details` | `.msg-info` |
| **Hora** | `.msg-time` | `span[class*="time"]` |
| **Status (Check)** | `.msg-status` | `span[class*="ack"]` |

---

## 11.4 Painel de Informações (Direita)

| Componente | Seletor Principal | Seletores Alternativos |
|------------|-------------------|------------------------|
| **Container** | `.right-panel` | `.lead-info-panel` |
| **Nome Lead** | `h4.lead-name` | `.user-details .name` |
| **Telefone** | `.lead-phone` | `a[href^="tel:"]` |
| **Toggle Chatbot** | `#chatbot-toggle` | `input[type="checkbox"].chatbot` |
| **Select Status** | `#delegateuserform` | `select.delegate` |
| **Tags Container** | `.tags-container` | `.lead-tags` |
| **Tag Individual** | `.tag-badge` | `.badge-pill` |

---

## 11.5 Campos Personalizados (Inputs)

Os inputs têm nomes ou IDs previsíveis.

- **Negotiation ID**: `input[name="negotiation_id"]`
- **User ID**: `input[name="user_id"]`
- **Full Name**: `input[name="full_name"]`
- **Generico**: `input[name="NOME_DO_CAMPO"]`

---

## 11.6 Modais e Overlays

O ChatGuru usa Bootstrap (ou similar) para modais.

- **Modal Aberto**: `.modal.show`, `.modal.in`
- **Backdrop**: `.modal-backdrop`
- **Botão Fechar**: `button.close`, `button[data-dismiss="modal"]`

---

## 11.7 Snippet de Detecção Segura

Use este padrão para garantir que o elemento existe antes de tentar injetar, pois o ChatGuru é uma SPA (Single Page App) e elementos são criados/destruídos dinamicamente.

```javascript
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// Uso
waitForElement('.chat-header').then(header => {
  if (header) injectButton(header);
});
```

---

*Documento atualizado em 02/02/2026*
