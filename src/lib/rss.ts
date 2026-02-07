import { XMLParser } from "fast-xml-parser";
import type { RSSFeed, RSSItem } from "../types.js";

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.statusText}`);
  }

  const xmlData = await response.text();

  const parser = new XMLParser();
  const parsed = parser.parse(xmlData);

  if (!parsed.rss || !parsed.rss.channel) {
    throw new Error("Invalid RSS feed: missing channel");
  }

  const channel = parsed.rss.channel;

  if (!channel.title || !channel.link || !channel.description) {
    throw new Error("Invalid RSS feed: missing required channel fields");
  }

  const title = channel.title;
  const link = channel.link;
  const description = channel.description;

  let itemsArray: any[] = [];
  if (channel.item) {
    if (Array.isArray(channel.item)) {
      itemsArray = channel.item;
    } else {
      itemsArray = [channel.item];
    }
  }

  const items: RSSItem[] = [];
  for (const item of itemsArray) {
    if (
      !item.title ||
      !item.link ||
      !item.description ||
      !item.pubDate ||
      typeof item.title !== "string" ||
      typeof item.link !== "string" ||
      typeof item.description !== "string" ||
      typeof item.pubDate !== "string"
    ) {
      continue;
    }

    items.push({
      title: item.title,
      link: item.link,
      description: item.description,
      pubDate: item.pubDate,
    });
  }

  return {
    title,
    link,
    description,
    items,
  };
}
