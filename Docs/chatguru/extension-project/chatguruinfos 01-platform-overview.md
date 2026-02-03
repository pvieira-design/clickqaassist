# 01 - Platform Overview

> O que é o ChatGuru, histórico da plataforma, contexto de uso na Click Cannabis

---

## 1.1 O que é o ChatGuru

O **ChatGuru** é uma plataforma brasileira de atendimento multicanal focada em WhatsApp Business API. Funciona como um CRM de conversas que permite:

- **Atendimento centralizado**: Múltiplos atendentes usando o mesmo número de WhatsApp
- **Automação via chatbots**: Fluxos automatizados de conversa (diálogos)
- **Gestão de funis**: Acompanhamento do lead através de etapas
- **Delegação inteligente**: Distribuição de chats para departamentos/usuários
- **Templates oficiais**: Mensagens pré-aprovadas pelo WhatsApp
- **API de integração**: REST API para automações externas

### Arquitetura Técnica

```
┌─────────────────────────────────────────────────────────────────┐
│                        ChatGuru Cloud                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Frontend   │  │   Backend    │  │   MongoDB    │          │
│  │   (React?)   │  │   (Node.js)  │  │   Database   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘          │
│         │                 │                                     │
│         │    ┌────────────┴────────────┐                       │
│         │    │      Pusher.js          │  Real-time            │
│         │    │    (WebSockets)         │  Messages             │
│         │    └─────────────────────────┘                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Gupshup (BSP)     │────▶│   WhatsApp Cloud    │
│   Business Provider │     │   API (Meta)        │
└─────────────────────┘     └─────────────────────┘
```

### URL e Estrutura

- **Domínio principal**: `s21.chatguru.app` (shard 21 - cada cliente tem um shard)
- **Protocolo**: HTTPS obrigatório
- **SPA**: Single Page Application com rotas client-side
- **Rotas principais**:
  - `/dashboard` - Dashboard de métricas
  - `/chats` - Tela principal de atendimento (onde a extensão vai atuar)
  - `/funnels` - Configuração de funis
  - `/chatbots` - Editor de fluxos de chatbot
  - `/campaigns` - Campanhas de disparo
  - `/tags` - Gerenciamento de tags
  - `/users` - Gestão de usuários

---

## 1.2 Histórico na Click Cannabis

### Timeline de Adoção

| Data | Evento |
|------|--------|
| Set/2024 | Migração para ChatGuru (conta 66eb2b7691396bcd24682bab) |
| Set/2024 | Configuração inicial de departamentos |
| Out/2024 | Integração com CRM via campos personalizados |
| Nov/2024 | Implementação de funis de pós-venda |
| Jan/2025 | Criação da API de exportação (chatguru-api.js) |
| Jan/2025 | Scripts de monitoramento automático |

### Por que o ChatGuru?

1. **API Oficial do WhatsApp** - Gupshup como BSP (não é número pirata)
2. **Compliance** - Importante para área de saúde
3. **Escalabilidade** - Suporta 60+ atendentes simultâneos
4. **Integração** - Webhooks e API REST para automação

---

## 1.3 Dados da Conta Click Cannabis

### Identificadores Principais

```javascript
const CHATGURU_CONFIG = {
  // Conta
  accountId: '66eb2b7691396bcd24682bab',
  accountName: 'Click Cannabis 2',
  
  // Telefone/Aparelho
  phoneId: '66ec42044b5a871161feffa9',
  phoneNumber: '+5521993686082',
  phoneProvider: 'Gupshup - clickguru',
  
  // Usuário Admin
  userId: '66eb2aac87a10f8027a9b36b',
  userName: 'João M',
  userEmail: 'clickcannabis@clickcannabis.com',
  
  // API
  apiKey: 'CKW0ZPD7R8KNC34DOK8CKPABRM9OU417IHKF7R5J1JRB1JG5LP6MT719YGKY69QB',
  apiEndpoint: 'https://s21.chatguru.app/api/v1',
  
  // URLs
  baseUrl: 'https://s21.chatguru.app',
  chatsUrl: 'https://s21.chatguru.app/chats',
  
  // Timezone
  timezone: 'America/Recife', // UTC-3
  
  // Empresa
  cnpj: '41247190000123',
  razaoSocial: 'HEALTH MEDIA LTDA',
  segmento: 'Saúde / Bem Estar'
};
```

