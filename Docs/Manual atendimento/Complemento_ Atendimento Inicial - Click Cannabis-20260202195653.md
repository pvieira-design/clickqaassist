# Complemento: Atendimento Inicial - Click Cannabis

# Complemento: Atendimento Inicial - Click Cannabis
## Informações Adicionais Não Documentadas Anteriormente
**Documento criado em:** 31/12/2025
**Baseado em:** Entrevista com gestão da Click Cannabis (áudios transcritos)
**Escopo:** Pipeline 1 - Atendimento Inicial
**Propósito:** Complementar a documentação existente com informações que ainda não estavam registradas
* * *
# 1\. Comportamento do Clico em Situações de Incerteza
## 1.1 Quando o Clico Não Sabe Responder uma Pergunta
Uma questão crítica que não estava documentada: **o Clico não admite quando não sabe responder**. Quando recebe uma pergunta para a qual não tem resposta clara, ele continua respondendo o que acredita ser correto, mesmo que esteja errado.
**Implicações práticas:**
*   Não existe transferência automática baseada em "não saber a resposta"
*   O Clico pode dar informações incorretas ao paciente sem que haja supervisão
*   O paciente pode receber uma resposta errada e desistir do atendimento achando que é a verdade
*   Não existe flag ou alerta quando isso acontece
**Quando o Clico realmente transfere para humano:**
1. Quando recebe um **áudio** (o Clico não processa áudio)
2. Quando recebe uma **imagem** (o Clico não lê imagens)
3. Quando atinge o **número de interações configurado** no CMS
**Por que isso é um problema grave:** O Clico pode estar passando informações incorretas sobre preços, processos, prazos ou qualquer outro tema sem que a equipe perceba. Como não existe monitoramento disso, pode haver pacientes desistindo por terem recebido informações erradas, e a Click nunca saberá que isso aconteceu.
* * *
# 2\. Distribuição de Leads Entre Atendentes
## 2.1 Como Funciona a Distribuição Técnica
A distribuição de leads entre os 6 atendentes é feita de forma **proporcional via código**. O Rogério Medeiros (CTO) configura diretamente no código a porcentagem de leads que cada atendente vai receber.
**Configurações possíveis no CMS do Clico:**
*   Quantas interações o Clico terá antes de redirecionar para humano
*   Se o Clico ficará no atendimento completo (sem redirecionar)
*   A porcentagem de leads por atendente (configurado pelo Rogério no código)
**Regra para atendentes novos:** Quando um novo atendente entra na equipe, ele recebe uma **porcentagem de leads menor** do que os demais, até que aprenda como atender. Isso é ajustado manualmente conforme o atendente demonstra evolução.
**Limitação atual:**
*   Não existe interface no CMS para os gestores ajustarem a distribuição
*   Qualquer mudança requer que o Rogério altere diretamente no código
*   Não há critérios documentados de quando aumentar a % de um atendente novo
* * *
# 3\. Sistema de Lembretes e Remarketing
## 3.1 Diferença Entre Lembrete e Remarketing
A Click diferencia dois conceitos que frequentemente são confundidos:

| Tipo | Quando | Custo | Status Atual |
| ---| ---| ---| --- |
| Lembrete | Dentro das primeiras 24 horas | Gratuito (janela de contato gratuita do WhatsApp) | DESATIVADO |
| Remarketing | Após 24 horas | R$ 0,30 por disparo (cobrado pela Meta) | Ativo (apenas 2 automáticos) |

