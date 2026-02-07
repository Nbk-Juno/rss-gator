import { readConfig, setUser } from "./config.js";
import {
  createUser,
  getUserByName,
  deleteAllUsers,
  getUsers,
} from "./lib/db/queries/users.js";
import {
  createFeed,
  getFeeds,
  getFeedByUrl,
  markFeedFetched,
  getNextFeedToFetch,
} from "./lib/db/queries/feeds.js";
import {
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollowByUserAndUrl,
} from "./lib/db/queries/feed_follows.js";
import { createPost, getPostsForUser } from "./lib/db/queries/posts.js";
import { fetchFeed } from "./lib/rss.js";
import type { Feed, User } from "./schema.js";

type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;
type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;
type CommandsRegistry = Record<string, CommandHandler>;

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(
      `Invalid duration format: ${durationStr}. Expected format: <number><unit> (e.g., 1s, 1m, 1h)`
    );
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);

  if (hours > 0) {
    return `${hours}h${minutes}m${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function parsePublishedDate(dateStr: string): Date | null {
  try {
    // Try parsing as-is (handles ISO 8601 and most RFC 822 formats)
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    return null;
  } catch (error) {
    console.error(`Failed to parse date: ${dateStr}`);
    return null;
  }
}

async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("No feeds to fetch");
    return;
  }

  console.log(`Fetching feed: ${feed.name} (${feed.url})`);

  await markFeedFetched(feed.id);

  try {
    const rssFeed = await fetchFeed(feed.url);
    console.log(`Found ${rssFeed.items.length} posts in ${feed.name}`);

    let savedCount = 0;
    for (const item of rssFeed.items) {
      const publishedAt = parsePublishedDate(item.pubDate);

      try {
        await createPost(
          item.title,
          item.link,
          item.description,
          publishedAt,
          feed.id
        );
        savedCount++;
      } catch (error) {
        // Likely a duplicate URL (unique constraint violation)
        // Silently skip it
      }
    }

    console.log(`Saved ${savedCount} new posts from ${feed.name}`);
  } catch (error) {
    console.error(`Error fetching feed ${feed.name}:`, error);
  }

  console.log("");
}

function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();
    if (!config.currentUserName) {
      throw new Error("No user is currently logged in");
    }

    const user = await getUserByName(config.currentUserName);
    if (!user) {
      throw new Error(`User ${config.currentUserName} not found`);
    }

    await handler(cmdName, user, ...args);
  };
}

function printFeed(feed: Feed, user: User) {
  console.log(`* ID:            ${feed.id}`);
  console.log(`* Created:       ${feed.createdAt}`);
  console.log(`* Updated:       ${feed.updatedAt}`);
  console.log(`* Name:          ${feed.name}`);
  console.log(`* URL:           ${feed.url}`);
  console.log(`* User:          ${user.name}`);
}

function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
) {
  registry[cmdName] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
) {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}

async function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("username is required");
  }
  const username = args[0];
  const user = await getUserByName(username);
  if (!user) {
    throw new Error(`User ${username} not found`);
  }
  setUser(username);
  console.log(`User has been set to ${username}`);
}

async function handlerRegister(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("username is required");
  }
  const username = args[0];

  const existingUser = await getUserByName(username);
  if (existingUser) {
    throw new Error(`User ${username} already exists`);
  }

  const user = await createUser(username);
  setUser(username);
  console.log(`User created successfully:`);
  console.log(user);
}

async function handlerReset(cmdName: string, ...args: string[]) {
  await deleteAllUsers();
  console.log("Database reset successfully");
}

async function handlerUsers(cmdName: string, ...args: string[]) {
  const config = readConfig();
  const currentUser = config.currentUserName;
  const users = await getUsers();

  for (const user of users) {
    if (currentUser && user.name === currentUser) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}

async function handlerAgg(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("agg requires a time_between_reqs argument (e.g., 1s, 1m, 1h)");
  }

  const timeBetweenReqs = args[0];
  const timeBetweenRequests = parseDuration(timeBetweenReqs);

  console.log(`Collecting feeds every ${formatDuration(timeBetweenRequests)}`);

  const handleError = (error: unknown) => {
    if (error instanceof Error) {
      console.error("Error in scrapeFeeds:", error.message);
    } else {
      console.error("Unknown error in scrapeFeeds:", error);
    }
  };

  // Run once immediately
  scrapeFeeds().catch(handleError);

  // Then run on interval
  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  // Wait for SIGINT (Ctrl+C) to stop
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("\nShutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}

async function handlerAddFeed(cmdName: string, user: User, ...args: string[]) {
  if (args.length < 2) {
    throw new Error("addfeed requires name and url arguments");
  }

  const [name, url] = args;

  const feed = await createFeed(name, url, user.id);
  printFeed(feed, user);

  const feedFollow = await createFeedFollow(user.id, feed.id);
  console.log(`${user.name} is now following ${feedFollow.feedName}`);
}

async function handlerFeeds(cmdName: string, ...args: string[]) {
  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`* Name: ${feed.name}`);
    console.log(`* URL: ${feed.url}`);
    console.log(`* User: ${feed.userName}`);
  }
}

async function handlerFollow(cmdName: string, user: User, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("follow requires a url argument");
  }

  const url = args[0];

  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error(`Feed with URL ${url} not found`);
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);
  console.log(`${feedFollow.userName} is now following ${feedFollow.feedName}`);
}

async function handlerFollowing(cmdName: string, user: User, ...args: string[]) {
  const feedFollows = await getFeedFollowsForUser(user.id);

  for (const feedFollow of feedFollows) {
    console.log(`* ${feedFollow.feedName}`);
  }
}

async function handlerUnfollow(cmdName: string, user: User, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("unfollow requires a url argument");
  }

  const url = args[0];

  await deleteFeedFollowByUserAndUrl(user.id, url);
  console.log(`Unfollowed feed with URL: ${url}`);
}

async function handlerBrowse(cmdName: string, user: User, ...args: string[]) {
  let limit = 2;

  if (args.length > 0) {
    const parsedLimit = parseInt(args[0], 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      throw new Error("limit must be a positive number");
    }
    limit = parsedLimit;
  }

  const posts = await getPostsForUser(user.id, limit);

  console.log(`Found ${posts.length} posts:`);
  console.log("");

  for (const post of posts) {
    console.log(`Title: ${post.title}`);
    console.log(`URL: ${post.url}`);
    if (post.description) {
      console.log(`Description: ${post.description}`);
    }
    if (post.publishedAt) {
      console.log(`Published: ${post.publishedAt}`);
    }
    console.log(`Feed: ${post.feedName}`);
    console.log("");
  }
}

async function main() {
  const registry: CommandsRegistry = {};
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("not enough arguments");
    process.exit(1);
  }

  const [cmdName, ...cmdArgs] = args;
  try {
    await runCommand(registry, cmdName, ...cmdArgs);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error(err.message);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
