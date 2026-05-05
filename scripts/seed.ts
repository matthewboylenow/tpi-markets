import "./load-env";
import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { db } from "../lib/db";
import {
  images,
  businessTypes,
  products,
  machines,
  businessProducts,
  productMachines,
  siteSettings,
} from "../lib/db/schema";
import { plainTextToTiptap } from "../lib/utils";

type SeedImage = { id: number };

const SEED_DIR = path.join(process.cwd(), "seed-data");
const IMAGES_DIR = path.join(SEED_DIR, "images");

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function uploadOrReuse(
  imageFile: string | undefined,
  fallbackUrl: string | undefined,
  alt: string
): Promise<SeedImage | null> {
  // Prefer local file in seed-data/images/, upload to Blob.
  if (imageFile) {
    const localPath = path.join(IMAGES_DIR, imageFile);
    if (await fileExists(localPath)) {
      const buffer = await fs.readFile(localPath);
      const filename = imageFile.replaceAll("/", "-");
      const blob = await put(`seed/${filename}`, buffer, {
        access: "public",
        addRandomSuffix: false,
      });
      const [row] = await db
        .insert(images)
        .values({
          url: blob.url,
          blobPathname: blob.pathname,
          altText: alt,
          sourceType: "blob",
        })
        .returning();
      return { id: row.id };
    }
  }

  // Fallback: store the original external URL.
  if (fallbackUrl) {
    const [row] = await db
      .insert(images)
      .values({
        url: fallbackUrl,
        altText: alt,
        sourceType: "external",
      })
      .returning();
    return { id: row.id };
  }

  return null;
}

interface SeedData {
  siteSettings: Record<string, string>;
  businessTypes: Array<{
    slug: string;
    name: string;
    blurb: string;
    description: string;
    imageFile?: string;
    fallbackUrl?: string;
    fallbackGradient: string;
    products: string[];
  }>;
  products: Array<{
    slug: string;
    name: string;
    tagline: string;
    productLabel?: string;
    imageFile?: string;
    fallbackUrl?: string;
    summary: string;
    benefits: string[];
    learnMoreUrl: string;
    machines: string[];
  }>;
  machines: Array<{
    slug: string;
    label: string;
    imageFile?: string;
    fallbackUrl?: string;
  }>;
}

async function main() {
  console.log("⛏  Starting seed...");
  const data: SeedData = JSON.parse(
    await fs.readFile(path.join(SEED_DIR, "content.json"), "utf-8")
  );

  console.log("🧹 Wiping existing rows (FK-safe order)");
  await db.delete(businessProducts);
  await db.delete(productMachines);
  await db.delete(products);
  await db.delete(machines);
  await db.delete(businessTypes);
  await db.delete(siteSettings);
  await db.delete(images);

  // Site settings (singleton)
  console.log("🏷  Inserting site_settings");
  const ss = data.siteSettings;
  await db.insert(siteSettings).values({
    id: 1,
    heroPillText: ss.heroPillText,
    heroH1Part1: ss.heroH1Part1,
    heroH1Part2: ss.heroH1Part2,
    heroSubheading: plainTextToTiptap(ss.heroSubheading),
    emptyStateText: ss.emptyStateText,
    emptyStateLinkText: ss.emptyStateLinkText,
    stat1Value: ss.stat1Value,
    stat1Label: ss.stat1Label,
    stat2Value: ss.stat2Value,
    stat2Label: ss.stat2Label,
    stat3Value: ss.stat3Value,
    stat3Label: ss.stat3Label,
    stat4Value: ss.stat4Value,
    stat4Label: ss.stat4Label,
    footerTagline: ss.footerTagline,
  });

  // Machines (insert before products because product_machines links to both;
  // we'll insert join rows after products)
  console.log("🛠  Inserting machines");
  const machineIdBySlug = new Map<string, number>();
  for (const m of data.machines) {
    const img = await uploadOrReuse(m.imageFile, m.fallbackUrl, m.label);
    const [row] = await db
      .insert(machines)
      .values({
        slug: m.slug,
        label: m.label,
        imageId: img?.id ?? null,
        description: plainTextToTiptap(""),
      })
      .returning();
    machineIdBySlug.set(m.slug, row.id);
    console.log(`   • machine: ${m.slug}`);
  }

  // Products
  console.log("🍦 Inserting products");
  const productIdBySlug = new Map<string, number>();
  for (let i = 0; i < data.products.length; i++) {
    const p = data.products[i];
    const img = await uploadOrReuse(p.imageFile, p.fallbackUrl, p.productLabel ?? p.name);
    const [row] = await db
      .insert(products)
      .values({
        slug: p.slug,
        name: p.name,
        tagline: p.tagline,
        productLabel: p.productLabel,
        summary: plainTextToTiptap(p.summary),
        benefits: p.benefits,
        heroImageId: img?.id ?? null,
        learnMoreUrl: p.learnMoreUrl,
        sortOrder: i,
      })
      .returning();
    productIdBySlug.set(p.slug, row.id);
    console.log(`   • product: ${p.slug}`);

    // product → machines join
    for (let j = 0; j < p.machines.length; j++) {
      const machineId = machineIdBySlug.get(p.machines[j]);
      if (!machineId) {
        console.warn(`     ⚠ machine slug not found: ${p.machines[j]}`);
        continue;
      }
      await db.insert(productMachines).values({
        productId: row.id,
        machineId,
        sortOrder: j,
        isPrimary: j === 0,
      });
    }
  }

  // Business types
  console.log("🏪 Inserting business types");
  for (let i = 0; i < data.businessTypes.length; i++) {
    const b = data.businessTypes[i];
    const img = await uploadOrReuse(b.imageFile, b.fallbackUrl, b.name);
    const [row] = await db
      .insert(businessTypes)
      .values({
        slug: b.slug,
        name: b.name,
        blurb: b.blurb,
        description: plainTextToTiptap(b.description),
        heroImageId: img?.id ?? null,
        fallbackGradient: b.fallbackGradient,
        sortOrder: i,
      })
      .returning();
    console.log(`   • business: ${b.slug}`);

    for (let j = 0; j < b.products.length; j++) {
      const productId = productIdBySlug.get(b.products[j]);
      if (!productId) {
        console.warn(`     ⚠ product slug not found: ${b.products[j]}`);
        continue;
      }
      await db.insert(businessProducts).values({
        businessTypeId: row.id,
        productId,
        sortOrder: j,
      });
    }
  }

  console.log("✅ Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