## 3.2 Lembretes das Primeiras 24 Horas - DESATIVADOS
**Situação crítica:** Os lembretes automáticos do Clico nas primeiras 24 horas **não estão ativos atualmente**. Isso significa que a Click está perdendo oportunidades de conversão gratuitas.
**Sequência que era usada quando estava ativo:**
1. **15 minutos** após paciente parar de responder: "\[Nome do paciente\], está por aí?"
2. **3 horas** depois: Testes do Google (depoimentos)
3. **12 horas** depois: Um depoimento em vídeo
**Por que foram desativados:** Não ficou claro na entrevista. O que se sabe é que hoje tentam fazer isso de forma manual, onde cada atendente tenta recuperar os leads da sua caixa dentro das 24 horas. Porém:
*   Não são todos os atendentes que fazem
*   Quando fazem, fazem de forma mal feita
*   Não é o ideal
*   O Clico poderia fazer isso de forma personalizada, fazendo testes A/B para entender o que converte
**Oportunidade perdida:** Lembretes dentro de 24h são gratuitos. Cada remarketing após 24h custa R$ 0,30. Se 100 pacientes param de responder por dia, e 50% poderiam ser recuperados com lembrete gratuito, a Click está:
1. Perdendo conversões que poderiam ser gratuitas
2. Gastando dinheiro em remarketing que poderia ser evitado
## 3.3 Remarketings Automáticos Atuais
**Quantidade:** Apenas 2 remarketings automáticos no atendimento inicial
*   **D+1** (1 dia após o contato sem conversão)
*   **D+3** (3 dias após o contato sem conversão)
**Filtro aplicado:** Só envia para quem nunca recebeu aquele remarketing antes, para evitar que o paciente receba múltiplos disparos do mesmo conteúdo.
**Dias estratégicos para remarketing:**
*   **Quarta e quinta-feira** são os melhores dias para disparar remarketing no atendimento inicial
*   Motivo: serve para encher a agenda da semana (quinta, sexta)
*   Início da semana (segunda/terça) normalmente não precisa porque o final de semana acaba gerando demanda natural
*   Quarta começa a ficar mais fraco, quinta e sexta precisam de remarketing para dar volume
## 3.4 Ausência de Segmentação por Comportamento
**Problema crítico identificado:** Não existe diferença de remarketing baseado no comportamento do paciente. Todos recebem o mesmo fluxo, independentemente de:

| Comportamento | Segmentação Ideal | Situação Atual |
| ---| ---| --- |
| Nunca acessou o link | Remarketing lembrando do link | Fluxo único |
| Acessou o link mas não gerou PIX | Remarketing tirando dúvida sobre pagamento | Fluxo único |
| Gerou PIX mas não pagou | Remarketing urgente ("vi que gerou PIX, precisa de ajuda?") | Fluxo único |
| Respondeu qualificação mas parou depois | Remarketing personalizado com base nas respostas | Fluxo único |

