# 09 - Existing Code & Automations

> Documentação de scripts e automações já existentes no workspace relacionados ao ChatGuru.

---

## 9.1 Pasta `chatguru-monitor/`

Scripts responsáveis por monitorar filas de atendimento e alertar gestores via WhatsApp.

### 9.1.1 `monitor-final.js`
Script principal Node.js que consome a API interna para gerar relatórios.

**Funcionalidades:**
1. **Login Automático**: Usa credenciais do `.env` para obter cookie de sessão se necessário.
2. **Fetch Dashboard**: Consulta `/dashboard/chats/unresolved`.
3. **Filtros**: Ignora departamentos irrelevantes e foca em:
   - Pós-venda (Crítico)
   - Receita e Orçamento
   - Consulta Médica
   - Atendimento Inicial
   - Documentação
4. **Alerta WhatsApp**: Envia resumo formatado para números VIP (Lucas, Pedro, João) se rodado com flag `--cron`.

**Exemplo de Output (WhatsApp):**
```text
📊 *ChatGuru - Não Lidos*
🕐 18:00 (02/02)

*Total: 170*

• Pós-venda: 51 ⚠️
• Receita e Orçamento: 30
• Consulta Médica - Chat: 29
...
```

### 9.1.2 `run-monitor.sh`
Wrapper Bash para execução via Cron.
- Carrega variáveis de ambiente (PATH, NODE_PATH).
- Executa `node monitor-final.js --cron`.
- Gerencia logs em `monitor.log`.

### 9.1.3 `.session-cookie`
Arquivo de texto simples onde o script armazena o cookie de sessão (`connect.sid`) para reutilização, evitando login excessivo.

---

## 9.2 Cron Jobs (OpenClaw)

O OpenClaw gerencia o agendamento da execução.

- **Job ID**: `259c54fb-4f31-4989-aec6-ac07d48fae24`
- **Schedule**: `*/30 8-22 * * *` (A cada 30 min, das 8h às 22h)
- **Comando**: Executa o `run-monitor.sh`.

---

## 9.3 Skills do Workspace

### 9.3.1 `skills/chatguru-unread`
Skill experimental contendo a lógica de scraping via Browser Evaluate.
- **Arquivo**: `skills/chatguru-unread/SKILL.md`
- **Lógica**: Abre browser, clica no filtro "Não Lidos" (ícone envelope), itera sobre dropdown de departamentos, conta resultados na UI.
- **Status**: Substituído pela API direta (`monitor-final.js`) por ser muito lento (precisa navegar na UI).

---

## 9.4 Webhooks (n8n)

Automações configuradas dentro do ChatGuru (Settings > Webhooks) que apontam para o n8n da Click Cannabis.

1. **Trigger Chatbot**: Quando um paciente interage com o bot.
   - **Endpoint**: `https://clickcannabis.app.n8n.cloud/webhook/...`
   - **Uso**: Classificação automática, atualização de status no CRM.

2. **Trigger Atualização de Status**: Quando um chat muda de fase.
   - **Uso**: Atualizar card no ClickUp/CRM.

---

*Documento atualizado em 02/02/2026*
