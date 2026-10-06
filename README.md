# RAG com banco vetorial local

API de conversa que lê os PDFs da pasta `documentos`, divide o texto em trechos e recupera contexto por similaridade para responder perguntas. O agente também possui busca com Tavily e fallback de modelos.

## Tecnologias

JavaScript, Node.js, Express, LangChain, MemoryVectorStore, OpenAIEmbeddings com OpenRouter, Groq, Tavily, pdf-parse e dotenv.

## Como iniciar

1. Instale Node.js e npm em versão compatível com as dependências.
2. Clone o projeto e instale os pacotes:

```bash
git clone https://github.com/joseaugustodearaujoaraujo1-lgtm/RAG_banco_vetorial_local.git
cd RAG_banco_vetorial_local
npm install
```

3. Copie `.env.example` para `.env`. Preencha `API_OPENROUTER`, `API_GROQ` e `API_TAVILY`, e configure `MODELO_OPENROUTER_1` até `MODELO_OPENROUTER_4` com modelos disponíveis na sua conta.
4. Coloque os PDFs que deseja consultar em `documentos/`.
5. Inicie pela raiz do projeto:

```bash
node main.js
```

A API usa `http://localhost:3001`. A leitura dos PDFs e a geração dos embeddings acontecem antes de o servidor começar a receber requisições.

## Como testar

Envie um `POST` para `http://localhost:3001/conversa`, com `Content-Type: application/json`:

```json
{
  "pergunta": "Qual é o assunto principal dos documentos?"
}
```

Consulte o histórico com `GET /conversa/historico`.

## Observações

- A base vetorial e o histórico ficam na memória do processo e são recriados ao reiniciar.
- O armazenamento vetorial é local, mas embeddings, respostas e buscas dependem de serviços externos e de internet.
- O modelo de embeddings está definido em `main.js`; sua execução depende da disponibilidade desse modelo no OpenRouter.
- O comando `npm run dev` usa nodemon, que não está declarado no package.json atual. O comando `node main.js` evita essa dependência.