**O que poderia ser feito (tecnicamente viável):** A equipe mencionou que conseguem fazer isso com o banco de dados atual, mas não implementaram por falta de tempo e braços. Por exemplo:
*   Se o usuário acessar o link e 10 minutos depois não pagar, poderia disparar um lembrete automaticamente
*   Isso é tecnicamente possível com os dados que já têm
* * *
# 4\. Objeções e Como São Tratadas
## 4.1 Principais Objeções no Atendimento Inicial
As objeções mais frequentes identificadas na entrevista, em ordem de frequência:
1. **Curioso** - Paciente que só quer saber como funciona, recebe explicação do processo e não dá continuidade
2. **Sem dinheiro** - Não tem condições financeiras para iniciar o tratamento
3. **Queria flor/plantar** - Paciente que queria importar flor (cannabis in natura), mas só é possível importar óleos, jujubas, cremes, tablets e cápsulas
4. **Precisa falar com família** - Paciente precisa consultar cônjuge, pais ou outros familiares antes de decidir
5. **Vai esperar mês que vem** - Paciente adia a decisão para o próximo pagamento/mês
6. **Ignora e some** - Simplesmente para de responder no meio do processo
## 4.2 Paciente com Uso Recreativo de Cannabis
Quando o paciente menciona que já usou cannabis de forma recreativa, existe uma abordagem específica que a equipe deve seguir:
**Pontos a deixar claros:**
1. O tratamento na Click é **medicinal**, conduzido por médico especialista
2. É completamente diferente da forma recreativa
3. É **dosado e medido**
4. O paciente consegue sentir **ainda mais benefícios** na forma medicinal vs. recreativa
**Sobre produtos com THC:** A equipe sabe que pessoas que usaram de forma recreativa **querem THC**. Por isso, deixam claro que os médicos podem prescrever:
*   Produtos com **só CBD**
*   Produtos com **CBD + THC**
*   **Gummies com Delta 9 e THC**
A mensagem é: "Aqui também tem isso, porém seguindo as normas do Brasil."
## 4.3 Paciente que Quer Fumar Cannabis
Quando o paciente diz que queria fumar maconha em vez de usar óleo ou jujuba:
**Abordagem:**
1. Deixar claro os **malefícios de consumir cannabis de forma fumada**
2. Explicar que ele consegue obter os **mesmos benefícios** usando os medicamentos
3. Dar a entender que ele vai "sentir uma ondinha" (sem usar essas palavras, de forma mais profissional)
4. Explicar que se ele **seguir a receita**, não vai sentir efeitos psicoativos
5. Se ele **não seguir a receita** (ex: tomar 2 jujubas em vez de meia), vai sentir efeito
**O que não pode dizer explicitamente:** A equipe não pode falar "se você tomar mais que o prescrito, vai sentir uma onda" - isso precisa ser comunicado de forma mais sutil e profissional. Mas é isso que o paciente quer escutar e a equipe tenta transmitir essa mensagem.
## 4.4 Paciente Pergunta sobre Efeitos Colaterais ou Dependência
**Resposta padrão:** A cannabis medicinal tem **raros efeitos colaterais** e **mínimo risco de dependência**, conforme estudos amplamente conhecidos.
**Problema identificado:** A equipe menciona que existem estudos, mas **não envia esses estudos** para o paciente. Também não enviam artigos do blog da Click sobre o tema. Poderiam estar enviando esse material para reforçar a credibilidade.
## 4.5 Quando a Família do Paciente é Contra
**Situação:** Paciente menciona que a família é contra o tratamento com cannabis.
**Abordagem atual:**
*   Não existe orientação padronizada
*   Vai do feeling de cada atendente
*   O ideal seria **educar o paciente** para que ele possa educar seus familiares
**Reconhecimento:** A equipe reconhece que cannabis ainda é um **tabu grande no Brasil** e que isso afeta a decisão de muitos pacientes.
## 4.6 Objeção "R$ 50 está caro para consulta online"
**Situação:** Paciente acha que R$ 50 é caro para uma consulta online.
**Resposta atual:** O gestor entrevistado não soube informar exatamente como os atendentes argumentam nesse caso. Mencionou que **normalmente isso não acontece**, porque R$ 50 ainda é considerado barato pelo mercado.
**Gap identificado:** Não existe script padronizado para essa objeção específica.
* * *
# 5\. Estratégia de Não Mencionar Preço do Tratamento
## 5.1 Por Que Não Falam do Preço na Explicação do Processo
Uma decisão estratégica importante: a explicação do processo **não menciona a faixa de preço do tratamento** (apenas da consulta de R$ 50).
**Motivos:**
1. **Manter assunto para conversa** - Se explicar tudo de uma vez, não sobra nada para continuar a interação
2. **Ter "munição" para persuasão** - Quando o paciente pergunta, dá oportunidade de entender suas preocupações reais
3. **Identificar objeções reais** - Se o paciente pergunta sobre preço, o atendente pode entender se o problema é realmente preço ou se há outra objeção por trás
4. **Evitar que o curioso desapareça** - Se explicar tudo perfeitamente, o paciente curioso simplesmente some e a Click não consegue entender o porquê
**Como respondem quando perguntam sobre preço:**
1. Falam o **valor médio da unidade** do medicamento
2. Falam **quanto tempo dura** essa unidade (3 a 6 meses)
3. Deixam claro que dá para **parcelar em até 12x** no cartão
4. Fazem uma resposta **personalizada** e terminam **perguntando se faz sentido** para o paciente
**Objetivo final:** Entender se o problema do paciente é preço ou não. A resposta personalizada permite sondar a real objeção.
* * *
# 6\. Paciente com Receita de Outra Clínica
## 6.1 Fluxo Quando Paciente Já Tem Receita
Quando o paciente menciona que já tem uma receita médica de outra clínica/médico:
**Passo 1:** Pedir para o paciente enviar **foto ou arquivo da receita**
**Passo 2:** Validar se a Click consegue vender os medicamentos prescritos na receita
**Cenário A - Click NÃO consegue vender os medicamentos:**
*   Opção 1: Pedir para o paciente **voltar ao médico dele** e pedir para prescrever os produtos corretos que a Click consegue auxiliar na venda
*   Opção 2: Sugerir que o paciente **agende consulta com médicos da Click**, ainda hoje, para ter uma nova receita e seguir com o processo de importação
**Cenário B - Receita é válida e Click consegue vender:**
*   O atendente **transfere o paciente** para a equipe de Receita e Orçamento (Pipeline 3)
* * *
# 7\. Patologias Raras ou Desconhecidas
## 7.1 Como Atendentes Lidam com Patologias que Não Conhecem
**Situação:** Paciente tem uma patologia rara ou que o atendente nunca ouviu falar.
**Fluxo atual:**
1. Segue o **fluxo normal** de atendimento
2. Atendente pode **pesquisar no Google**, ChatGPT ou outras IAs
3. Não existe base de conhecimento interna para consulta
**Gap identificado:**
*   Não existe **base de conhecimento interna** para os atendentes consultarem
*   Cada um se vira como pode
*   Não há garantia de que a informação pesquisada está correta
*   Não existe validação do que o atendente diz sobre patologias específicas
* * *
# 8\. Limitações Técnicas do ChatGuru
## 8.1 O Que o ChatGuru Não Consegue Fazer
Diversas limitações técnicas foram identificadas que afetam a operação:
**Tempo de resposta:**
*   Não conseguem medir **tempo médio de resposta** dos atendentes
*   Não existe SLA definido (apenas falam "tem que ser o mais rápido possível")
*   Não conseguem acessar histórico do chat de forma estruturada para fazer esse cálculo
**API de exportação:**
*   Existe uma API/gambiarra que o Rogério fez para exportar histórico do chat
*   Porém é **manual e demora** para fazer
*   Não é uma query que já puxa tudo direto
*   Não serve para monitoramento em tempo real
**Indicadores ausentes:**
*   Não existe indicador no ChatGuru que mostra quantas vezes o lead já interagiu com o Clico
*   Não existe indicador de tempo médio de resposta
*   Não existe dashboard de performance por atendente dentro do ChatGuru
* * *
# 9\. Diálogos do ChatGuru - Problema de Organização
## 9.1 Quem Criou os Diálogos
Os diálogos prontos do ChatGuru foram criados por diferentes pessoas:

