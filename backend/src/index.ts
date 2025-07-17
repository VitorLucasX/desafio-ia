import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const app = express();
const port = 3001;

const whitelist = [
    'http://localhost:5173', // Acesso para desenvolvimento local
    'https://desafio-ia-vitor.vercel.app' // Acesso para o meu site em produção
];

const corsOptions = {
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Permite requisições sem 'origin' (como Postman ou apps mobile) ou se a origem estiver na whitelist
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Acesso não permitido por CORS'));
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("Chave de API do Google não encontrada.");
}
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/generate-article-stream', async (req: Request, res: Response) => {
  try {
    const { topic, tone } = req.body;

    const prompt = `
      Aja como um especialista em marketing de conteúdo.
      Crie um artigo para blog sobre o tema "${topic}".
      O texto deve ter um tom "${tone}".
      Estruture o artigo com introdução, seções de desenvolvimento com subtítulos e uma conclusão.
      Não adicione nenhuma informação extra ou metadados após o artigo. Gere apenas o texto do artigo em si.
    `;

    // Usamos generateContentStream para obter um fluxo de dados
    const result = await model.generateContentStream(prompt);

    // Definimos o cabeçalho para indicar que é um fluxo de texto
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Iteramos sobre cada pedaço (chunk) do fluxo
    for await (const chunk of result.stream) {
      // Escrevemos o texto do pedaço diretamente na resposta
      res.write(chunk.text());
    }

    // Finalizamos a resposta quando o fluxo termina
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).end('Falha ao gerar o artigo em streaming.');
  }
});


app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});