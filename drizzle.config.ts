import { defineConfig } from "drizzle-kit";
import fs from "fs";
import os from "os";
import path from "path";

function getDbUrl(): string {
  const configPath = path.join(os.homedir(), ".gatorconfig.json");
  const configData = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  return configData.db_url;
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: getDbUrl(),
  },
});
