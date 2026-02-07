import { eq } from "drizzle-orm";
import { db } from "../index.js";
import { schema } from "../index.js";

export async function createUser(name: string) {
  const [result] = await db
    .insert(schema.users)
    .values({ name: name })
    .returning();
  return result;
}

export async function getUserByName(name: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.name, name));
  return user;
}

export async function deleteAllUsers() {
  await db.delete(schema.users);
}

export async function getUsers() {
  const users = await db.select().from(schema.users);
  return users;
}
