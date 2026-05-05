import "./load-env";
import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { images } from "../lib/db/schema";

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

const EXT_FROM_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

function isBlobUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

function deriveFilename(id: number, sourceUrl: string, contentType: string | null): string {
  const ctExt = contentType ? EXT_FROM_CONTENT_TYPE[contentType.split(";")[0].trim().toLowerCase()] : undefined;

  let base: string | undefined;
  let urlExt: string | undefined;
  try {
    const u = new URL(sourceUrl);
    // Next.js image proxy: real path is in the `url` query param
    const proxied = u.searchParams.get("url");
    const target = proxied ? proxied : u.pathname;
    const last = target.split("/").filter(Boolean).pop() ?? "";
    const decoded = decodeURIComponent(last);
    const dot = decoded.lastIndexOf(".");
    if (dot > 0) {
      base = decoded.slice(0, dot);
      urlExt = decoded.slice(dot + 1).toLowerCase();
    } else if (decoded) {
      base = decoded;
    }
  } catch {
    // ignore, fall through
  }

  const ext = ctExt ?? urlExt ?? "jpg";
  const slug = (base ?? `image-${id}`)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `image-${id}`;

  return `migrated/${id}-${slug}.${ext}`;
}

async function fetchAsBuffer(url: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "tpi-markets-migrator/1.0",
      Accept: "image/*,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return { buffer: Buffer.from(arrayBuf), contentType: res.headers.get("content-type") };
}

async function main() {
  const rows = await db.select().from(images);
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (isBlobUrl(row.url)) {
      skipped++;
      console.log(`#${row.id}  skip (already on Blob): ${row.url}`);
      continue;
    }

    try {
      const { buffer, contentType } = await fetchAsBuffer(row.url);
      const pathname = deriveFilename(row.id, row.url, contentType);

      const blob = await put(pathname, buffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: contentType ?? undefined,
      });

      await db
        .update(images)
        .set({
          url: blob.url,
          blobPathname: blob.pathname,
          sourceType: "blob",
        })
        .where(eq(images.id, row.id));

      migrated++;
      console.log(`#${row.id}  ✅  ${row.url}\n        → ${blob.url}`);
    } catch (e) {
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`#${row.id}  ❌  ${row.url}\n        ${msg}`);
    }
  }

  console.log(`\nDone. migrated=${migrated} skipped=${skipped} failed=${failed} total=${rows.length}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
