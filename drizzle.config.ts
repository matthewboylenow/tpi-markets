import { config } from "dotenv";
import type { Config } from "drizzle-kit";

config({ path: ".env.local" });
config(); // also load .env if present

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
