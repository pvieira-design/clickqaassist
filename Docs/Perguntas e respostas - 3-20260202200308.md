# Perguntas e respostas - 3

## Perguntas sobre a API e Identificação do Atendente
1. **Na documentação da API que você enviou**, o campo `direction` só indica `patient` ou `agent`. **Como vamos identificar QUAL atendente específico enviou a mensagem?**
    *   A API atual retorna isso em algum campo que não está documentado?
    *   Precisamos de um endpoint adicional?
    *   Ou será mapeamento manual (número de telefone = atendente X)?
2. **Sobre o Clico (IA)**: Na documentação não encontrei distinção entre mensagem de bot e de atendente humano. O campo `botDialogs` indica algo sobre isso? Como diferenciar?
* * *
## Perguntas sobre Status do Feedback
1. **Quais status um feedback pode ter?** Entendi que é por feedback, não por chat. Seria algo como:
    *   `PENDENTE` (registrado, atendente ainda não viu)
    *   `LIDO` (atendente abriu)
    *   `COMPREENDIDO` (atendente clicou em "Entendi")
    *   `CONTESTADO` (atendente contestou)
    *   `RESOLVIDO` (admin/líder resolveu a contestação)
Sim, acho perfeito
1. **Quando uma contestação é "resolvida", o feedback original pode ser:**
O admin/lider esoclhe o que vai acontecer, se iremos remover aquele feedback, manter, mudar o type dele, etc.
* * *
## Perguntas sobre a Thread de Contestação
1. **A thread de contestação tem limite de mensagens?** Ou pode ir e voltar indefinidamente?
indefinidamente
1. **Quem pode ver a thread de contestação?**
atendente que contestou + admin/líder

* * *
## Perguntas sobre Emails
1. **Quando o email é enviado para o atendente?**
    *   Um resumo diário
2. **O email deve conter:**
    *   Link direto para o feedback
    *   Resumo do feedback (tipo, mensagem, chat)
Top
* * *
## Perguntas sobre Dados Adicionais
1. **Ao registrar um feedback, precisamos guardar:**
    *   Quem registrou (admin ou líder)
    *   Data/hora do registro
    *   Mais alguma coisa?
2. **O chat importado precisa guardar informações do paciente?** (nome, telefone) Ou só as mensagens?
Sim, precisa.
* * *
## Perguntas sobre a Extensão (escopo MVP?)
1. **A extensão entra no MVP ou é fase posterior?** Quero entender se documento ela agora ou deixo para depois.
Posterior
* * *
## Perguntas sobre Edge Cases
1. **Se um atendente for desativado/removido, o que acontece com:**
    *   Os feedbacks já registrados para ele?
    *   O histórico de score?
    *   Os chats onde ele aparece?
Mnatém
1. **Se um feedback type for desativado, os feedbacks já registrados com esse tipo:**
    *   Continuam valendo para o score?
nao
*       *   Aparecem no histórico?
Nao
* * *
## Pergunta sobre Priorização
1. **Para o MVP, qual a ordem de prioridade das funcionalidades?** Me ajuda a definir o que é essencial vs. nice-to-have:
    *   \[ x\] Importar chat
    *   \[ x\] Registrar feedback
    *   \[ \] Dashboard admin
    *   \[x \] Visualização atendente
    *   \[ x\] Contestação
    *   \[ \] Notificações email
    *   \[ \] Histórico de score mensal
    *   \[ \] Extensão