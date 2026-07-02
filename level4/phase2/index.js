import express from "express";
import dotenv from "dotenv";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ChatGroq } from "@langchain/groq";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { TaskType } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
dotenv.config();

const app = express();
const port = 5000;

app.use(express.json());

// phase 1
const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY,
  temperature: 0.7,
  maxTokens: 100 /**Only 100 words answer */,
});

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001", // 768 dimensions
  apiKey: process.env.GOOGLE_API_KEY,
  taskType: TaskType.RETRIEVAL_DOCUMENT,
  title: "Document title",
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  url: process.env.QDRANT_URL,
  collectionName: "grocery-store",
  apikey: process.env.QDRANT_API_KEY,
});

app.post("/ai", async (req, res) => {
  const { input } = req.body;
  const documents = await vectorStore.similaritySearch(input, 5);
  const context = documents.map((d) => d.pageContent).join("\n");
  // console.log(documents);
  const response = await llm.invoke([
    new SystemMessage(` You are a RAG AI Assistant.
      STRICT RULES:
      - Answer Only from context
      -Do ot use outside knowledge
      - If answer not found say: "I dont know from the uploaded PDF.
      Context:
      ${context}`),
    new HumanMessage(input),
  ]);
  return res.status(200).json({ ai: response.content });
});

const upload = async () => {
  const pdfPath = "./knowledge.pdf";
  const buffer = fs.readFileSync(pdfPath);
  const pdfResult = new PDFParse({ data: buffer });
  const result = await pdfResult.getText();
  const text = result.text;
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const documents = await splitter.createDocuments([text]);
  await vectorStore.addDocuments(documents);
  //   console.log(documents);
};

// Phase2

app.get("/", (req, res) => {
  return res.json({ message: "hello from level4" });
});

app.listen(port, () => {
  console.log(`Server started at ${port}`);
});
