# Perguntas e respostas - 2

## Perguntas sobre Departamentos
1. **Quais departamentos vamos cadastrar no MVP?** Todos os 11 do ChatGuru ou um subconjunto?
    *   Atendimento Inicial
    *   Consulta Médica
    *   Receita & Orçamento
    *   Documentação
    *   Pós-venda
2. **Departamento terá alguma configuração especial?** Ou só nome mesmo?
Só nome
* * *
## Perguntas sobre Feedback Types (Configuração)
1. **Exemplos de feedback types que você já tem em mente?** Para eu entender melhor a granularidade. Por exemplo:
    *   Positivo: "Resposta rápida" (+5 pts), "Empatia demonstrada" (+3 pts)
Boa pronunica no audio
Usou o script correto do playbook
etc.
*       *   Neutro: "Faltou explicar o processo" (0 pts)
erro ortogra'fico
*       *   Negativo: "Demora na resposta" (-5 pts), "Erro de português" (-2 pts)
Falta de empatia
Falta de personalização na mensagem
Falta de observar detalhes no que o paciente falou antes

1. **Os feedback types são globais ou por departamento?** (Ex: "Não ofereceu agendamento" faz sentido só para Atendimento Inicial)
Global
1. **Feedback types podem ser desativados sem serem deletados?** (Para manter histórico mas não aparecer mais como opção)
Sim
* * *
## Perguntas sobre o Chat Importado
1. **Como identificar qual atendente enviou cada mensagem?**
    *   Pelo campo `author` da API?
    *   Pelo `wa_sender_id`?
    *   Precisa de um mapeamento manual (atendente X = número Y)?
A API irá te enviar
1. **E as mensagens do Clico (IA)?** Elas aparecem como enviadas por um "atendente". Vamos:
    *   Ignorar mensagens do Clico?
    *   Criar um "usuário Clico" no sistema?
    *   Marcar como "automática/bot"?
Veja no doc que enviei sobre a API
1. **Mensagens de áudio/imagem/documento recebem feedback?** Ou só texto?
Vem transcrito
* * *
## Perguntas sobre Contestação do Atendente
1. **Quando o atendente contesta, o que acontece?**
    *   Só registra o texto da contestação?
    *   Muda algum status? (Ex: "Contestado")
Acho legal, mas lembrando que o feedback conestado é atrelado a mensagem, nao ao chat completo. Pode ter um badge na listagem de feedbacks registrados que aquele chat tem contestacao, pode ter uma tab no menu de contestacoes que abre o chat, etc.
*       *   Admin/Líder recebe notificação?
Sim
*       *   Admin/Líder precisa "resolver" a contestação?
Sim
1. **A contestação pode ser respondida pelo admin/líder?** (Vira uma thread de conversa?)
Ambos, sim vira thread
* * *
## Perguntas sobre Notificações
1. **Atendente recebe alguma notificação quando recebe feedback?**
    *   Email?
    *   Só vê quando logar no sistema?
    *   WhatsApp/Slack? (futuro?)
Agora só email
re\_gBKBvUVv\_QDn9QtXWavJszpfSWdAZ2ph7
API Key Resend

1. **Admin/Líder recebe notificação de contestação?**
Sim email
* * *
## Perguntas sobre o Fluxo de "Finalizar" Chat
1. **O que acontece quando clica em "Finalizar"?**
Indica que a revisão inicial foi feita, mas pode adicionar mais depois
1. **Precisa de um status para o chat?** Por exemplo:
    *   "Pendente de revisão"
    *   Revisado pelo atendente
    *   "Finalizado"
    *   "Reavaliado"
Porém precisa tomar cuidado com essa logica para nao quebrar, tem que pensar direito. Pois nao podemos confundir o feedback no chat com o chat por inteiro, lembrando que um chat pode ter feedbacks registrados de diferentes atendentes, etc.
Derrepente o ideal é para cada feedback ter o status mencionado, e não para o chat por inteiro. O chat por inteiro apenas reflete quantos feedbacks naquele chat foram revisados pelo atendente, quantos feedbacks daquele chat tem contestacoes. mas o status é atrelado ao feedback da mensagem
* * *
## Perguntas sobre Visualização do Chat
1. **Como você imagina a tela de leitura do chat?**
    *   Similar ao WhatsApp (balões) - na esquerda paciente na direita mensagens da equipe.
2. **Mensagens que já têm feedback devem ter algum indicador visual?** (Ex: ícone, cor diferente, badge)
Sim, devem ter uma badge com cor especifica de acordo com o feedback (vermelho, amarelo, verde)
* * *
## Perguntas sobre Score Mensal
1. **O score reseta dia 1 de cada mês?** Ou segue o mês comercial da empresa?
Sim
1. **Precisa manter histórico de score dos meses anteriores?** Para ver evolução?
Sim
1. **O dashboard mostra score do mês atual por padrão, com opção de ver meses anteriores?**
Sim
* * *
## Perguntas sobre Login e Acesso
1. **Como será o primeiro acesso do atendente?**
Admin cadastra e envia email com senha temporária?
1. **Precisa de "esqueci minha senha"?**
Ainda nao
* * *
## Perguntas sobre a API/Extensão
1. **A extensão vai precisar de autenticação?** (Login do usuário para saber quem está registrando o feedback)
Agora não precisa, mas se possivel termos algum metodo para saber quantas pessoas estao usando a extensao, seria interessante. Mas tem que tomar cuidado para a extensão nao demandar muito do computador do lider / admin, pois nem todos tem muita memoria ram e bons processadores.
1. **Um usuário pode estar logado em múltiplos dispositivos/abas?**
Sim