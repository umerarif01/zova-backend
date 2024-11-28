import { convertToAscii } from "../../lib/utils";
import { getPineconeClient } from "../pinecone";
import { embedDocument } from "./embed-document";
import { prepareDocument } from "./prepare-document";

export async function loadTextIntoPinecone(text: string, chatbotId: string) {
  try {
    // 1. Prepare the text document
    const documents = await prepareDocument({
      pageContent: text,
      metadata: { loc: { pageNumber: 1 } },
    });

    // 2. Vectorize and embed
    const vectors = await Promise.all(
      documents.flat().map((doc, index) => embedDocument(doc, text))
    );

    // 3. Upload to pinecone
    const client = await getPineconeClient();
    const pineconeIndex = await client.index(process.env.PINECONE_NAMESPACE!);
    const namespace = pineconeIndex.namespace(convertToAscii(chatbotId));

    console.log("inserting vectors into pinecone");
    await namespace.upsert(vectors);

    return documents[0];
  } catch (error) {
    console.error("Error processing text:", error);
    throw error;
  }
}
