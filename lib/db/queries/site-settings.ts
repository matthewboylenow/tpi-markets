import { eq } from "drizzle-orm";
import { db } from "../index";
import { siteSettings } from "../schema";

export async function getSiteSettings() {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  return row ?? null;
}
