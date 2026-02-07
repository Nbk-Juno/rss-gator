export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export type RSSFeed = {
  title: string;
  link: string;
  description: string;
  items: RSSItem[];
};
