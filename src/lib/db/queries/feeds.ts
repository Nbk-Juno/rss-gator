import { db } from "../index.js";
import { schema } from "../index.js";
import { eq } from "drizzle-orm";

export async function createFeed(name: string, url: string, userId: string) {
  const [result] = await db
    .insert(schema.feeds)
    .values({ name, url, userId })
    .returning();
  return result;
}

export async function getFeeds() {
  const result = await db
    .select({
      id: schema.feeds.id,
      name: schema.feeds.name,
      url: schema.feeds.url,
      createdAt: schema.feeds.createdAt,
      updatedAt: schema.feeds.updatedAt,
      userName: schema.users.name,
    })
    .from(schema.feeds)
    .innerJoin(schema.users, eq(schema.feeds.userId, schema.users.id));
  return result;
}

export async function getFeedByUrl(url: string) {
  const [feed] = await db
    .select()
    .from(schema.feeds)
    .where(eq(schema.feeds.url, url));
  return feed;
}
