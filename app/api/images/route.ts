import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { z } from "zod";

const ExternalSchema = z.object({
  url: z.string().url(),
  altText: z.string().max(256).optional().default(""),
  sourceType: z.enum(["external"]),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(images).orderBy(desc(images.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await req.json();
  const parsed = ExternalSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().formErrors.join(", ") },
      { status: 400 }
    );
  }
  const [row] = await db
    .insert(images)
    .values({
      url: parsed.data.url,
      altText: parsed.data.altText,
      sourceType: "external",
    })
    .returning();
  return NextResponse.json(row);
}
