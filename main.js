import { ChatGroq } from "@langchain/groq"
import { ChatOpenRouter } from "@langchain/openrouter"
import { TavilySearch } from "@langchain/tavily"
import "dotenv/config"
import express from "express"
import { createAgent, modelFallbackMiddleware } from "langchain"
import { PDFParse } from "pdf-parse"
import fs from "fs/promises"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { OpenAIEmbeddings } from "@langchain/openai"
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory"

const porta = 3001
const app = express()

app.use(express.json())

async function TransformarPDFemTexo(pasta){
    try {
        const pastaComArquivos = await fs.readdir(pasta)

        let textos= []

        for(let item = 0 ; item <pastaComArquivos.length ; item++){
            const arquivos = await fs.readFile(`${pasta}/${pastaComArquivos[item]}`)
            const pdf = new PDFParse({
                data: arquivos
            })
            const conteudoPDF = await pdf.getText()

            textos.push(conteudoPDF.text)
        }

        return textos
    } catch (error) {
        console.log(error.message)
    }
}

const textos = await TransformarPDFemTexo("documentos")
const setChunck = new RecursiveCharacterTextSplitter({
    chunkSize: 1200, 
    chunkOverlap: 200
})
const chuncks = await setChunck.splitText(textos.join("\n"))

const modeloEmbiddings = new OpenAIEmbeddings({
    model: "nvidia/nemotron-3-embed-1b:free",
    apiKey: process.env.API_OPENROUTER,
    configuration: {
        baseURL: "https://openrouter.ai/api/v1"
    }
})

const bancoVetorial = await MemoryVectorStore.fromTexts(chuncks , [] , modeloEmbiddings)
const query = bancoVetorial.asRetriever({
    k: 1
}) 

const modelosOpenrouter = new ChatOpenRouter({
    model: process.env.MODELO_OPENROUTER_1,
    apiKey: process.env.API_OPENROUTER,
    temperature: 0.7,
    models: [
        process.env.MODELO_OPENROUTER_2,
        process.env.MODELO_OPENROUTER_3,
        process.env.MODELO_OPENROUTER_4,
    ],
    route: "fallback"
})

const modeloGroq = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0.7,
    apiKey: process.env.API_GROQ
})

const toolTavily = new TavilySearch({
    tavilyApiKey: process.env.API_TAVILY
})

const agentIA = createAgent({
    model: modelosOpenrouter,
    systemPrompt: "Voce é um grande religioso cristao atualizado, fale com sabedoria, seja curto e direto e reflexivo, TODAS as perguntas devem estar atualizadas e sempre responda com as resposta mais atualziadas para isso use a tool : toolTavily",
    tools: [
        toolTavily
    ],
    middleware: [
        modelFallbackMiddleware(modeloGroq)
    ]
})

const historicoContexto = []

app.post("/conversa", async (req, res) => {
    try {
        const { pergunta } = req.body

        if (!pergunta) {
            return res.status(400).json({ Resposta: "Todos os campos são obrigatorios!" })
        }

        historicoContexto.push({ role: "user", content: pergunta })

        const contexto = await query.invoke(pergunta)
        const textoDoContexto = contexto.map(item => item.pageContent)

        const resposta = await agentIA.invoke({
            messages: [
                ...historicoContexto,
                {
                    role: "user", content: `Responda isso : ${pergunta} dados: ${textoDoContexto}`
                }
            ]
        })

        console.log(contexto)

        historicoContexto.push({role: "assistant" , content : resposta.messages.at(-1).content})

        return res.status(200).json({Resposta: resposta.messages.at(-1).content })
    } catch (error) {
        console.log(error.message)
    }
})

app.get("/conversa/historico", async (req, res) => {
    try {
        if(historicoContexto.length === 0){
            return res.status(404).json({Resposta: "Nenhum dado encontrado!"})
        }

        return res.status(200).json({Resposta: historicoContexto})
    } catch (error) {
        console.log(error.message)
    }
})

app.use((req, res, next) => { res.status(404).json({ Resposta: "Rota não encontrada!" }) })

app.listen(porta, () => {
    console.log("http://localhost:" + porta)
})