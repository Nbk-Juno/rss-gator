import { db } from "../index.js";
import { schema } from "../index.js";
import { eq, desc } from "drizzle-orm";

export async function createPost(
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date | null,
  feedId: string
) {
  const [result] = await db
    .insert(schema.posts)
    .values({
      title,
      url,
      description,
      publishedAt,
      feedId,
    })
    .returning();
  return result;
}

export async function getPostsForUser(userId: string, limit: number) {
  const result = await db
    .select({
      id: schema.posts.id,
      createdAt: schema.posts.createdAt,
      updatedAt: schema.posts.updatedAt,
      title: schema.posts.title,
      url: schema.posts.url,
      description: schema.posts.description,
      publishedAt: schema.posts.publishedAt,
      feedId: schema.posts.feedId,
      feedName: schema.feeds.name,
    })
    .from(schema.posts)
    .innerJoin(schema.feeds, eq(schema.posts.feedId, schema.feeds.id))
    .innerJoin(
      schema.feedFollows,
      eq(schema.feeds.id, schema.feedFollows.feedId)
    )
    .where(eq(schema.feedFollows.userId, userId))
    .orderBy(desc(schema.posts.publishedAt))
    .limit(limit);

  return result;
}
