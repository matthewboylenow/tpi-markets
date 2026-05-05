import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const altText = (form.get("altText") as string | null) ?? "";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Max file size is 10MB" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Images only" }, { status: 400 });
  }

  const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const [row] = await db
    .insert(images)
    .values({
      url: blob.url,
      blobPathname: blob.pathname,
      altText,
      sourceType: "blob",
    })
    .returning();

  return NextResponse.json(row);
}
