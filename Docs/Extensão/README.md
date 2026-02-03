# ChatGuru Feedback Extension - Click Cannabis

Extensão do Google Chrome para registrar feedbacks de atendimento no ChatGuru.

## 🚀 Funcionalidades

- **Botões de Feedback**: Adiciona botões de Erro, Atenção e Acerto em todas as mensagens enviadas pela equipe
- **Modal Interativo**: Formulário completo para registrar detalhes do feedback
- **Categorização**: Categorias específicas para cada tipo de feedback
- **Integração Webhook**: Envia automaticamente os dados para o N8N

## 📦 Instalação

### Passo 1: Adicionar Ícones
Antes de instalar, você precisa adicionar os ícones na pasta `icons/`:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)  
- `icon128.png` (128x128 pixels)

Você pode usar qualquer imagem do logo da Click Cannabis ou criar ícones simples.

### Passo 2: Carregar no Chrome

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (toggle no canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta da extensão (`Extensão`)
5. A extensão será instalada e aparecerá na lista

### Passo 3: Usar

1. Acesse o ChatGuru (chatguru.com.br)
2. Abra qualquer conversa
3. Passe o mouse sobre mensagens enviadas pela equipe
4. Clique em **Erro**, **Atenção** ou **Acerto** para registrar feedback

## 📝 Dados Enviados

Quando você registra um feedback, os seguintes dados são enviados para o webhook:

```json
{
  "atendente": "Nome do Atendente",
  "mensagem": "Texto da mensagem ou [Áudio]",
  "data_hora": "05/12/2024 14:30:45",
  "tipo_feedback": "Erro | Atenção | Acerto",
  "categoria_feedback": "Categoria selecionada",
  "observacoes": "Texto opcional",
  "url_chat": "https://chatguru.com.br/...",
  "timestamp": "2024-12-05T14:30:45.000Z"
}
```

## ⚙️ Configuração

### Webhook
O webhook está configurado para:
```
https://clickcannabis.app.n8n.cloud/webhook/receber-feedback
```

Para alterar, edite a variável `WEBHOOK_URL` no arquivo `content.js`.

### Categorias

As categorias podem ser personalizadas no arquivo `content.js`, na constante `CATEGORIAS`:

**Erro:**
- Informação incorreta
- Resposta inadequada
- Tom de comunicação inadequado
- Dados do paciente errados
- Procedimento errado
- Demora na resposta
- Outro

**Atenção:**
- Resposta incompleta
- Precisa revisar
- Dúvida do atendente
- Situação sensível
- Requer follow-up
- Outro

**Acerto:**
- Excelente atendimento
- Resolução rápida
- Boa comunicação
- Procedimento correto
- Paciente satisfeito
- Outro

## 🔧 Ajustes Necessários

A extensão foi criada com seletores genéricos. Pode ser necessário ajustar os seletores CSS no arquivo `content.js` para funcionar corretamente com a estrutura específica do ChatGuru:

1. **Identificação de mensagens enviadas**: Função `isMensagemDaClick()`
2. **Encontrar mensagens**: Função `encontrarMensagens()`
3. **Extrair texto**: Função `extrairTextoMensagem()`
4. **Nome do atendente**: Função `getAtendente()`

## 🐛 Solução de Problemas

**Os botões não aparecem?**
- Verifique se está no domínio correto (chatguru.com.br)
- Abra o Console do Chrome (F12) e procure por erros
- Os seletores podem precisar de ajuste para a estrutura do ChatGuru

**Feedback não envia?**
- Verifique se o webhook está funcionando
- Confira no Console se há erros de rede
- Teste o webhook diretamente com uma ferramenta como Postman

## 📄 Arquivos

```
Extensão/
├── manifest.json     # Configuração da extensão
├── content.js        # Script principal
├── styles.css        # Estilos visuais
├── README.md         # Este arquivo
└── icons/
    ├── icon16.png    # Ícone 16x16
    ├── icon48.png    # Ícone 48x48
    └── icon128.png   # Ícone 128x128
```

## 🎨 Design

A extensão usa uma paleta de cores escura moderna:
- **Erro**: Vermelho (#ff4757)
- **Atenção**: Laranja (#ffa502)
- **Acerto**: Verde (#2ed573)
- **Primária**: Roxo (#7c3aed)

---

Desenvolvido para Click Cannabis 🌿





