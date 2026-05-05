import { config } from "dotenv";

config({ path: ".env.local" });
config(); // fall through to .env
