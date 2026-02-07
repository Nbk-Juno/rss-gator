# RSS Gator

RSS Gator is a command-line RSS feed aggregator built with TypeScript and Node.js. Follow your favorite RSS feeds, automatically fetch new posts, and browse them from your terminal.

## Prerequisites

Before running RSS Gator, make sure you have the following installed:

- **Node.js 22.15.0** (or use the version specified in `.nvmrc`)
- **PostgreSQL** database server
- **npm** (comes with Node.js)

## Installation

1. Clone the repository and navigate to the project directory

2. Install dependencies:
```bash
npm install
```

## Configuration

### 1. Create Config File

Create a configuration file at `~/.gatorconfig.json` with your database connection string:

```json
{
  "db_url": "postgres://username:password@localhost:5432/gator?sslmode=disable"
}
```

Replace `username`, `password`, and database name as needed for your PostgreSQL setup.

### 2. Set Up Database

Run database migrations to create the required tables:

```bash
npm run migrate
```

This will create the following tables:
- `users` - User accounts
- `feeds` - RSS feed sources
- `feed_follows` - User feed subscriptions
- `posts` - Aggregated RSS posts

## Running the CLI

Execute commands using:

```bash
npm start <command> [arguments]
```

## Available Commands

### User Management

#### `register <username>`
Create a new user account and automatically log in.

```bash
npm start register alice
```

#### `login <username>`
Set the current user for subsequent commands.

```bash
npm start login alice
```

#### `users`
List all registered users. The current user is marked with `(current)`.

```bash
npm start users
```

#### `reset`
Delete all users from the database (use with caution).

```bash
npm start reset
```

### Feed Management

#### `addfeed <name> <url>`
Add a new RSS feed and automatically follow it. Requires login.

```bash
npm start addfeed "TechCrunch" "https://techcrunch.com/feed/"
```

#### `feeds`
List all RSS feeds in the database with their creators.

```bash
npm start feeds
```

#### `follow <url>`
Follow an existing feed by URL. Requires login.

```bash
npm start follow "https://blog.boot.dev/index.xml"
```

#### `following`
List all feeds the current user is following. Requires login.

```bash
npm start following
```

#### `unfollow <url>`
Unfollow a feed by URL. Requires login.

```bash
npm start unfollow "https://techcrunch.com/feed/"
```

### Post Aggregation

#### `agg <time_between_reqs>`
Start the RSS feed aggregator in continuous mode. Fetches feeds in rotation and saves posts to the database. Runs until stopped with Ctrl+C.

Time format: `<number><unit>` where unit is `ms`, `s`, `m`, or `h`.

```bash
npm start agg 1m  # Fetch every 1 minute
npm start agg 30s # Fetch every 30 seconds
```

**Note:** Run this in a separate terminal and leave it running in the background while you use other commands.

#### `browse [limit]`
View the latest posts from feeds you follow. Requires login.

Default limit is 2 posts. Specify a number to see more.

```bash
npm start browse     # Show 2 latest posts
npm start browse 10  # Show 10 latest posts
```

## Example Workflow

```bash
# 1. Create a user
npm start register alice

# 2. Add some feeds
npm start addfeed "Hacker News" "https://news.ycombinator.com/rss"
npm start addfeed "TechCrunch" "https://techcrunch.com/feed/"
npm start addfeed "Boot.dev Blog" "https://blog.boot.dev/index.xml"

# 3. Start the aggregator (in a separate terminal)
npm start agg 2m

# 4. Browse posts
npm start browse 5

# 5. Check which feeds you're following
npm start following

# 6. Unfollow a feed if needed
npm start unfollow "https://techcrunch.com/feed/"
```

## Popular RSS Feeds to Try

- **TechCrunch**: https://techcrunch.com/feed/
- **Hacker News**: https://news.ycombinator.com/rss
- **Hacker News (alternate)**: https://hnrss.org/newest
- **Boot.dev Blog**: https://blog.boot.dev/index.xml
- **Wagslane Blog**: https://www.wagslane.dev/index.xml

## Development

### Build TypeScript
```bash
npx tsc
```

### Generate Database Migrations
After modifying `src/schema.ts`:

```bash
npm run generate
npm run migrate
```

## Project Structure

```
rss-gator/
├── src/
│   ├── index.ts              # Main CLI entry point
│   ├── config.ts             # Configuration management
│   ├── schema.ts             # Database schema definitions
│   ├── types.ts              # TypeScript type definitions
│   ├── lib/
│   │   ├── rss.ts           # RSS feed fetching
│   │   └── db/
│   │       ├── index.ts     # Database connection
│   │       └── queries/     # Database query functions
├── migrations/               # Database migration files
└── drizzle.config.ts        # Drizzle ORM configuration
```

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Node.js** - JavaScript runtime
- **PostgreSQL** - Relational database
- **Drizzle ORM** - TypeScript ORM
- **fast-xml-parser** - RSS feed parsing