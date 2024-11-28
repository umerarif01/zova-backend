import { Document } from "@pinecone-database/doc-splitter";
import { PineconeRecord } from "@pinecone-database/pinecone";
import md5 from "md5";
import { getEmbeddings } from "../embeddings";

export async function embedDocument(doc: Document, sourceKey: string) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
        source: sourceKey,
      },
    } as PineconeRecord;
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}
