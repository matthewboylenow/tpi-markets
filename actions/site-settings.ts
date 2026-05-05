"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

const Schema = z.object({
  heroPillText: z.string().min(1).max(128),
  heroH1Part1: z.string().min(1).max(128),
  heroH1Part2: z.string().min(1).max(128),
  heroSubheading: z.string().nullable(),
  emptyStateText: z.string().min(1).max(256),
  emptyStateLinkText: z.string().min(1).max(128),
  stat1Value: z.string().min(1).max(32),
  stat1Label: z.string().min(1).max(64),
  stat2Value: z.string().min(1).max(32),
  stat2Label: z.string().min(1).max(64),
  stat3Value: z.string().min(1).max(32),
  stat3Label: z.string().min(1).max(64),
  stat4Value: z.string().min(1).max(32),
  stat4Label: z.string().min(1).max(64),
  footerTagline: z.string().min(1).max(128),
});

export type SiteSettingsInput = z.infer<typeof Schema>;

export async function saveSiteSettings(input: SiteSettingsInput) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const data = Schema.parse(input);

  await db
    .update(siteSettings)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(siteSettings.id, 1));

  revalidatePath("/", "layout");
  return { ok: true };
}
