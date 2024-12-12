// --es-module-specifier-resolution=node

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import {
  incrementUserSourcesCount,
  insertKbSource,
} from "./drizzle/queries/insert";
import { loadPDFIntoPinecone } from "./utils/ingestion/pdf-ingestion";
import { loadURLIntoPinecone } from "./utils/ingestion/url-ingestion";
import { loadDocxIntoPinecone } from "./utils/ingestion/docx-ingestion";
import { loadTxtIntoPinecone } from "./utils/ingestion/txt-ingestion";
import { loadCSVIntoPinecone } from "./utils/ingestion/csv-ingestion";
import { loadTextIntoPinecone } from "./utils/ingestion/text-ingestion";
import { loadPPTXIntoPinecone } from "./utils/ingestion/pptx-ingestion";
import { loadImageIntoPinecone } from "./utils/ingestion/image-ingestion";
import { kbSources } from "./drizzle/schema";
import { db } from "./drizzle/db";
import { config } from "dotenv";
import { loadYoutubeIntoPinecone } from "./utils/ingestion/youtube-ingestion";

config({ path: ".env" }); // or .env.local

const app = express();
const port = process.env.PORT! || 3000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "https://zova.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.post("/api/ingest-source", async (req: Request, res: Response) => {
  try {
    const { file_key, file_name, chatbotId, type, content, userId } = req.body;

    if (!chatbotId || typeof chatbotId !== "string") {
      res.status(400).json({ error: "invalid chatbotId" });
      return;
    }

    console.log(file_key, file_name, chatbotId, type, content, userId);

    const sourceId = await insertKbSource(
      chatbotId,
      userId,
      file_name,
      type,
      file_key,
      file_key,
      content ?? ""
    );

    // Process in background based on type
    let processPromise;
    switch (type) {
      case "pdf":
        processPromise = loadPDFIntoPinecone(file_key, chatbotId);
        break;
      case "url":
        processPromise = loadURLIntoPinecone(content, chatbotId);
        break;
      case "docx":
        processPromise = loadDocxIntoPinecone(file_key, chatbotId);
        break;
      case "text":
        processPromise = loadTextIntoPinecone(content, chatbotId);
        break;
      case "txt":
        processPromise = loadTxtIntoPinecone(file_key, chatbotId);
        break;
      case "pptx":
        processPromise = loadPPTXIntoPinecone(file_key, chatbotId);
        break;
      case "img":
        processPromise = loadImageIntoPinecone(file_key, chatbotId);
        break;
      case "csv":
        processPromise = loadCSVIntoPinecone(file_key, chatbotId);
        break;
      case "yt":
        processPromise = loadYoutubeIntoPinecone(file_key, chatbotId);
        break;
      default:
        throw new Error("Unsupported file type");
    }

    processPromise
      .then(async () => {
        await db
          .update(kbSources)
          .set({ status: "completed" })
          .where(eq(kbSources.id, sourceId));
        await incrementUserSourcesCount(userId);
      })
      .catch(async (error) => {
        console.error("Failed to process document:", error);
        await db
          .update(kbSources)
          .set({ status: "failed" })
          .where(eq(kbSources.id, sourceId));
      });

    res.status(200).json({ sourceId: sourceId });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "internal server error" });
    return;
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
