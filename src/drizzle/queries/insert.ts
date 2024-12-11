import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { getS3Url } from "../../utils/s3-server";
import { db } from "../db";
import { kbSources, subscriptions, users } from "../schema";

export async function insertKbSource(
  chatbotId: string,
  userId: string,
  name: string,
  type: "pdf" | "url" | "docx" | "text" | "txt" | "csv" | "img" | "pptx" | "yt",
  sourceKey: string,
  sourceUrl: string,
  content?: string
): Promise<string> {
  if (
    !["pdf", "url", "docx", "text", "txt", "csv", "pptx", "img", "yt"].includes(
      type
    )
  ) {
    throw new Error(`Unsupported file type: ${type}`);
  }

  const commonValues = {
    chatbotId,
    userId,
    name: name,
    type: type,
    status: "processing",
  };

  let insertValues;

  switch (type) {
    case "pdf":
      insertValues = {
        ...commonValues,
        sourceKey,
        sourceUrl: await getS3Url(sourceKey),
      };
      break;
    case "url":
      insertValues = {
        ...commonValues,
        sourceKey: content ?? sourceKey,
        sourceUrl: content ?? sourceUrl,
      };
      break;
    case "txt":
      insertValues = {
        ...commonValues,
        sourceKey,
        sourceUrl: await getS3Url(sourceKey),
      };
    case "docx":
      insertValues = {
        ...commonValues,
        sourceKey,
        sourceUrl: await getS3Url(sourceKey),
      };
    case "text":
      insertValues = {
        ...commonValues,
        sourceKey: content ?? sourceKey,
        sourceUrl: content ?? sourceUrl,
      };
      break;
    case "csv":
      insertValues = {
        ...commonValues,
        sourceKey,
        sourceUrl: await getS3Url(sourceKey),
      };
    case "img":
      insertValues = {
        ...commonValues,
        sourceKey,
        sourceUrl: await getS3Url(sourceKey),
      };
    case "pptx":
      insertValues = {
        ...commonValues,
        sourceKey,
        sourceUrl: await getS3Url(sourceKey),
      };
    case "yt":
      insertValues = {
        ...commonValues,
        sourceKey: content ?? sourceKey,
        sourceUrl: content ?? sourceUrl,
      };
      break;
    default:
      throw new Error(`Unhandled file type: ${type}`);
  }

  // Insert the KB source record
  const [source] = await db
    .insert(kbSources)
    .values(insertValues as typeof kbSources.$inferInsert)
    .returning();

  return source.id;
}

export async function incrementUserSourcesCount(userId: string) {
  const result = await db
    .select({
      noOfKnowledgeSources: users.noOfKnowledgeSources,
      planName: subscriptions.planName,
    })
    .from(users)
    .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
    .where(eq(users.id, userId));

  if (!result.length) {
    throw new Error("User not found");
  }

  const userPlan = result[0].planName || "Free"; // Assuming planName is a field in the users table
  let maxKnowlegeSources;

  switch (userPlan) {
    case "Free":
      maxKnowlegeSources = 50;
      break;
    case "Basic Plan":
    case "Basic Yearly":
      maxKnowlegeSources = 150;
      break;
    case "Pro Plan":
    case "Pro Yearly":
      maxKnowlegeSources = 300;
      break;
    default:
      throw new Error("Invalid plan");
  }

  const currentChatbotsCount = result[0].noOfKnowledgeSources;

  if (currentChatbotsCount >= maxKnowlegeSources) {
    throw new Error("Maximum number of sources reached for this plan");
  }

  await db
    .update(users)
    .set({ noOfKnowledgeSources: sql`${users.noOfKnowledgeSources} + 1` })
    .where(eq(users.id, userId));
}