### Credenciais de Acesso

| Campo | Valor |
|-------|-------|
| **Email** | clickcannabis@clickcannabis.com |
| **Senha** | Clickcannabis123@ |
| **Tipo** | Administrador |
| **2FA** | Não configurado |

> ⚠️ A extensão **não precisa** de login - ela opera no contexto do browser já autenticado.

---

## 1.4 Módulos Contratados

### Módulos Ativos ✅

| Módulo | Descrição | Uso na Click |
|--------|-----------|--------------|
| **Chatbot** | Fluxos automatizados | Qualificação inicial, FAQ |
| **Funil** | Pipeline de leads | 7 funis de acompanhamento |
| **Adicionar Chats** | Importar contatos | Migração de leads |
| **API** | REST API externa | Integração CRM, n8n |
| **Atendimento** | Módulo base | Core do sistema |

### Módulos NÃO Contratados ❌

| Módulo | Descrição | Motivo |
|--------|-----------|--------|
| **NPS** | Pesquisa satisfação | Usam sistema próprio |
| **Transcrições** | Transcrição de áudios | Implementado via chatguru-api.js |
| **Resumo de chats** | IA resumo | Não contratado |

---

## 1.5 Números e Volume

### Snapshot Atual (02/02/2026)

```javascript
const VOLUME_METRICS = {
  // Chats
  totalChatsNaoResolvidos: 103198,
  chatsAbertos: 2078,
  chatsEmAtendimento: 96970,
  chatsAguardando: 4150,
  
  // Equipe
  totalUsuarios: 67,
  totalDepartamentos: 11,
  
  // Estrutura
  totalFunis: 7,
  totalEtapasFunil: 45,
  totalTags: 154,
  
  // Distribuição por Departamento
  porDepartamento: {
    'Atendimento Inicial': 79382,
    'Pós-venda': 11941,
    'Consulta Médica': 4651,
    'Receita e Orçamento': 4030,
    'Consulta Médica - Chat': 1639,
    'Documentação - Geral': 592,
    'Documentação - Chat': 354,
    'Sem Delegação': 402,
    'Entrega': 67,
    'Documentação - Análise': 3,
    'Atendimento Inicial - Clico': 1
  }
};
```

### Top 10 Atendentes por Volume

| # | Nome | Email | Chats |
|---|------|-------|-------|
| 1 | Rogério | rmedeiros@clickcannabis.com | 44.532 |
| 2 | Gabriel Prates | gprates@clickcannabis.com | 8.935 |
| 3 | Juliana Aires | jaires@clickcannabis.com | 6.028 |
| 4 | Natalia Santos | nsantos@clickcannabis.com | 5.239 |
| 5 | Andressa Silva | asilva@clickcannabis.com | 4.450 |
| 6 | Bianca Carvalho | bcarvalho@clickcannabis.com | 1.952 |
| 7 | Andréia Melo | amelo@clickcannabis.com | 1.386 |
| 8 | Pedro Palhano | ppalhano@clickcannabis.com | 1.022 |
| 9 | Breno Rocha | bmrocha@clickcannabis.com | 897 |
| 10 | Andson | asantana@clickcannabis.com | 809 |

---

## 1.6 Integrações Existentes

### 1.6.1 Campos Personalizados → CRM

O ChatGuru se integra ao CRM Click Cannabis via **campos personalizados** (custom fields). Cada chat pode ter campos que linkam ao banco de dados:

