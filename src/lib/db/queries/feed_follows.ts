import { db } from "../index.js";
import { schema } from "../index.js";
import { eq, and } from "drizzle-orm";

export async function createFeedFollow(userId: string, feedId: string) {
  const [newFeedFollow] = await db
    .insert(schema.feedFollows)
    .values({ userId, feedId })
    .returning();

  const [result] = await db
    .select({
      id: schema.feedFollows.id,
      createdAt: schema.feedFollows.createdAt,
      updatedAt: schema.feedFollows.updatedAt,
      userId: schema.feedFollows.userId,
      feedId: schema.feedFollows.feedId,
      feedName: schema.feeds.name,
      userName: schema.users.name,
    })
    .from(schema.feedFollows)
    .innerJoin(schema.feeds, eq(schema.feedFollows.feedId, schema.feeds.id))
    .innerJoin(schema.users, eq(schema.feedFollows.userId, schema.users.id))
    .where(eq(schema.feedFollows.id, newFeedFollow.id));

  return result;
}

export async function getFeedFollowsForUser(userId: string) {
  const result = await db
    .select({
      id: schema.feedFollows.id,
      createdAt: schema.feedFollows.createdAt,
      updatedAt: schema.feedFollows.updatedAt,
      userId: schema.feedFollows.userId,
      feedId: schema.feedFollows.feedId,
      feedName: schema.feeds.name,
      userName: schema.users.name,
    })
    .from(schema.feedFollows)
    .innerJoin(schema.feeds, eq(schema.feedFollows.feedId, schema.feeds.id))
    .innerJoin(schema.users, eq(schema.feedFollows.userId, schema.users.id))
    .where(eq(schema.feedFollows.userId, userId));

  return result;
}