| Criador | O que criou |
| ---| --- |
| João Drummond | Maior parte dos diálogos de atendimento |
| Pedro Motta | Configuração inicial do ChatGuru + PipeDrive + sistema |
| Equipe de Tecnologia | Diálogos padrões do processo |

## 9.2 Tipos de Diálogos Existentes
1. **Facilitadores de resposta** - Scripts para agilizar respostas comuns
2. **De sistema** - Automações e integrações
3. **Alteração de etapa do funil** - Exemplos: "consulta confirmada", "pagamento confirmado"
## 9.3 Problema Crítico: Desorganização
**Situação atual:**
*   Os diálogos estão **desorganizados** - é um grande problema
*   **Não está claro o que é usado e o que não é**
*   O João foi criando vários diálogos, um depois do outro, **sem organizar**
*   Agora têm **"preguiça de parar e organizar"** (palavras do gestor)
**Impacto:**
*   Atendentes podem estar usando diálogos desatualizados
*   Podem existir diálogos redundantes ou conflitantes
*   Não há documentação de qual diálogo usar em qual situação
*   Dificulta treinamento de novos atendentes
* * *
# 10\. O Figma como "Cola" - Problema do Copiar e Colar
## 10.1 Existe um Figma de Processos
A equipe utiliza um **Figma que lista detalhes do processo** e serve como "cola" para os atendentes. Porém, isso criou um problema comportamental.
**Problema identificado:** As pessoas ficaram **viciadas em copiar texto e colar**. Em vez de personalizar as respostas, os atendentes simplesmente copiam o texto do Figma e colam no chat, resultando em:
*   Atendimento robótico
*   Falta de personalização
*   Paciente percebe que está recebendo texto copiado
*   Perde a humanização que deveria diferenciar do Clico
**Observação do gestor:** "O Figma fez com que as pessoas ficassem viciadas em copiar texto e colar - isso é um problema."
* * *
# 11\. Trabalho Remoto e Supervisão
## 11.1 Modelo de Trabalho Atual
**Configuração:**
*   Todos os 6 atendentes **trabalham de casa** (home office)
*   Existe **1 encontro presencial por mês** onde todos trabalham juntos
**Impacto reconhecido:** O trabalho 100% remoto **afeta a qualidade e a supervisão**, principalmente porque:
*   Não existe líder do atendimento inicial atualmente
*   Não há supervisão em tempo real
*   Difícil garantir que todos estão seguindo os processos
*   Complexidade adicional para dar feedback
## 11.2 Horário de Pico Identificado
**Horário de maior demanda:** Entre **11h e 14h**
**Como gerenciam:** Não ficou claro na entrevista se existe alguma estratégia específica para esse horário (escala diferente, mais atendentes online, etc.).
## 11.3 Pausas Durante o Expediente
**Quando atendente precisa pausar (banheiro):**
*   Nada muda, os leads continuam chegando na caixa dele
**Quando atendente vai almoçar:**
*   Outro atendente assume a caixa dele e recebe os leads
* * *
# 12\. Daily e Reuniões
## 12.1 Reunião Diária
**Existe daily:** Sim, todos os dias
**Quem participa:**
*   Toda a equipe de atendimento (do atendimento inicial até pós-venda)
**Quem NÃO participa:**
*   Médicos - apenas atendentes e equipe operacional
**Escopo:** Não ficou detalhado na entrevista o que é discutido na daily, mas presume-se que seja alinhamento de prioridades e problemas do dia anterior.
* * *
# 13\. Identificação de Baixa Performance
## 13.1 Métricas Usadas
Para identificar se um atendente não está performando bem, são observadas:
1. **Taxa de conversão** do atendente
2. **Quanto tempo fica online** trabalhando
3. **Tempo de resposta**
4. **Qualidade da resposta**
## 13.2 Processo Atual - Muito Manual
**Problema principal:** O processo de identificar baixa performance é **muito manual**:
*   Não existem triggers ou avisos automáticos
*   Não existe nenhum alerta quando algo está errado
*   É necessário **entrar no dashboard** manualmente
*   É necessário **ver chat por chat** do atendente para entender o que está errando
**Consequência:** Problemas de performance podem demorar muito para serem identificados, e quando são, já causaram impacto em vários pacientes.
* * *
# 14\. ClickFlix - Sistema de Treinamento (2026)
## 14.1 O Que é o ClickFlix
Uma plataforma nova que está sendo desenvolvida para **melhorar treinamento e qualidade** do atendimento.
**Componentes:**
1. **Aulas de treinamento** - Plataforma para subir conteúdos educativos
2. **Sistema de reporte de erros** - Integrado ao ChatGuru
3. **Extensão no ChatGuru** - Ao passar o mouse por cima de uma mensagem, aparecem opções para registrar pontos de melhoria
4. **CMS do ClickFlix** - Onde os feedbacks vão parar e o atendente pode ver
## 14.2 Sistema de Pontuação
O ClickFlix terá um sistema de pontuação para avaliar atendentes:

