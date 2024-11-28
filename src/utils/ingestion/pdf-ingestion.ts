import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { prepareDocument } from "./prepare-document";
import { embedDocument } from "./embed-document";
import { getPineconeClient } from "../pinecone";
import { convertToAscii } from "../../lib/utils";
import { downloadFromS3 } from "../s3-server";

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};

export async function loadPDFIntoPinecone(
  sourceKey: string,
  chatbotId: string
): Promise<number> {
  // 1. Obtain the pdf -> download and read from pdf
  console.log("Downloading pdf into file system");
  const fileBuffer = await downloadFromS3(sourceKey);
  if (!fileBuffer) {
    throw new Error("could not download from s3");
  }

  // 2. Load PDF
  console.log("loading pdf into memory");
  const loader = new PDFLoader(new Blob([fileBuffer]));
  const pages = (await loader.load()) as PDFPage[];

  // 3. Split and segment the pdf
  const documents = await Promise.all(pages.map(prepareDocument));

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
}
