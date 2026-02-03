# 07 - Data Models

> Definição das estruturas de dados JSON retornadas pela API interna.
> Use estas definições para tipar as variáveis na extensão.

---

## 7.1 Chat Object (`IChat`)
Retornado pelo endpoint `/chatlist/store`. Representa um contato/conversa na lista.

```typescript
interface IChat {
  id: string;              // MongoDB ObjectId ("697fdae0c30edc5d32e99935")
  name: string;            // Nome do contato ("Maria Silva")
  phone_id: string;        // ID do aparelho conectado
  account_id: string;      // ID da conta ChatGuru
  
  // Identificadores WhatsApp
  wa_chat_id: string;      // ID técnico ("552199999999@c.us")
  kind: "contact" | "group";
  
  // Status e Estado
  status: "ABERTO" | "EM ATENDIMENTO" | "AGUARDANDO" | "RESOLVIDO" | "FECHADO" | "INDEFINIDO";
  new_messages: number;    // Contador de não lidas (ex: 2)
  favorite: boolean;
  archived: boolean;
  
  // Timestamps (ISO Strings)
  created: string;         // "2025-06-01T10:00:00Z"
  updated: string;         // "2026-02-02T18:00:00Z"
  
  // Última mensagem (Preview)
  last_message: {
    text: string;          // Texto truncado ou descrição ("📷 Foto")
    date: string;          // ISO String
    type: string;          // "chat", "image", etc.
    status: string;        // "read", "delivered"
  };
  
  // Relacionamentos (Arrays de IDs)
  users_delegated_ids: string[];   // Usuários responsáveis
  groups_delegated_ids: string[];  // Departamentos responsáveis
  funnel_steps_ids: string[];      // Etapas de funil
  tags: string[];                  // IDs das tags
}
```

---

## 7.2 Message Object (`IMessage`)
Retornado pelo endpoint `/messages2/{chatId}/...`. Estrutura complexa aninhada.

```typescript
interface IMessageWrapper {
  type: "message" | "note"; // "note" são anotações internas (amarelas)
  date: { "$date": string }; // Data separadora
  m: IMessageContent;       // Conteúdo real
}

interface IMessageContent {
  _id: { "$oid": string };  // Message ID único
  
  // Conteúdo
  text: string;             // Texto da mensagem ou legenda
  type: MessageType;        // "chat", "image", "audio", "template", etc.
  
  // Direção e Remetente
  is_out: boolean;          // TRUE = Enviada pelo Agente/Bot, FALSE = Recebida do Lead
  wa_sender_id: string;     // Número que enviou ("5521..." ou "system")
  author?: { "$oid": string }; // ID do usuário que enviou (se is_out=true)
  
  // Status
  status: "sent" | "delivered" | "read" | "failed";
  ack: 0 | 1 | 2 | 3;       // 0=Relógio, 1=Enviado(✓), 2=Entregue(✓✓), 3=Lido(✓✓ Azul)
  
  // Timestamps (Formato MongoDB Extended JSON)
  created: { "$date": string };
  timestamp: { "$date": number | string }; // Usar este para ordenação
  
  // Mídia (se type != 'chat')
  file?: {
    name: string;           // "audio.ogg"
    mime: string;           // "audio/ogg; codecs=opus"
    path_relative: string;  // Caminho S3 ou URL completa
    caption?: string;       // Legenda da mídia
  };
  
  // Template (HSM)
  is_template: boolean;
  template?: {
    namespace: string;
    element_name: string;
    language: { code: string; policy: string };
    components: any[];
  };
  
  // Bot / Automação
  bot_response?: {
    dialog_executed?: string[]; // IDs dos diálogos acionados
  };
  
  // Metadados
  deleted: boolean;
  is_forwarded: boolean;
  reactions: Array<{
    emoji: string;
    sender_id: string;
  }>;
}

type MessageType = 
  | "chat"        // Texto simples
  | "image"       // Foto
  | "audio"       // Áudio (PTT) ou arquivo de áudio
  | "ptt"         // Áudio gravado na hora (Push-to-talk)
  | "video"       // Vídeo
  | "document"    // Arquivo genérico (PDF, etc)
  | "sticker"     // Figurinha
  | "location"    // Localização
  | "vcard"       // Contato
  | "template"    // Mensagem Oficial (HSM)
  | "interactive" // Botões / Listas
  | "revoked";    // Mensagem apagada
```

---

## 7.3 User & Department (`IUser`, `IGroup`)
Retornados por `/get_users_and_groups`.

```typescript
interface IUser {
  id: string;
  name: string;        // "Rogério"
  email: string;       // "rmedeiros@clickcannabis.com"
  kind: "user";
  chats_count?: number; // Opcional, vindo do dashboard
}

interface IDepartment {
  id: string;
  name: string;        // "Atendimento Inicial"
  kind: "group";
  users: string[];     // IDs dos usuários neste departamento
}
```

---

## 7.4 Tags & Funnels

```typescript
interface ITag {
  id: string;
  name: string;        // "Cliente VIP"
  color: string;       // Hex color
}

interface IFunnel {
  id: string;
  name: string;        // "Pós-venda"
  steps: IFunnelStep[];
}

interface IFunnelStep {
  id: string;
  name: string;        // "7d"
  order: number;
}
```

---

## 7.5 Mapeamento de Campos Personalizados

Estrutura interna usada no objeto `custom_fields` da API v1 ou inputs da UI.

```typescript
interface ICustomFields {
  // IDs de Referência (CRM Links)
  negotiation_id?: string;   // Link para leads.id
  user_id?: string;          // Link para users.id
  payment_consulting_id?: string;
  
  // Dados Pessoais
  full_name?: string;
  pacient_name?: string;
  phone?: string;
  email?: string;
  
  // Links
  negotiation?: string;      // URL Pipeline
  link_prescription?: string; // URL Receita
  anamnese_link?: string;
  
  // Dados Médicos
  doctor_name?: string;
  patologias?: string;
  
  // Logística
  cod_rastreio?: string;
  
  // Outros
  [key: string]: string | undefined;
}
```

---

## 7.6 Exemplo de Payload Completo (Chat List)

```json
{
  "chats": [
    {
      "id": "697fdae0c30edc5d32e99935",
      "name": "João da Silva",
      "status": "EM ATENDIMENTO",
      "new_messages": 0,
      "users_delegated_ids": ["66eb2aac87a10f8027a9b36b"],
      "last_message": {
        "text": "Obrigado pelo atendimento!",
        "date": "2026-02-02T18:05:00.000Z",
        "type": "chat",
        "status": "read"
      }
    }
  ]
}
```

---

*Documento atualizado em 02/02/2026*