| Tipo de Registro | Efeito na Pontuação |
| ---| --- |
| Erro | Perde pontos |
| Ponto de atenção | Neutro (não ganha nem perde) |
| Acerto | Ganha pontos |

**Resultado:** Cada atendente terá uma **média de pontos** que reflete sua performance.
## 14.3 Status Atual
**Quando será lançado:** 2026
**Situação hoje:**
*   Atendentes **não têm acesso a nenhuma aula**
*   Não têm acesso a **gravações de atendimentos bem-sucedidos**
*   Não existe nada disso atualmente
*   Começam a ter isso no ano que vem (2026)
* * *
# 15\. Conteúdo Educativo - O Que Não Funciona
## 15.1 PDFs Não Funcionam
A Click já tentou enviar **PDFs** durante o atendimento inicial, mas **ninguém lia**.
**Aprendizado:** Abandonaram o envio de PDFs educativos porque não tinha engajamento.
## 15.2 O Que Usam Hoje
*   **Explicação verbal (áudio)**
*   **Explicação escrita (texto)**
*   **Imagens com texto** - Apenas no remarketing, não no atendimento ativo
## 15.3 O Que Poderiam Usar Mas Não Usam
Mesmo quando o paciente pergunta sobre efeitos colaterais ou quando mencionam que existem estudos científicos, a equipe:
*   **Não envia artigos do blog** da Click
*   **Não envia estudos científicos**
*   **Não envia nenhum material de apoio**
Isso foi identificado como uma oportunidade perdida de educação e reforço de credibilidade.
* * *
# 16\. Registro de Informações da Qualificação Clínica
## 16.1 Situação Atual
As respostas da qualificação clínica (tempo de patologia, tratamentos anteriores, experiência com cannabis) **não ficam registradas** em nenhum lugar estruturado. Ficam apenas no histórico do chat.
**Consequências:**
*   O médico **não tem acesso** a essas informações de forma estruturada
*   Informações valiosas para a consulta são perdidas
*   Paciente pode ter que repetir informações na consulta
## 16.2 Plano de Melhoria
Uma das iniciativas em andamento:
*   **Resumir na anamnese** toda a qualificação clínica para o médico
*   O médico teria as respostas da anamnese + texto de resumo da qualificação clínica
**Quem está fazendo:**
*   Pedro Motta já está fazendo uma **automação com N8N** para criar essa anotação
*   Porém, o ideal seria o Rogério Medeiros fazer isso junto à equipe de tecnologia (integração mais robusta)
* * *
# 17\. Ausência de Documentação e Padrões
## 17.1 O Que NÃO Existe Atualmente

