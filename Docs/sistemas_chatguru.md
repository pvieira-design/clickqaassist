# Sistemas e Tecnologia - Click Cannabis

## Visão Geral dos Sistemas

| Sistema | Função | Status |
|---------|--------|--------|
| **CRM** | Gestão de pacientes, pagamentos, pipeline | Proprietário (interno) |
| **ChatGuru** | Atendimento WhatsApp | Em uso, migrando para ClickChat |
| **Clico** | IA de primeiro atendimento | Integrado ao ChatGuru |
| **Google Meet** | Consultas médicas | Em uso |
| **Pagar.me / EFI** | Gateway de pagamento | Primário / Backup |
| **n8n** | Automações | Interno |
| **Metabase/Grafana** | Dashboards e análises | Ad-hoc |
| **ClickUp** | Gestão de tarefas | Em uso |

---

## CRM Proprietário

O CRM foi desenvolvido internamente e é o coração da operação.

**O que faz:**
- Cria perfil do paciente automaticamente quando chega no WhatsApp
- Gerencia pipeline de vendas (etapas do funil)
- Gera links de pagamento
- Armazena documentos, receitas, autorizações
- Sincroniza com ChatGuru (user_id, negotiation_id)

**Tabs do perfil do paciente:**
- Consultas
- Documentos
- Pagamentos
- Entregas
- Carteirinha

**Problema:** Algumas informações do ChatGuru não são salvas no CRM (ex: respostas da qualificação do Clico, onde conheceu a Click).

---

## ChatGuru

Plataforma de atendimento via WhatsApp. Toda comunicação com paciente passa por aqui.

### Como Funciona

```
META (WhatsApp API) → GUPSHUP (Provider) → CHATGURU → CRM
```

### Componentes Principais

**1. Departamentos**
- Atendimento Inicial (onde leads chegam)
- Outros departamentos por área

**2. Atendentes**
- Clico (IA) - atendente padrão inicial
- Atendentes humanos por área

**3. Diálogos Prontos**
Scripts pré-cadastrados que o atendente pode executar com um clique:
- "Explicação do Processo"
- "Pagamento Confirmado"
- "Consulta Confirmada"
- Vários outros (estão desorganizados)

**4. Campos Personalizados**
Sincronizados com CRM:
- user_id
- negotiation_id
- Etapa do funil

### Fluxo de Entrada do Lead

1. Lead envia mensagem no WhatsApp
2. GupShup recebe e marca timestamp
3. ChatGuru atribui ao departamento "Atendimento Inicial"
4. Atendente padrão = **Clico** (IA)
5. Webhook dispara para CRM criando perfil do usuário
6. CRM retorna user_id e negotiation_id para o ChatGuru
7. Agora o chat está sincronizado com o CRM

### Limitações do ChatGuru

| Problema | Impacto |
|----------|---------|
| Não mede tempo de resposta | Não existe SLA |
| API de exportação ruim | Histórico difícil de extrair |
| Dados da qualificação não são salvos | Médico não vê o que Clico coletou |
| Diálogos desorganizados | Ninguém sabe o que é usado |
| Sem dashboard de performance | Não vê métricas por atendente |

**Solução em andamento:** ClickChat (sistema próprio) em desenvolvimento.

---

## Clico (IA de Atendimento)

Nome interno da IA. Para o paciente, se apresenta como **"Rafa"** (nome unissex).

### O que Faz

1. Recebe primeiro contato do lead
2. Envia boas-vindas personalizada por patologia
3. Faz 2 perguntas de qualificação:
   - "Há quanto tempo você sofre com isso?"
   - "Já fez algum tratamento ou usou medicamentos?"
4. Transfere para atendente humano

### Regras de Hand-off (IA → Humano)

| Gatilho | Ação |
|---------|------|
| Após 2-3 interações | Transfere |
| Recebe áudio ou imagem | Transfere imediatamente |
| Fora do horário comercial | Clico assume 100% |
| Palavras de frustração | Transfere |

### Limitação Crítica

As respostas coletadas pelo Clico **NÃO são salvas no CRM**. Ficam apenas no histórico do ChatGuru, que é difícil de exportar.

---

## Gateways de Pagamento

**Prioridade atual:**
1. **Pagar.me** - Melhor taxa, webhook rápido (<1 min)
2. **EFI** - Backup
3. **Asaas** - Configurado mas inativo

**Processo:**
1. Atendente cria "card de pagamento" no CRM
2. Link PIX é gerado automaticamente
3. Enviado ao paciente via ChatGuru
4. Webhook confirma pagamento
5. CRM atualiza status e dispara próxima etapa

---

## Automações (n8n)

Ferramenta de automação low-code usada internamente.

**Exemplos de automações:**
- Disparo de emails (SendGrid)
- Atualização de etapas no CRM
- Remarketing automático
- Integração com dashboards

**Workflow útil:** "Claude Queries" (ID: 6WdaglLNkVEoq1yw) - executa queries SQL no banco.

---

## Integrações

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   CHATGURU  │◄───►│     CRM     │◄───►│   PAGAR.ME  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   
       ▼                   ▼                   
┌─────────────┐     ┌─────────────┐     
│    CLICO    │     │     N8N     │     
└─────────────┘     └─────────────┘     
                           │
                           ▼
                    ┌─────────────┐
                    │  SENDGRID   │
                    └─────────────┘
```

---

## Em Desenvolvimento

| Sistema | O que é | Status |
|---------|---------|--------|
| **ClickChat** | Substituto do ChatGuru (interno) | Em desenvolvimento |
| **WebApp do Paciente** | App para paciente ver documentos, receitas, carteirinha | Em desenvolvimento |

**Benefícios do ClickChat:**
- Histórico completo acessível
- Métricas de atendimento
- Integração nativa com CRM
- Reduz dependência de terceiros

---

## Problemas Conhecidos

1. **ChatGuru sem endpoint confiável** - Difícil exportar histórico
2. **Dados do Clico não persistidos** - Médico não vê qualificação
3. **UTMs se perdem** - Do site para WhatsApp, dado não passa para o chat
4. **Diálogos desorganizados** - Ninguém parou para arrumar
5. **Não existe QA estruturado** - Análise de chats é manual
