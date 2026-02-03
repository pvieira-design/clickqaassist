# Diagnóstico do Atendimento Inicial — Click Cannabis

# Diagnóstico do Atendimento Inicial — Click Cannabis
**Data:** 29 de dezembro de 2025
**Elaborado por:** Análise de Processos
**Para:** João Drummond — Head de Operações
**Classificação:** Documento Interno
* * *
## Sumário Executivo
Este documento apresenta um diagnóstico completo do **Atendimento Inicial** da Click Cannabis, baseado na análise de **20 chats de atendimento** realizados em 29/12/2025, cruzados com a documentação operacional existente.
### Principais Descobertas

| Indicador | Valor |
| ---| --- |
| Chats analisados | 20 |
| Total de erros identificados | 27 |
| Total de acertos identificados | 11 |
| Balanço geral de pontos | \-47 pts |
| Atendentes com performance crítica | 2 (Gabriel Prates, Thiago H. Silva) |
| Atendentes com performance positiva | 2 (Natalia Santos, Andressa Silva) |
| Erro mais frequente | Falta de personalização real (40% dos chats) |
| Conversões realizadas | 7 de 20 (35%) |

### Conclusão Principal
O atendimento inicial possui **estrutura e ferramentas adequadas**, mas sofre de três problemas críticos:
1. **Ausência de liderança** — O departamento não tem líder desde sua criação
2. **Treinamento inexistente** — Onboarding é "acompanhar o colega"
3. **Falta de escuta ativa** — Atendentes seguem scripts sem ouvir o paciente
* * *
## 1\. Estrutura Atual do Departamento
### 1.1 Organização

| Aspecto | Situação Atual |
| ---| --- |
| Equipe | 6 atendentes |
| Liderança | ❌ SEM LÍDER (em busca) |
| Horário de operação | Segunda a sexta, 8h às 21h |
| Fora do horário | Clico (IA) assume 100% |
| Ferramenta principal | ChatGuru |
| CRM | Sistema proprietário Click |

### 1.2 Atendentes Identificados na Análise

| Nome | Chats Analisados | Balanço | Status |
| ---| ---| ---| --- |
| Natalia Santos | 3 | +19 pts | ✅ Referência |
| Andressa Silva | 2 | +10 pts | ✅ Consistente |
| Jéssica Coelho | 2 | \-8 pts | ⚠️ Precisa melhorar |
| Mauro Teixeira | 6 | \-12 pts | 📈 Em evolução |
| Rogério | 1 | +1 pt | ➖ Amostra pequena |
| Thiago H. Silva | 4 | \-23 pts | 🔴 Crítico |
| Gabriel Prates | 3 | \-29 pts | 🔴 Crítico |
| Tiago (outro) | 1 | \-9 pts | 🔴 Crítico |

