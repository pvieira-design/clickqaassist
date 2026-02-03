# Perguntas e respostas - 1

## Perguntas sobre Usuários e Permissões
1. **Hierarquia de visualização**: O líder consegue ver os feedbacks de todos os atendentes da equipe dele, ou apenas registrar feedbacks? E o admin vê de todos os departamentos?
O lider Consegue ver e registrar feedbacks da equipe dele (preciso configurar como admin quando for cadastrar o usuario qual a área dele e qual a posição dele na área (staff ou lider) - uma área pode ter mais de um lider diferente, o admin ve tudo.
1. **Atendente pode ver feedbacks de outros atendentes?** Ou cada atendente só vê os próprios feedbacks recebidos?
atendente só ve seu proprio feedback, mesmo se for no mesmo chat registrado varios feedbacks.
1. **Um líder pertence a um departamento específico?** (Ex: Breno é líder do Receita & Orçamento, então só vê feedbacks desse time?)
Sim
* * *
## Perguntas sobre o Dashboard
1. **O que você quer ver no dashboard como admin?** Por exemplo:
    *   Score médio por atendente?
    *   Ranking de atendentes?
    *   Feedbacks mais frequentes (top erros)?
    *   Evolução ao longo do tempo?
    *   Filtros por período/departamento/atendente?
isso
1. **O atendente tem dashboard próprio?** Ou só uma lista dos feedbacks que recebeu?
No mvp apenas a lista dos feedbacks, poder entrar em cada um deles, ler o chat, entender os feedbacks.
Precisa ter status de não lido o feedback, quando o atendente entrar, fica como "lido", também precisa de uma funcionalidade para o atendente falar que "Leu e entendeu aquele feedback", como se fosse um botão de "Feedback compreendido"
* * *
## Perguntas sobre Chats e Feedbacks
1. **Um feedback registrado pode ser editado ou removido depois?** Se sim, por quem? (Admin, Líder que registrou, ambos?)
Sim, só pelo admin e lider.
1. **O atendente pode contestar/responder um feedback?** Ou é apenas visualização?
Sim
1. **Precisa guardar o chat completo no sistema?** Ou só as mensagens que receberam feedback, com o link do chat original no ChatGuru?
Sim, chat completo
1. **Um chat pode ser "reavaliado"?** (Ex: alguém já deu feedback e outro admin/líder quer adicionar mais feedbacks no mesmo chat)
Sim
* * *
## Perguntas sobre Score e Métricas
1. **O score é absoluto ou relativo?**
(mensal)
1. **Existe um score "ideal" ou meta?** Ou é só para comparação entre atendentes?
ainda nao
1. **O score negativo é possível?** (Ex: atendente com -50 pontos)
Sim
* * *
## Perguntas sobre Cadastro de Atendentes
1. **Quais informações preciso do atendente no MVP?**
    *   Nome
    *   Email (para login)
    *   Departamento
    *   É líder ou atendente
    *   telefone (opcional)
    *   user\_id (opcional ser preenchido - iremos nos conectar depois com isso no sistema da Click)
2. **Um atendente pode pertencer a mais de um departamento?**
Nao
* * *
## Perguntas sobre Fluxo de Uso
1. **Qual seria o fluxo típico de uso?** Imaginei assim, confirma se está correto:
    1. Admin/Líder acessa o sistema
    2. Cola o link do chat do ChatGuru
    3. Sistema importa o histórico
    4. Admin/Líder lê as mensagens
    5. Ao ver uma mensagem específica, passa o mouse por cima e aparece uma opção de clica em "Adicionar Feedback"
    6. Seleciona o tipo de feedback configurado
    7. Sistema atribui automaticamente ao atendente que enviou aquela mensagem
    8. Score do atendente é atualizado
    9. Depois ele volta para a leitura até finalizar o cadastro de todos os feedbacks daquele chat
    10. clica em finalizar
2. **Existe algum campo de observação/comentário no feedback?** Ou só o tipo pré-configurado?
Sim, é opcional o campo de texto.
* * *
## Perguntas sobre a Extensão (para eu entender o escopo completo)
1. **A extensão seria para facilitar o passo 2-7 acima, direto no ChatGuru?** Ou teria funcionalidades diferentes?
Sim, ela facilitaria onde nao precisaria importar o chat colando o link, eu no proprio chat no chatguru já conseguiria preencher os feedbacks.
A extensão precisa ter a API de enviar o hsitorico completo do chat com os feedbacks registrados
Talvez para enviar o historico do chat seja util usarmos a API atual que temos
Precisa ter a API para puxar os feedback types