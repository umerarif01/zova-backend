import openai from "../openai";
import { downloadFromS3, getS3Url } from "../s3-server";
import { embedDocument } from "./embed-document";
import { prepareDocument } from "./prepare-document";
import { convertToAscii } from "../../lib/utils";
import { getPineconeClient } from "../pinecone";

export async function loadImageIntoPinecone(
  sourceKey: string,
  chatbotId: string
) {
  try {
    // 1. Get image URL for OpenAI API
    const imageUrl = await getS3Url(sourceKey);
    if (!imageUrl) {
      throw new Error("Could not generate S3 URL");
    }

    // 2. Get image description from OpenAI Vision
    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Please describe this image in detail.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: "Please provide a detailed description of this image.",
            },
          ],
        },
      ],
    });

    const imageDescription = chatCompletion.choices[0].message.content;
    if (!imageDescription) {
      throw new Error("Failed to get image description");
    }

    // 3. Prepare the text document
    const documents = await prepareDocument({
      pageContent: imageDescription,
      metadata: { loc: { pageNumber: 1 } },
    });

    // 4. Vectorize and embed documents
    const vectors = await Promise.all(
      documents.map((doc) => embedDocument(doc, sourceKey))
    );

    // 5. Upload to Pinecone
    const client = await getPineconeClient();
    const pineconeIndex = await client.index(process.env.PINECONE_NAMESPACE!);
    const namespace = pineconeIndex.namespace(convertToAscii(chatbotId));

    console.log("Inserting vectors into Pinecone");
    await namespace.upsert(vectors);

    return vectors.length;
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
}