```javascript
const CUSTOM_FIELDS_MAPPING = {
  // IDs dos campos no ChatGuru
  fieldIds: {
    negotiation_id: '66ede1fc4e46ce3c33c0c22b',
    user_id: '66f1847b988cd3a4b4d4dedf',
    negotiation: '66f1886bb89f290bb89b274c'
  },
  
  // Mapeamento para banco Click Cannabis
  databaseMapping: {
    'negotiation_id': 'leads.id',           // ID do lead no CRM
    'user_id': 'users.id',                  // ID do paciente
    'payment_consulting_id': 'payments.id'  // ID do pagamento
  }
};
```

### 1.6.2 Webhooks n8n

O ChatGuru dispara webhooks para o n8n em eventos específicos:

```javascript
const WEBHOOKS = {
  // Webhook acionado por diálogos do chatbot
  chatbotTrigger: {
    url: 'https://clickcannabis.app.n8n.cloud/webhook/...',
    events: ['dialog_executed'],
    payload: {
      campanha_id: 'string',
      campanha_nome: 'string',
      origem: 'string',
      email: 'string',
      nome: 'string',
      tags: ['array'],
      texto_mensagem: 'string',
      campos_personalizados: {},
      bot_context: {},
      responsavel_nome: 'string',
      responsavel_email: 'string',
      link_chat: 'string',
      celular: 'string',
      phone_id: 'string',
      chat_id: 'string',
      chat_created: 'timestamp',
      datetime_post: 'timestamp',
      tipo_mensagem: 'string'
    }
  }
};
```

### 1.6.3 API de Exportação Local (chatguru-api.js)

Servidor Node.js criado pela equipe para exportar dados:

```javascript
const LOCAL_API = {
  port: 18900,
  endpoints: {
    health: 'GET /api/health',
    dashboard: 'GET /api/dashboard',
    chats: 'GET /api/chats?status=ABERTO&limit=50',
    messages: 'GET /api/chat/:chatId/messages?page=1',
    export: 'GET /api/chat/:chatId/export?format=n8n&transcribe=true'
  },
  features: [
    'Conexão via CDP ao browser autenticado',
    'Transcrição de áudios via whisper-cpp',
    'Exportação em JSON ou texto',
    'Paginação automática de mensagens'
  ]
};
```

### 1.6.4 Banco de Dados Click Cannabis

A extensão pode cruzar dados do ChatGuru com o banco via `negotiation_id` e `user_id`:

```sql
-- Exemplo: buscar dados do lead no banco via negotiation_id
SELECT 
  l.id,
  l.name,
  l.phone,
  u.email,
  c.status as consulting_status
FROM leads l
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN consultings c ON c.lead_id = l.id
WHERE l.id = 335141; -- negotiation_id do ChatGuru
```

---

## 1.7 Limitações e Considerações

### Limitações da Plataforma

1. **Cookies HTTP-only**: Não é possível extrair cookies via JavaScript para uso externo
2. **Rate Limiting**: API tem limites (não documentados oficialmente)
3. **Paginação**: Máximo ~100 chats por request, ~20 mensagens por página
4. **Websocket**: Pusher tem limites de conexões simultâneas

### Considerações para a Extensão

1. **Operar no contexto da página**: Usar `fetch()` com `credentials: 'include'`
2. **Não bloquear UI**: Operações assíncronas, não travar a thread principal
3. **Cache inteligente**: Evitar requests repetidos
4. **Respeitar sessão**: Se o usuário deslogar, a extensão deve parar

---

## 1.8 Glossário

| Termo | Significado |
|-------|-------------|
| **Chat** | Conversa com um contato (1:1 ou grupo) |
| **Lead** | Potencial paciente no CRM |
| **Delegação** | Atribuição de chat a usuário/departamento |
| **Funil** | Pipeline de etapas do lead |
| **Tag** | Marcador/label para categorização |
| **Template** | Mensagem pré-aprovada pelo WhatsApp |
| **Diálogo** | Fluxo de chatbot automatizado |
| **BSP** | Business Solution Provider (Gupshup) |
| **Shard** | Instância do servidor (s21 = shard 21) |

---

*Documento atualizado em 02/02/2026*
