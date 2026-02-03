# 10 - Extension Requirements (PRD)

> Documento de requisitos para a extensão Chrome "ChatGuru Feedback Analyzer".
> Objetivo: Auxiliar supervisores e atendentes com feedbacks automáticos de qualidade baseados em IA.

---

## 10.1 Visão do Produto

### Problema
A Click Cannabis tem alto volume de atendimentos (~100k chats). É impossível para os supervisores (Rogério, etc.) lerem todas as conversas para garantir qualidade, aderência ao script e cordialidade.

### Solução
Uma extensão Chrome que adiciona um botão **"Analisar Atendimento"** na interface do ChatGuru. Ao clicar, a extensão lê o histórico do chat atual, envia para uma IA (LLM), e exibe um relatório flutuante com notas e sugestões.

---

## 10.2 Requisitos Funcionais (RF)

### RF01 - Injeção na Interface
- **Botão de Ação**: Adicionar um botão discreto no Header do Chat (ao lado do ícone de anexo/agendar).
- **Ícone**: Lupa ou Cérebro (Brain).
- **Tooltip**: "Gerar Feedback com IA".

### RF02 - Extração de Contexto
- **Trigger**: Ao clicar no botão.
- **Dados a coletar**:
  1. Identificação do Lead (Nome, Telefone).
  2. Histórico de Mensagens (Últimas 50-100 mensagens ou janela de tempo de 7 dias).
  3. Campos Personalizados (para saber contexto do caso, ex: `negotiation_id`).
- **Método**: Usar a API interna `/messages2/...` (ver doc 06) para garantir dados estruturados e precisos, em vez de scraping do DOM.

### RF03 - Análise de IA (Core)
- **Processamento**: Enviar o JSON da conversa para uma API de LLM (OpenAI/Claude).
- **Critérios de Análise**:
  1. **Tempo de Resposta**: O atendente demorou muito? (>10min sem aviso).
  2. **Cordialidade/Tom**: O atendente foi educado e empático?
  3. **Resolução**: O problema do cliente foi resolvido ou encaminhado corretamente?
  4. **Aderência ao Processo**: Seguiu os funis e scripts da Click Cannabis?
  5. **Uso de Tags**: O chat foi taggeado corretamente?

### RF04 - Exibição do Relatório (UI Overlay)
- **Formato**: Painel flutuante (Draggable) ou Sidebar injetada à direita.
- **Conteúdo**:
  - **Score Geral**: 0 a 10 (com cor: Verde/Amarelo/Vermelho).
  - **Pontos Positivos**: Lista bullet points.
  - **Pontos de Atenção**: Onde melhorar.
  - **Sugestão de Próxima Ação**: O que fazer agora.
- **Ações no Relatório**:
  - "Copiar Feedback" (para mandar pro atendente).
  - "Salvar como Nota Interna" (usa API `note_add`).

---

## 10.3 Requisitos Técnicos (RNF)

### RNF01 - Arquitetura da Extensão
- **Manifest V3**: Padrão atual do Chrome.
- **Permissions**:
  - `activeTab` / `scripting`: Para injetar scripts.
  - `storage`: Salvar configurações (API Key da OpenAI/Anthropic).
  - `host_permissions`: `https://s21.chatguru.app/*`.

### RNF02 - Segurança e Privacidade
- **Dados Sensíveis**: Anonimizar dados antes de enviar para LLM se possível (mas a Click usa OpenAI Enterprise/Team, então envio direto pode ser aceitável - confirmar política).
- **API Key**: O usuário deve inserir sua API Key nas configurações da extensão (não hardcoded).

### RNF03 - Performance
- **Cache**: Não reanalisar o mesmo chat se não houver novas mensagens.
- **Non-blocking**: A extração e análise não podem travar a UI do ChatGuru.

---

## 10.4 User Stories

### US01 - O Supervisor
*"Como supervisor (Rogério), quero entrar em um chat aleatório, clicar em um botão e saber em 10 segundos se o atendimento foi bom, para poder dar feedback rápido ao time sem ler 500 mensagens."*

### US02 - O Atendente
*"Como atendente, quero rodar a análise em meus próprios chats difíceis para ter sugestões de como responder melhor ou contornar objeções."*

---

## 10.5 Definição do Prompt (Rascunho)

```text
Você é um especialista em QA de atendimento ao cliente da Click Cannabis (telemedicina).
Analise a seguinte transcrição de chat entre AGENTE e PACIENTE.

Contexto: O paciente busca tratamento com cannabis medicinal.
Objetivo do Agente: Acolher, tirar dúvidas e converter para agendamento/venda.

Transcrissão:
{{CHAT_HISTORY}}

Avalie:
1. Tempo de resposta (Rápido/Lento)
2. Empatia (0-10)
3. Clareza (0-10)
4. Objeções não tratadas

Saída JSON:
{
  "score": 8.5,
  "summary": "Atendimento bom, mas demorou a responder sobre o preço.",
  "feedback": "Tente antecipar a objeção de valor explicando os benefícios antes.",
  "suggested_reply": "Olá Fulano, entendo a questão do valor..."
}
```

---

*Documento atualizado em 02/02/2026*
