import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }
  const [row] = await db.select().from(images).where(eq(images.id, id));
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (row.sourceType === "blob" && row.blobPathname) {
    try {
      await del(row.url);
    } catch (e) {
      console.warn("Blob delete failed (continuing):", e);
    }
  }
  await db.delete(images).where(eq(images.id, id));
  return NextResponse.json({ ok: true });
}
