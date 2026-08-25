/**
 * Additive, idempotent content update for the Farmer's Markets business type.
 *
 * Unlike `scripts/seed.ts` (which wipes every table), this only adds what is
 * missing, so it is safe to run against production. Run it as many times as
 * you like — a second run reports "already linked" and changes nothing.
 *
 *   npm run farmers-market
 *
 * Optional: set FROZEN_CIDER_IMAGE_URL to give the new variant an image.
 * Without it the variant is created image-less and you can attach one in
 * /admin → Products → Premium Slush → Variants.
 */
import "./load-env";
import { and, eq, ne } from "drizzle-orm";
import { db } from "../lib/db";
import {
  images,
  businessTypes,
  products,
  businessProducts,
  productVariants,
} from "../lib/db/schema";
import { plainTextToTiptap } from "../lib/utils";

const BUSINESS_SLUG = "farmers-markets";

/** Product lines to add to the Farmer's Markets page, in display order. */
const PRODUCTS_TO_ADD = ["smoothies", "soft-serve"];

/** Product lines to remove from the Farmer's Markets page. */
const PRODUCTS_TO_REMOVE = ["batch"];

/** The frozen beverage line the highlighted cider variant hangs off. */
const CIDER_PARENT_PRODUCT = "slush";

const CIDER_VARIANT = {
  slug: "frozen-cider",
  name: "Frozen Cider",
  description:
    "The fall market headliner. Run your own local cider through a Taylor 340 " +
    "and serve it frozen — same apples your customers already come for, at a " +
    "premium cup price. Switches back to slush flavors the rest of the season.",
};

async function main() {
  const business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, BUSINESS_SLUG),
  });
  if (!business) {
    throw new Error(
      `No business type with slug "${BUSINESS_SLUG}". Create it in /admin first.`
    );
  }
  console.log(`Business type: ${business.name} (id ${business.id})`);

  // ---- 1. Link the missing product lines ------------------------------------
  const existingLinks = await db
    .select({ productId: businessProducts.productId, sortOrder: businessProducts.sortOrder })
    .from(businessProducts)
    .where(eq(businessProducts.businessTypeId, business.id));

  let nextSort =
    existingLinks.length > 0
      ? Math.max(...existingLinks.map((l) => l.sortOrder)) + 1
      : 0;

  for (const slug of PRODUCTS_TO_ADD) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });
    if (!product) {
      console.warn(`  ! No product with slug "${slug}" — skipped.`);
      continue;
    }
    if (existingLinks.some((l) => l.productId === product.id)) {
      console.log(`  = ${product.name} already linked`);
      continue;
    }
    await db.insert(businessProducts).values({
      businessTypeId: business.id,
      productId: product.id,
      sortOrder: nextSort++,
    });
    console.log(`  + ${product.name} linked`);
  }

  // ---- 2. Unlink the product lines that no longer belong --------------------
  for (const slug of PRODUCTS_TO_REMOVE) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });
    if (!product) {
      console.warn(`  ! No product with slug "${slug}" — skipped.`);
      continue;
    }
    if (!existingLinks.some((l) => l.productId === product.id)) {
      console.log(`  = ${product.name} already absent`);
      continue;
    }
    // Only the link is removed — the product itself stays for other businesses.
    await db
      .delete(businessProducts)
      .where(
        and(
          eq(businessProducts.businessTypeId, business.id),
          eq(businessProducts.productId, product.id)
        )
      );
    console.log(`  - ${product.name} unlinked`);
  }

  // ---- 3. Add the highlighted Frozen Cider variant --------------------------
  const parent = await db.query.products.findFirst({
    where: eq(products.slug, CIDER_PARENT_PRODUCT),
  });
  if (!parent) {
    throw new Error(
      `No product with slug "${CIDER_PARENT_PRODUCT}" — cannot attach the cider variant.`
    );
  }

  const existingVariant = await db.query.productVariants.findFirst({
    where: and(
      eq(productVariants.productId, parent.id),
      eq(productVariants.slug, CIDER_VARIANT.slug)
    ),
  });

  let imageId: number | null = existingVariant?.imageId ?? null;
  const imageUrl = process.env.FROZEN_CIDER_IMAGE_URL;
  if (imageUrl && !imageId) {
    const [row] = await db
      .insert(images)
      .values({
        url: imageUrl,
        altText: "Frozen cider",
        sourceType: "external",
      })
      .returning();
    imageId = row.id;
    console.log(`  + image registered (${imageUrl})`);
  }

  let variantId: number;
  if (existingVariant) {
    await db
      .update(productVariants)
      .set({ isFeatured: true, imageId, updatedAt: new Date() })
      .where(eq(productVariants.id, existingVariant.id));
    variantId = existingVariant.id;
    console.log(`  = ${CIDER_VARIANT.name} variant already existed — featured`);
  } else {
    const [row] = await db
      .insert(productVariants)
      .values({
        productId: parent.id,
        slug: CIDER_VARIANT.slug,
        name: CIDER_VARIANT.name,
        description: plainTextToTiptap(CIDER_VARIANT.description),
        imageId,
        isFeatured: true,
        sortOrder: 0,
      })
      .returning();
    variantId = row.id;
    console.log(`  + ${CIDER_VARIANT.name} variant created on ${parent.name}`);
  }

  // Only one featured variant per product.
  await db
    .update(productVariants)
    .set({ isFeatured: false })
    .where(
      and(
        eq(productVariants.productId, parent.id),
        ne(productVariants.id, variantId)
      )
    );

  if (!imageId) {
    console.log(
      `\n  ! ${CIDER_VARIANT.name} has no image yet. Add one in /admin → Products → ` +
        `${parent.name} → Variants, or re-run with FROZEN_CIDER_IMAGE_URL set.`
    );
  }

  console.log("\nDone. Public pages revalidate within 60s.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
