import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
  integer,
  serial,
  varchar,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userSystemEnum = pgEnum("user_system_enum", ["system", "user"]);

export const sourceStatusEnum = pgEnum("source_status_enum", [
  "processing",
  "completed",
  "failed",
]);

export const chatbots = pgTable("chatbots", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon"),
  welcomeMessage: text("welcomeMessage").default(
    "Hi! How can I help you today? 👋"
  ),
  model: text("model").default("gpt-4o-mini"),
  background: text("background").default("#a855f7"),
  textColor: text("textColor").default("#000000"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const kbSources = pgTable("kb_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  chatbotId: uuid("chatbotId")
    .notNull()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  sourceKey: text("sourceKey").notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  status: sourceStatusEnum("status").notNull().default("processing"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chatbotId: uuid("chatbotId")
    .notNull()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  firstMessage: text("firstMessage").default("New Conversation"),
  endedAt: timestamp("endedAt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversationId")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tokens = pgTable("tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chatbotId: uuid("chatbotId")
    .notNull()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  dailyTokens: integer("daily_tokens").notNull().default(0),
  date: timestamp("date", { mode: "date" }).notNull(),
});

export const responses = pgTable("responses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chatbotId: uuid("chatbotId")
    .notNull()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  dailyResponses: integer("daily_responses").notNull().default(0),
  date: timestamp("date").notNull().defaultNow(),
});

export const conversationCounts = pgTable("conversation_counts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  chatbotId: uuid("chatbotId")
    .notNull()
    .references(() => chatbots.id, { onDelete: "cascade" }),
  conversationCount: integer("conversation_count").notNull().default(0),
  date: timestamp("date", { mode: "date" }).notNull(),
});

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: text("role"),
  noOfChatbots: integer("no_of_chatbots").notNull().default(0),
  noOfTokens: integer("no_of_tokens").notNull().default(0),
  noOfKnowledgeSources: integer("no_of_knowledge_sources").notNull().default(0),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeProductId: text("stripe_product_id"),
  planName: varchar("plan_name", { length: 50 }),
  subscriptionStatus: varchar("subscription_status", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const recentSubscriptions = pgTable("recent_subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeProductId: text("stripe_product_id"),
  planName: varchar("plan_name", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type DrizzleConversation = typeof conversations.$inferSelect;
export type DrizzleChatbot = typeof chatbots.$inferSelect;
export type InsertChatbot = typeof chatbots.$inferInsert;
export type InsertConversation = typeof conversations.$inferInsert;
export type DrizzleMessage = typeof messages.$inferSelect;
export type DrizzleUser = typeof users.$inferSelect;
export type DrizzleSubscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
