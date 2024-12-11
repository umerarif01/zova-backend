import { embedDocument } from "./embed-document";
import { prepareDocument } from "./prepare-document";
import { convertToAscii } from "../../lib/utils";
import { getPineconeClient } from "../pinecone";
import { YoutubeTranscript } from "../youtube-transcript";

export async function loadYoutubeIntoPinecone(
  videoUrl: string,
  chatbotId: string
) {
  try {
    // 1. Get transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoUrl, {
      lang: "en",
    });

    if (!transcript) {
      throw new Error("No transcript found for video");
    }

    // 2. Split and segment the content
    const documents = await prepareDocument({
      pageContent: transcript,
      metadata: {
        loc: { pageNumber: 1 },
        url: videoUrl,
      },
    });

    // 3. Vectorize and embed documents
    const vectors = await Promise.all(
      documents.map((doc) => embedDocument(doc, videoUrl))
    );

    // 4. Upload to Pinecone
    const client = await getPineconeClient();
    const pineconeIndex = await client.index(process.env.PINECONE_NAMESPACE!);
    const namespace = pineconeIndex.namespace(convertToAscii(chatbotId));

    console.log("Inserting vectors into Pinecone");
    await namespace.upsert(vectors);

    return vectors.length;
  } catch (error) {
    console.error("Error processing YouTube video:", error);
    throw error;
  }
}