### 1.3 Ferramentas e Recursos Disponíveis
**ChatGuru:**
*   Diálogos prontos (scripts cadastrados)
*   Campos personalizados sincronizados com CRM
*   Transcrição automática de áudios
*   Hand-off configurável IA → Humano
**Clico (IA):**
*   Nome público: "Rafa" (unissex)
*   Configuração atual: 2 interações antes do hand-off
*   Coleta: tempo de convivência, tratamentos prévios, experiência com cannabis
*   Limitação: não persiste dados no CRM
**CRM:**
*   Criação automática de perfil do usuário
*   Geração de link de pagamento
*   Integração com gateways ([Pagar.me](http://Pagar.me), EFI)
*   Pipeline de acompanhamento
* * *
## 2\. Fluxo Atual do Atendimento Inicial
### 2.1 Diagrama do Fluxo

```perl
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO ATUAL - ATENDIMENTO INICIAL                  │
└─────────────────────────────────────────────────────────────────────────────┘

    SITE                          WHATSAPP                         CRM
    ────                          ────────                         ───
      │                              │                              │
      ▼                              │                              │
┌───────────┐                        │                              │
│ Formulário│ ─── Nome + Patologia ──┼──────────────────────────────┤
│"Falar com │     (mensagem pré-     │                              │
│ Médico"   │      preenchida)       │                              │
└───────────┘                        │                              │
      │                              │                              │
      │  ⚠️ PERDA: 37-40%            │                              │
      │  (não clicam "Enviar")       │                              │
      ▼                              ▼                              │
      ─────────────────────────► CHATGURU ◄────── Webhook ──────────┤
                                     │                              │
                                     ▼                              ▼
                              ┌─────────────┐              ┌──────────────┐
                              │   CLICO     │              │ Cria perfil  │
                              │   (IA)      │◄────────────►│ do usuário   │
                              │             │   Sync IDs   │ no banco     │
                              └─────────────┘              └──────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              Interação 1      Interação 2      Hand-off
              (Tempo de        (Tratamentos     (automático)
              convivência)      prévios)             │
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  ATENDENTE  │
                              │   HUMANO    │
                              └─────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
              Apresentação    Explicação do     Envio link
              + Empatia         processo        pagamento
                    │                │                │
                    │  ⚠️ PERDA: 10% │  ⚠️ PERDA: 36% │
                    │  (ignoram)     │  (não pagam)   │
                    └────────────────┼────────────────┘
                                     │
                                     ▼
                              ┌─────────────┐
                              │  PAGAMENTO  │
                              │  CONFIRMADO │
                              └─────────────┘
                                     │
                                     ▼
                            ══════════════════
                            FIM DO ATENDIMENTO
                                  INICIAL
                            ══════════════════
```

### 2.2 Etapas Detalhadas
**ETAPA 1: Entrada do Lead (Site → WhatsApp)**

| Passo | Descrição | Taxa de Sucesso |
| ---| ---| --- |
| 1.1 | Usuário preenche formulário no site (nome + patologia) | 100% |
| 1.2 | Clica em "Falar com Médico" | 100% |
| 1.3 | É redirecionado para WhatsApp com mensagem pré-preenchida | 100% |
| 1.4 | Clica em "Enviar" no WhatsApp | 60-63% |

**Perda na transição: 37-40% dos leads**
Causas identificadas:
*   Fricção no redirecionamento (alguns Androids abrem web.whatsapp no navegador do Instagram)
*   Expectativa não atendida
*   Curiosidade sem intenção real de compra
* * *
**ETAPA 2: Qualificação pelo Clico (IA)**

| Passo | Descrição | Configuração Atual |
| ---| ---| --- |
| 2.1 | Clico envia boas-vindas personalizadas por patologia | Automático |
| 2.2 | Pergunta 1: "Há quanto tempo você sofre com isso?" | Interação 1 |
| 2.3 | Pergunta 2: "Já fez algum tratamento ou usou medicamentos?" | Interação 2 |
| 2.4 | Hand-off para atendente humano | Após 2 interações |

**Observação crítica:** Os dados coletados pelo Clico (tempo, tratamentos prévios) **NÃO são salvos no CRM** — ficam apenas no histórico do ChatGuru.
* * *
**ETAPA 3: Atendimento Humano**

| Passo | Descrição | Status |
| ---| ---| --- |
| 3.1 | Atendente assume o chat | Tempo médio: 6-10 min |
| 3.2 | Se apresenta ao paciente | ⚠️ Problema frequente |
| 3.3 | Demonstra empatia/conexão | ⚠️ Problema frequente |
| 3.4 | Pergunta se conhece o processo | OK |
| 3.5 | Explica o processo (diálogo pronto ou personalizado) | OK |
| 3.6 | Responde dúvidas sobre preço do medicamento | OK |
| 3.7 | Envia link de pagamento | OK |
| 3.8 | Aguarda confirmação de pagamento | OK |
| 3.9 | Envia link de agendamento | Automático |
| 3.10 | Envia formulário de anamnese | Automático |
| 3.11 | Finaliza com depoimentos do Google | ⚠️ Frequentemente esquecido |

* * *
## 3\. Análise dos Feedbacks (20 Chats)
### 3.1 Resumo Quantitativo

| Métrica | Valor |
| ---| --- |
| Total de chats analisados | 20 |
| Total de mensagens analisadas | ~350 |
| Erros identificados | 27 |
| Acertos identificados | 11 |
| Balanço total | \-47 pontos |
| Média por chat | \-2.35 pontos |
| Conversões (pagamento confirmado) | 7 (35%) |

### 3.2 Distribuição de Erros por Categoria

| Categoria de Erro | Ocorrências | % dos Chats | Impacto Médio |
| ---| ---| ---| --- |
| Resposta genérica / Falta de personalização | 8 | 40% | \-4 pts |
| Saudação duplicada (após Clico) | 7 | 35% | \-5 a -7 pts |
| Não seguiu framework (depoimentos, gancho) | 5 | 25% | \-5 pts |
| Formatação inadequada (áudio, blocos) | 4 | 20% | \-1 pt |
| Demora excessiva na resposta | 3 | 15% | \-3 pts |
| Não respondeu pergunta do paciente | 2 | 10% | \-4 pts |
| Informação incorreta fornecida | 1 | 5% | \-10 pts |

### 3.3 Distribuição de Acertos por Categoria

| Categoria de Acerto | Ocorrências | % dos Chats | Impacto Médio |
| ---| ---| ---| --- |
| Linguagem clara e profissional | 4 | 20% | +4 pts |
| Personalização real do atendimento | 3 | 15% | +6 pts |
| Seguiu protocolo corretamente | 2 | 10% | +5 pts |
| Proatividade em antecipar necessidades | 2 | 10% | +5 pts |

* * *
## 4\. Problemas Identificados — Análise Detalhada
### 4.1 🔴 CRÍTICO: Saudação Duplicada (35% dos chats)
**O que acontece:** O atendente humano diz "Olá", "Oi" ou "Boa noite" **depois que o Clico já saudou o paciente**.
**Exemplos reais dos chats:**
❌ **Errado (Mauro):**
> "Olá, Laiz! Boa noite. 😉 Meu nome é Mauro e estou aqui para te ajudar com seu atendimento!"
❌ **Errado (Gabriel):**
> "Oi Stephanie, tudo bem? Me chamo Gabriel, tô cuidando aqui do seu atendimento..."
❌ **Errado (Thiago):**
> "Oi Douglas, boa noite, tudo bem? Sou o Tiago, vou dar continuidade aqui com o teu atendimento..."
**Por que é problema:**
*   O paciente não sabe que mudou de atendente (Clico → Humano)
*   Parece que a conversa está "recomeçando"
*   Quebra a continuidade do atendimento
*   Soa robótico e impessoal
**Como deveria ser:**
✅ **Correto (Natalia):**
> "Certo, Elaine. Muito obrigada por compartilhar um pouco do seu caso comigo, tá? Muito prazer, eu me chamo Nathalia, sou atendente aqui da CLIC..."
✅ **Correto (Andressa):**
> "Desculpa não me apresentar, meu nome é Andressa 😅"
✅ **Correto (Mauro - após feedback):**
> "Acabei esquecendo de me apresentar 😁 Me chamo Mauro e vou ajudar com o seu atendimento aqui na Click"
* * *
### 4.2 🔴 CRÍTICO: Falta de Personalização Real (40% dos chats)
**O que acontece:** O atendente "personaliza" de forma superficial — apenas repete as patologias que o paciente informou, sem realmente se conectar com a história.
**Exemplo real — Mauro com Marcio:**
O paciente compartilhou:
> "Estava com 70.5 kg. Consegui baixar pra 65. Mudando alimentação e fazendo jejum intermitente."
Resposta do Mauro (ignorou completamente):
> "Márcio, obrigado por compartilhar comigo, imagino que deve ser desafiador para você conviver com essa questão das dores..."
**O que deveria ter feito:**
> "Marcio, parabéns! Perder 5kg com mudança de alimentação e jejum não é fácil, você está no caminho certo. Nosso tratamento pode ajudar a potencializar esses resultados e ainda aliviar as dores nos joelhos..."
* * *
**Exemplo real — Gabriel com Veronika:**
A paciente disse:
> "Já tomei Canabidiol tb"
Gabriel ignorou e seguiu o script genérico, sem explorar:
*   Qual produto ela usou?
*   Por quanto tempo?
*   Teve resultado?
*   Por que parou?
**O que deveria ter feito:**
> "Que bom que você já tem experiência com canabidiol! Isso vai ajudar muito na consulta. O médico vai poder entender o que funcionou e o que pode ser melhorado no seu tratamento..."
* * *
### 4.3 🔴 CRÍTICO: Informação Incorreta (1 caso, mas gravíssimo)
**Chat: Gabriel com Veronika**
Paciente perguntou:
> "Pq importado se já é autorizado no Brasil CBD?"
Resposta do Gabriel:
> "É autorizado no Brasil, é importado porque os medicamentos importados hoje têm mais qualidade, são mais baratos e fazem muito mais sentido para os pacientes."
**Problemas:**
1. Simplificação perigosa
2. Pode ser interpretada como propaganda enganosa
3. Não explica a questão regulatória
4. Não menciona que o médico avaliará o caso específico
**O que deveria saber responder:**
*   Diferença entre produtos nacionais vs importados (variedade, concentração, espectro)
*   Questão regulatória (Anvisa autoriza importação pessoa física com receita)
*   Que existem produtos nacionais aprovados, mas a variedade é limitada
*   Que o médico na consulta explicará melhor qual opção é adequada para o caso
* * *
### 4.4 🟠 GRAVE: Não Seguiu Framework de Fechamento (25% dos chats)
**O que acontece:** Quando o lead diz que "vai pensar", o atendente apenas se despede sem enviar os depoimentos do Google.
**Exemplo real — Jéssica com Eduardo Lima:**
Paciente disse:
> "Posso pensar mais e depois dar sequência por esse canal?"
Jéssica respondeu:
> "Tudo bem, Eduardo! Boas festas 💫"
**O que deveria ter feito:**
> "Claro, Eduardo! Enquanto você pensa, quero te convidar a conhecer a experiência de quem já passou pelo nosso cuidado. Vou te enviar o link do nosso perfil do Google com mais de 1.900 depoimentos de pacientes 💚  
> ➡ Google: [https://bit.ly/3U6l2iL](https://bit.ly/3U6l2iL)"
**Por que importa:**
*   O paciente vai "pensar" e provavelmente pesquisar concorrentes
*   Os depoimentos são prova social que reforça confiança
*   É o último recurso antes de perder o lead para o remarketing
* * *
### 4.5 🟠 GRAVE: Demora Excessiva na Resposta (15% dos chats)
**Casos identificados:**

| Chat | Atendente | Tempo de Espera | Contexto |
| ---| ---| ---| --- |
| Tiago com Douglas | Tiago | 15 minutos | Após hand-off do Clico |
| Mauro com Laiz | Mauro | ~5 minutos | Entre mensagens |
| Mauro com Tais | Mauro | ~4 minutos | Apresentação sem gancho |

**Impacto:**
*   Lead ainda não tem compromisso com a Click
*   Pode estar conversando com concorrentes simultaneamente
*   A empolgação/interesse esfria
*   Passa impressão de desorganização
**Causa provável:** Atendente sobrecarregado com múltiplos chats simultâneos. **Não é necessariamente erro individual**, pode ser problema de dimensionamento da equipe.
* * *
### 4.6 🟡 MODERADO: Formatação Inadequada (20% dos chats)
**Problema 1: Áudios curtos demais ou cortados**
*   Áudios com menos de 7 segundos (cansativo para o paciente)
*   Áudios cortados no final (parece amador)
**Regra correta:**
*   Mínimo 7 segundos para áudio
*   Terminar de falar, esperar 1-2 segundos, depois enviar
*   Se for curto, enviar por texto
**Problema 2: Blocos de texto muito longos**
❌ **Errado:**
> "Tais, o valor dos medicamentos depende da sua prescrição médica. Cada frasco costuma durar de 4 a 8 meses de tratamento, com preços entre R$ 260 e R$ 440. A receita médica tem validade de 6 meses, então você pode avaliar com calma o tratamento e decidir o melhor momento para comprar. Ah! E dá pra parcelar em até 12x no cartão (3x sem juros) 💳"
✅ **Correto (em blocos separados):**
> "Tais, o valor dos medicamentos depende da sua prescrição médica."  
> "Cada frasco costuma durar de 4 a 8 meses de tratamento, com preços entre R$ 260 e R$ 440."  
> "A receita médica tem validade de 6 meses, então você pode avaliar com calma o tratamento e decidir o melhor momento para comprar."  
> "Ah! E dá pra parcelar em até 12x no cartão (3x sem juros) 💳"
* * *
### 4.7 🟡 MODERADO: Não Respondeu Pergunta do Paciente (10% dos chats)
**Exemplo real — Mauro com Allan:**
Paciente perguntou:
> "Certo, entendi. E posso já agendar a consulta **hoje**?"
Mauro ignorou e enviou o script de pagamento:
> "Maravilha, vou te enviar o link para o pagamento dos R$50..."
**Impacto:**
*   Paciente pode interpretar como desatenção
*   Gera desconfiança
*   Pode fazer o paciente repetir a pergunta (frustrante)
* * *
## 5\. Performance Individual dos Atendentes
### 5.1 Ranking Geral

| Posição | Atendente | Chats | Balanço | Média | Tendência |
| ---| ---| ---| ---| ---| --- |
| 1º | Natalia Santos | 3 | +19 pts | +6.3 | ✅ Referência |
| 2º | Andressa Silva | 2 | +10 pts | +5.0 | ✅ Consistente |
| 3º | Rogério | 1 | +1 pt | +1.0 | ➖ Amostra pequena |
| 4º | Jéssica Coelho | 2 | \-8 pts | \-4.0 | ⚠️ Precisa melhorar |
| 5º | Mauro Teixeira | 6 | \-12 pts | \-2.0 | 📈 Em evolução |
| 6º | Tiago | 1 | \-9 pts | \-9.0 | 🔴 Crítico |
| 7º | Thiago H. Silva | 4 | \-23 pts | \-5.75 | 🔴 Crítico |
| 8º | Gabriel Prates | 3 | \-29 pts | \-9.7 | 🔴 Muito crítico |

### 5.2 Análise: O que Natalia e Andressa fazem diferente?

| Comportamento | Natalia/Andressa | Demais Atendentes |
| ---| ---| --- |
| Transição do Clico | "Desculpa não me apresentar..." | "Olá! Boa tarde!" |
| Conexão com história | Menciona detalhes específicos | Repete patologias |
| Empatia | Compartilha experiência pessoal | Frases prontas |
| Gancho | Sempre termina com pergunta | Às vezes esquece |
| Áudios | Completos, >7 segundos | Cortados, curtos |
| Proatividade | Antecipa dúvidas sobre preço | Espera perguntar |
| Fechamento | Envia depoimentos quando lead hesita | Esquece frequentemente |

### 5.3 Análise: O que Gabriel e Thiago fazem de errado?

| Comportamento | Gabriel/Thiago | Impacto |
| ---| ---| --- |
| Saudação duplicada em 100% dos chats | Quebra continuidade |  |
| Áudios cortados no final | Parece amador |  |
| Ignora informações do paciente | Perde oportunidade de conexão |  |
| Respostas genéricas sempre | Não diferencia atendimento |  |
| Não demonstra conhecimento técnico | Passa informação incorreta |  |

* * *
## 6\. Gaps Estruturais Identificados
### 6.1 Ausência de Liderança

| Aspecto | Impacto |
| ---| --- |
| Não há líder no departamento | Feedbacks inconsistentes |
| Líderes de outros departamentos são inexperientes | João Drummond sobrecarregado |
| Não há direcionamento claro | Cada um atende "do seu jeito" |
| Não há reuniões de alinhamento | Erros se repetem |

### 6.2 Treinamento Inexistente

| Aspecto | Situação Atual |
| ---| --- |
| Onboarding | "Acompanhar o colega" |
| Playbook | Existe, mas não validado pelos heads |
| QA estruturado | Não existe (planejado, não implementado) |
| Feedback formal | Apenas 1x1 informais com líderes |
| Métricas de qualidade individual | Não existem no sistema |

### 6.3 Dados Não Persistidos

| Dado | Coletado por | Salvo no CRM? |
| ---| ---| --- |
| Tempo de convivência com patologia | Clico | ❌ Não |
| Tratamentos prévios | Clico | ❌ Não |
| Experiência com cannabis | Clico | ❌ Não |
| Onde conheceu a Click | Clico/Humano | ❌ Não |

**Impacto:** Médicos e marketing perdem contexto que poderia personalizar teleconsulta e segmentar campanhas.
### 6.4 Falta de Alertas Sistêmicos

| Alerta Necessário | Existe? |
| ---| --- |
| Chat esperando há X minutos | ❌ Não |
| PIX não compensado em X minutos | ❌ Não |
| Lead não agendou após pagamento | ❌ Não |
| Atendente com muitos chats | ❌ Não |

* * *
## 7\. Fluxo Ideal Proposto
### 7.1 Princípios do Fluxo Ideal
1. **Continuidade:** O paciente não deve perceber que mudou de atendente
2. **Personalização:** Cada interação deve ser única, baseada no que o paciente disse
3. **Proatividade:** Antecipar dúvidas antes que virem objeções
4. **Consistência:** Mesmo padrão de qualidade independente do atendente
5. **Agilidade:** Tempo máximo de resposta definido e monitorado
### 7.2 Fluxo Ideal — Etapa por Etapa

```yaml
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUXO IDEAL - ATENDIMENTO INICIAL                  │
└─────────────────────────────────────────────────────────────────────────────┘

FASE 1: QUALIFICAÇÃO (CLICO)
────────────────────────────
✅ Clico faz saudação personalizada por patologia
✅ Clico coleta: tempo de convivência + tratamentos prévios + experiência cannabis
✅ Dados são SALVOS no CRM automaticamente
✅ Hand-off após 2 interações

FASE 2: TRANSIÇÃO (HUMANO ASSUME)
─────────────────────────────────
✅ Atendente NÃO diz "Olá/Oi" — conversa já começou
✅ Atendente se apresenta de forma natural: "Esqueci de me apresentar, meu nome é..."
✅ Atendente LEIA o histórico antes de falar
✅ Atendente faz conexão REAL com o que o paciente disse
✅ Tempo máximo para primeira resposta: 3 minutos

FASE 3: EMPATIA E CONEXÃO
─────────────────────────
✅ Demonstrar que ENTENDEU a situação específica do paciente
✅ Validar o sofrimento/desafio
✅ Compartilhar experiência pessoal quando relevante
✅ Fazer pergunta genuína (não genérica)
✅ Terminar SEMPRE com gancho/pergunta

FASE 4: EXPLICAÇÃO DO PROCESSO
──────────────────────────────
✅ Perguntar se já conhece o processo
✅ Se não conhece: explicar em blocos separados
✅ Se conhece: ir direto para dúvidas
✅ Usar áudios quando apropriado (mínimo 7 segundos)
✅ Terminar com "Ficou alguma dúvida?"

FASE 5: TRATAMENTO DE OBJEÇÕES
──────────────────────────────
✅ Preço do medicamento: explicar duração do frasco (4-8 meses)
✅ Prazo de entrega: explicar o porquê (importação)
✅ Por que importar: dar explicação técnica correta
✅ Consulta online: perguntar se já fez antes, normalizar
✅ Sempre terminar com pergunta de avanço

FASE 6: FECHAMENTO
──────────────────
✅ Confirmar disponibilidade para pagar
✅ Enviar link de pagamento
✅ Aguardar confirmação (monitorar timeout)
✅ Enviar link de agendamento automaticamente
✅ Enviar anamnese
✅ Enviar Instagram para acompanhar

FASE 7: LEAD QUE "VAI PENSAR"
─────────────────────────────
✅ Respeitar decisão do paciente
✅ SEMPRE enviar depoimentos do Google
✅ Deixar canal aberto para retorno
✅ Marcar tag correta no CRM (motivo de não conversão)
```

### 7.3 Script de Transição Clico → Humano
**MODELO 1 — Transição suave:**
> "\[Nome\], muito obrigado(a) por compartilhar um pouco do seu caso comigo. Me chamo \[Nome do Atendente\] e vou te ajudar a partir de agora. Imagino que \[X anos/meses\] convivendo com \[patologia\] não deve ser nada fácil, mas estamos aqui para te ajudar. Você já sabe como funciona o processo para iniciar um tratamento com a gente?"
**MODELO 2 — Apresentação tardia:**
> "Ah, esqueci de me apresentar! 😅 Meu nome é \[Nome\] e estou cuidando do seu atendimento. Sobre o que você mencionou de \[detalhe específico que o paciente disse\], isso é muito comum nos pacientes que a gente atende. Posso te explicar como funciona nosso processo?"
**MODELO 3 — Quando paciente já tem experiência:**
> "Que bom que você já tem experiência com \[CBD/canabidiol/tratamento\]! Isso vai ajudar muito na sua consulta. O médico vai poder entender o que funcionou e ajustar o tratamento. A propósito, me chamo \[Nome\]. Você já sabe como funciona aqui na Click?"
### 7.4 Checklist de Qualidade por Atendimento

```coffeescript
□ Não repeti saudação após o Clico
□ Me apresentei de forma natural
□ Li o histórico antes de responder
□ Mencionei algo ESPECÍFICO que o paciente disse
□ Demonstrei empatia genuína
□ Terminei cada mensagem com pergunta/gancho
□ Respondi TODAS as perguntas do paciente
□ Não enviei blocos de texto muito longos
□ Áudios têm mais de 7 segundos e não estão cortados
□ Se lead hesitou: enviei depoimentos do Google
□ Marquei corretamente o status no CRM
```

* * *
## 8\. Recomendações
### 8.1 Ações Imediatas (Esta semana)

| Ação | Responsável | Prazo |
| ---| ---| --- |
| Reunião de alinhamento com os 6 atendentes sobre transição Clico → Humano | João Drummond | 2 dias |
| Compartilhar exemplos de Natalia/Andressa como referência | João Drummond | 2 dias |
| Feedback individual para Gabriel Prates e Thiago H. Silva | João Drummond | 3 dias |
| Criar documento "O que NÃO fazer" com exemplos reais | Operações | 5 dias |

### 8.2 Ações de Curto Prazo (30 dias)

| Ação | Responsável | Prazo |
| ---| ---| --- |
| Contratar líder para Atendimento Inicial | RH + João | 30 dias |
| Implementar treinamento formal de onboarding | Novo líder | 30 dias após contratação |
| Criar FAQ técnico para dúvidas frequentes | Operações | 15 dias |
| Implementar alerta de chat esperando há >5 min | Tech | 20 dias |
| Validar playbook existente com heads/VP | João + VP | 15 dias |

### 8.3 Ações de Médio Prazo (90 dias)

| Ação | Responsável | Prazo |
| ---| ---| --- |
| Implementar QA estruturado | Novo líder + QA | 60 dias |
| Criar dashboard de qualidade por atendente | Tech + Dados | 45 dias |
| Persistir dados do Clico no CRM | Tech | 60 dias |
| Implementar gravação/transcrição para análise | Tech | 90 dias |
| Criar programa de reconhecimento (atendente do mês) | RH + Operações | 90 dias |

### 8.4 Métricas a Monitorar

| Métrica | Meta Sugerida | Frequência |
| ---| ---| --- |
| Tempo de primeira resposta humana | < 3 minutos | Diário |
| Taxa de conversão (lead → pagamento) | \> 25% | Semanal |
| NPS do atendimento inicial | \> 70 | Mensal |
| Balanço médio de pontos por atendente | \> 0 | Semanal |
| % de chats com depoimentos enviados (leads que não converteram) | 100% | Semanal |

* * *
## 9\. Conclusão
O Atendimento Inicial da Click Cannabis possui **infraestrutura técnica adequada** (ChatGuru, CRM, Clico), mas sofre de problemas de **gestão de pessoas e processos**:
### Diagnóstico Resumido

| Área | Status | Prioridade |
| ---| ---| --- |
| Ferramentas | ✅ Adequadas | \- |
| Fluxo técnico | ✅ Funciona | \- |
| Liderança | ❌ Inexistente | 🔴 Urgente |
| Treinamento | ❌ Inexistente | 🔴 Urgente |
| Padronização | ⚠️ Parcial | 🟠 Alta |
| Métricas de qualidade | ❌ Inexistentes | 🟠 Alta |
| Monitoramento | ⚠️ Limitado | 🟡 Média |

### Próximo Passo Crítico
**Contratar líder para o Atendimento Inicial.** Sem essa figura, os demais problemas não serão resolvidos de forma sustentável — qualquer melhoria dependerá de intervenção constante do João Drummond, que já está sobrecarregado.
* * *
## Anexos
### Anexo A: Lista de Chats Analisados

| # | Atendente | Paciente | Balanço | URL |
| ---| ---| ---| ---| --- |
| 1 | Mauro Teixeira | Laiz | \-4 pts | [chatguru.app/...06a](http://chatguru.app/...06a) |
| 2 | Gabriel Prates | Veronika | \-14 pts | [chatguru.app/...112](http://chatguru.app/...112) |
| 3 | Jéssica Coelho | Eduardo Lima | \-7 pts | [chatguru.app/...2f5](http://chatguru.app/...2f5) |
| 4 | Gabriel Prates | Stefany/Thales | \-10 pts | [chatguru.app/...22b](http://chatguru.app/...22b) |
| 5 | Natalia Santos | Elaine/Vinicius | +8 pts | [chatguru.app/...f60](http://chatguru.app/...f60) |
| 6 | Mauro Teixeira | Tais | \-11 pts | [chatguru.app/...4e2](http://chatguru.app/...4e2) |
| 7 | Natalia Santos | Rafaela Perri | +5 pts | [chatguru.app/...b2c](http://chatguru.app/...b2c) |
| 8 | Andressa Silva | Lucileide (filho) | +5 pts | [chatguru.app/...0d8](http://chatguru.app/...0d8) |
| 9 | Natalia Santos | Maicon | +6 pts | [chatguru.app/...d0b](http://chatguru.app/...d0b) |
| 10 | Andressa Silva | Heitor | +5 pts | [chatguru.app/...114](http://chatguru.app/...114) |
| 11 | Gabriel Prates | Mariana | \-5 pts | [chatguru.app/...e93](http://chatguru.app/...e93) |
| 12 | Tiago | Douglas | \-9 pts | [chatguru.app/...a0e](http://chatguru.app/...a0e) |
| 13 | Jéssica Coelho | Paula | \-1 pt | [chatguru.app/...12b](http://chatguru.app/...12b) |
| 14 | Mauro Teixeira | Allan | \-4 pts | [chatguru.app/...de7](http://chatguru.app/...de7) |
| 15 | Mauro Teixeira | Nathália | +6 pts | [chatguru.app/...33c](http://chatguru.app/...33c) |
| 16 | Rogério/Mauro | Ruth (Gerson) | +1 pt | [chatguru.app/...2f2](http://chatguru.app/...2f2) |
| 17 | Thiago H. Silva | Gilberto | \-7 pts | [chatguru.app/...daf](http://chatguru.app/...daf) |
| 18 | Mauro Teixeira | Marcio | \-5 pts | [chatguru.app/...3a9](http://chatguru.app/...3a9) |
| 19 | Thiago H. Silva | Giovana | \-4 pts | [chatguru.app/...f2a](http://chatguru.app/...f2a) |
| 20 | Mauro Teixeira | Milena | \-4 pts | [chatguru.app/...e52](http://chatguru.app/...e52) |

### Anexo B: Erros Mais Graves com Exemplos
**1\. Informação Incorreta (-10 pts)**
*   Atendente: Gabriel Prates
*   Contexto: Paciente perguntou por que importar se CBD é autorizado no Brasil
*   Resposta errada: "É importado porque os medicamentos importados hoje têm mais qualidade, são mais baratos"
*   Resposta correta: Deveria explicar questão regulatória, variedade de produtos, e que o médico avaliará
**2\. Demora de 15 minutos (-3 pts)**
*   Atendente: Tiago
*   Contexto: Após hand-off do Clico
*   Causa provável: Sobrecarga de chats
**3\. Ignorar pergunta direta (-4 pts)**
*   Atendente: Mauro Teixeira
*   Contexto: Paciente perguntou "posso agendar para hoje?"
*   O que aconteceu: Mauro enviou script de pagamento sem responder
* * *
_Documento elaborado com base em análise de 20 chats de atendimento realizados em 29/12/2025._