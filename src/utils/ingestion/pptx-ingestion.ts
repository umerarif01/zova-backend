import { embedDocument } from "./embed-document";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { downloadFromS3 } from "../s3-server";
import { convertToAscii } from "../../lib/utils";
import { getPineconeClient } from "../pinecone";
import { prepareDocument } from "./prepare-document";

export async function loadPPTXIntoPinecone(
  sourceKey: string,
  chatbotId: string
) {
  try {
    // 1. Obtain the pdf -> download and read from pptx
    console.log("Downloading pptx into file system");
    const fileBuffer = await downloadFromS3(sourceKey);
    if (!fileBuffer) {
      throw new Error("could not download from s3");
    }

    //2. Load and parse the PPTX
    const loader = new PPTXLoader(new Blob([fileBuffer]));
    const pages = await loader.load();

    // 3. Split and segment the content
    const documents = await Promise.all(
      pages.map((page) =>
        prepareDocument({
          pageContent: page.pageContent,
          metadata: { loc: { pageNumber: 1 } },
        })
      )
    );
    // 4. Vectorize and embed individual documents
    const vectors = await Promise.all(
      documents
        .flat()
        .map((doc: any, index: any) => embedDocument(doc, sourceKey))
    );

    // 5. Upload to Pinecone
    const client = await getPineconeClient();
    const pineconeIndex = await client.index(process.env.PINECONE_NAMESPACE!);
    const namespace = pineconeIndex.namespace(convertToAscii(chatbotId));

    console.log("Inserting vectors into pinecone");
    await namespace.upsert(vectors);

    return vectors.length;
  } catch (error) {
    console.error("Error processing PPTX:", error);
    throw error;
  }
}