| Item | Existe? | Observação |
| ---| ---| --- |
| Checklist de atendimento | ❌ Não | Cada atendente faz de um jeito |
| Playbook | ❌ Não | Não existe material estruturado |
| Manual | ❌ Não | Não existe documento de referência |
| Regras documentadas | ❌ Não | Não há regras claras escritas |
| IA para atendente tirar dúvidas | ❌ Não | Não existe base de conhecimento ou IA de apoio |

**Citação do gestor:** "Não existe um checklist, não existe um playbook, não existe um manual, não existe regras, não existe uma IA que ele pode tirar dúvida. Tudo isso poderia e deveria existir."
## 17.2 Como Atendente Novo Aprende
**Processo atual de onboarding:**
1. Vendo a equipe trabalhar
2. Perguntando aos colegas
3. Atendendo na prática
4. Recebendo feedbacks ativos sobre erros e acertos
**O que não existe:**
*   Material de onboarding estruturado
*   Treinamento formal
*   Aulas gravadas
*   Exemplos de bons atendimentos
* * *
# 18\. Lacunas de Conhecimento Identificadas
## 18.1 O Que Ainda Não Sabemos (e precisamos descobrir)
### Sobre Métricas e Performance
*   \[ \] Qual é a **taxa de conversão atual** do atendimento inicial? (lead → pagamento de consulta)
*   \[ \] Qual é a **taxa de conversão por atendente** individual?
*   \[ \] Qual é o **tempo médio** do primeiro "olá" até o pagamento confirmado?
*   \[ \] Quantos **atendimentos simultâneos** cada atendente consegue fazer em média?
*   \[ \] Quanto tempo cada atendente **fica online** por dia em média?
*   \[ \] Qual é a **escala de horários** dos 6 atendentes?
### Sobre Scripts e Mensagens
*   \[ \] Qual é o **texto exato do Figma** que os atendentes usam como "cola"?
*   \[ \] Quais são os **diálogos específicos** do ChatGuru usados no atendimento inicial? (lista completa)
*   \[ \] Qual é o **texto exato da "Explicação do Processo"** na versão Clico e na versão humana?
*   \[ \] Qual é o **conteúdo exato** dos remarketings automáticos (D+1 e D+3)?
*   \[ \] Quais são **todas as mensagens de remarketing** usadas no inicial?
*   \[ \] O que são os "**testes do Google**" mencionados no lembrete de 3h?
### Sobre Objeções
*   \[ \] Como exatamente o atendente **argumenta quando paciente diz que R$50 está caro**?
*   \[ \] Quais são **todas as abordagens** usadas para pacientes com medo/receio?
*   \[ \] Existe algum **comparativo com concorrentes** usado quando paciente diz que vai pesquisar?
### Sobre Operação
*   \[ \] Como funcionam os **horários de trabalho** dos atendentes? (turnos, escalas)
*   \[ \] Quem **substitui quem** no horário de almoço?
*   \[ \] Como funciona a **cobrança por remarketing** pela Meta? (processo, limites)
*   \[ \] Existe alguma **métrica de satisfação** do paciente no atendimento inicial?
### Sobre Treinamento
*   \[ \] Como é o **processo de onboarding** formal de um atendente novo? (duração, etapas)
*   \[ \] Quais são os **feedbacks mais comuns** dados aos atendentes?
*   \[ \] Como funciona exatamente a **extensão de reporte do ClickFlix**?
### Sobre Tecnologia
*   \[ \] Como funciona exatamente a **API de exportação do histórico** do ChatGuru?
*   \[ \] Quais **métricas** o ChatGuru consegue fornecer nativamente?
*   \[ \] O CRM tem alguma **integração** que possa ajudar no atendimento inicial?
* * *
# 19\. Problemas Identificados - Resumo
## 19.1 Problemas Críticos (Impacto Alto)

