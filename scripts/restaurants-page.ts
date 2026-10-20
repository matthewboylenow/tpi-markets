/**
 * Creates the Restaurants business page and adds it to the homepage grid.
 *
 *   npm run restaurants-page
 *
 * Additive and idempotent — safe against production, safe to re-run. Run it
 * after deploying, since the hero is served from public/images/.
 */
import "./load-env";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  images,
  businessTypes,
  businessProducts,
  products,
} from "../lib/db/schema";
import { plainTextToTiptap } from "../lib/utils";

const BUSINESS = {
  slug: "restaurants",
  // Singular, like the other cards: the page renders "Equipment for Restaurants".
  name: "Restaurant",
  blurb: "Full-service, casual & family dining",
  description:
    "A faster grill line in the kitchen, plus soft serve, shakes, frozen cocktails and batch ice cream that turn dessert and the bar into profit centers.",
  fallbackGradient: "linear-gradient(135deg, #B45309 0%, #451A03 100%)",
  heroImageUrl: "/images/restaurants.webp",
  heroAlt: "Restaurant exterior at dusk",
};

/** The lines discussed for restaurants, in the order they came up. */
const PRODUCTS = ["grill", "soft-serve", "milkshakes", "cocktails", "batch"];

async function imageIdForUrl(url: string, alt: string) {
  const known = await db
    .select({ id: images.id })
    .from(images)
    .where(eq(images.url, url));
  if (known[0]) return known[0].id;
  const [row] = await db
    .insert(images)
    .values({ url, altText: alt, sourceType: "external" })
    .returning();
  return row.id;
}

async function main() {
  const heroImageId = await imageIdForUrl(BUSINESS.heroImageUrl, BUSINESS.heroAlt);

  let business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, BUSINESS.slug),
  });
  const values = {
    name: BUSINESS.name,
    blurb: BUSINESS.blurb,
    description: plainTextToTiptap(BUSINESS.description),
    heroImageId,
    fallbackGradient: BUSINESS.fallbackGradient,
  };
  if (business) {
    // Leave sortOrder alone on re-runs so a reorder in /admin sticks.
    await db
      .update(businessTypes)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(businessTypes.id, business.id));
    console.log(`= ${BUSINESS.name} updated (id ${business.id})`);
  } else {
    const all = await db.select({ s: businessTypes.sortOrder }).from(businessTypes);
    const [row] = await db
      .insert(businessTypes)
      .values({
        slug: BUSINESS.slug,
        ...values,
        sortOrder: Math.max(0, ...all.map((r) => r.s)) + 1,
      })
      .returning();
    business = row;
    console.log(`+ ${BUSINESS.name} created (id ${business.id}), last on the homepage`);
  }

  const existingLinks = await db
    .select({ productId: businessProducts.productId })
    .from(businessProducts)
    .where(eq(businessProducts.businessTypeId, business.id));

  for (const [i, slug] of PRODUCTS.entries()) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });
    if (!product) {
      console.warn(`  ! No product with slug "${slug}" — skipped.`);
      continue;
    }
    if (existingLinks.some((l) => l.productId === product.id)) {
      await db
        .update(businessProducts)
        .set({ sortOrder: i })
        .where(
          and(
            eq(businessProducts.businessTypeId, business.id),
            eq(businessProducts.productId, product.id)
          )
        );
      console.log(`  = ${product.name} (position ${i})`);
    } else {
      await db.insert(businessProducts).values({
        businessTypeId: business.id,
        productId: product.id,
        sortOrder: i,
      });
      console.log(`  + ${product.name} linked (position ${i})`);
    }
  }

  console.log(`\nDone. /business/${BUSINESS.slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