| # | Problema | Evidência |
| ---| ---| --- |
| 1 | Lembretes nas primeiras 24h desativados | Oportunidade de conversão gratuita perdida |
| 2 | Clico responde mesmo sem saber | Pode dar informações incorretas |
| 3 | Nenhuma segmentação de remarketing | Todos recebem o mesmo fluxo independente do comportamento |
| 4 | Informações da qualificação clínica não são registradas | Médico não tem acesso ao que foi coletado |
| 5 | Nenhum checklist, playbook ou manual | Atendentes fazem cada um de um jeito |
| 6 | Diálogos do ChatGuru desorganizados | Não está claro o que é usado |
| 7 | Não existe SLA de tempo de resposta | Nem conseguem medir o tempo médio |
| 8 | Falta de liderança | Não existe líder do atendimento inicial |
| 9 | Atendentes não leem histórico | Perdem contexto, fazem perguntas repetidas |
| 10 | Atendimento robótico (copiar/colar do Figma) | Falta personalização |

## 19.2 Problemas Operacionais (Impacto Médio)

| # | Problema | Evidência |
| ---| ---| --- |
| 11 | Trabalho 100% remoto sem supervisão adequada | Afeta qualidade |
| 12 | Não existe conteúdo educativo efetivo | PDFs não funcionaram, não testaram outros formatos |
| 13 | Não enviam estudos/artigos quando mencionam | Perdem oportunidade de educar |
| 14 | Abordagem para objeções não padronizada | Cada um faz de um jeito |
| 15 | Follow-up manual nas primeiras 24h | Não são todos que fazem, fazem mal feito |
| 16 | Não existe base de conhecimento interna | Atendente pesquisa no Google/ChatGPT |
| 17 | Identificação de baixa performance muito manual | Precisa ver chat por chat |

* * *
# 20\. Oportunidades de Melhoria - Resumo
## 20.1 Quick Wins (Implementação Rápida)
1. **Ativar lembretes das primeiras 24h** — são gratuitos e aumentam conversão
2. **Criar anotação automática** com resumo da qualificação para o médico (N8N já em andamento)
3. **Documentar as respostas para objeções** — criar playbook mínimo
4. **Organizar diálogos do ChatGuru** — identificar o que é usado
5. **Criar checklist simples** de etapas obrigatórias do atendimento
## 20.2 Melhorias Estruturais
1. **Segmentar remarketing** por comportamento (acessou link / gerou PIX / nunca acessou)
2. **Criar mensagens específicas por patologia** — pelo menos para top 4
3. **Implementar registro** das respostas da qualificação clínica
4. **Criar base de conhecimento** para atendentes consultarem
5. **Definir SLA de tempo de resposta** e conseguir medir
## 20.3 Melhorias de Qualidade
1. **Contratar líder** para o atendimento inicial
2. **Implementar QA** (auditoria de conversas)
3. **Criar treinamento formal** de onboarding
4. **Implementar ClickFlix** com exemplos de bons atendimentos
5. **Criar IA de apoio** para atendentes tirarem dúvidas
6. **Configurar Clico** para transferir quando não souber responder
* * *
**Documento mantido por:** Claude (IA)
**Última atualização:** 31/12/2025
**Status:** Complemento da documentação existente - Pronto para uso