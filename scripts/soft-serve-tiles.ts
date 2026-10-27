/**
 * Turns the soft serve product page's two tiles into four: adds a frozen
 * yogurt photo and the Taylor C791, the narrow twin-twist floor model.
 *
 *   npm run soft-serve-tiles
 *
 * Additive and idempotent — safe against production, safe to re-run. Run it
 * after deploying, since both images are served from public/images/.
 *
 * Soft serve is a global product, so the new tiles appear on every business
 * page that lists it, not just Ice Cream Shops.
 */
import "./load-env";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { images, machines, products, productMachines } from "../lib/db/schema";

const PRODUCT_SLUG = "soft-serve";

/** Tom approved this one: frozen yogurt with bananas and strawberries. */
const SECONDARY = {
  url: "/images/frozen-yogurt.jpg",
  alt: "Frozen yogurt topped with bananas and strawberries",
  label: "Frozen yogurt with fresh fruit",
};

/** The "skinny machine" from the meeting. Photo from taylorproducts.net. */
const C791 = {
  slug: "taylor-c791",
  label: "Taylor C791 Twin Twist",
  imageUrl: "/images/taylor-c791.png",
};

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
  await db.execute(
    sql`alter table products add column if not exists secondary_image_id integer references images(id) on delete set null`
  );
  await db.execute(
    sql`alter table products add column if not exists secondary_label varchar(128)`
  );

  const product = await db.query.products.findFirst({
    where: eq(products.slug, PRODUCT_SLUG),
  });
  if (!product) throw new Error(`No product with slug "${PRODUCT_SLUG}".`);

  // ---- The C791 machine ----------------------------------------------------
  const machineImageId = await imageIdForUrl(C791.imageUrl, C791.label);
  let machine = await db.query.machines.findFirst({
    where: eq(machines.slug, C791.slug),
  });
  if (machine) {
    await db
      .update(machines)
      .set({ label: C791.label, imageId: machineImageId, updatedAt: new Date() })
      .where(eq(machines.id, machine.id));
    console.log(`= machine ${C791.label} updated`);
  } else {
    [machine] = await db
      .insert(machines)
      .values({ slug: C791.slug, label: C791.label, imageId: machineImageId })
      .returning();
    console.log(`+ machine ${C791.label} created`);
  }

  // Attach as a secondary machine; the C716 stays primary.
  const links = await db
    .select()
    .from(productMachines)
    .where(eq(productMachines.productId, product.id));
  if (links.some((l) => l.machineId === machine!.id)) {
    console.log(`= ${C791.label} already on ${product.name}`);
  } else {
    await db.insert(productMachines).values({
      productId: product.id,
      machineId: machine.id,
      sortOrder: Math.max(0, ...links.map((l) => l.sortOrder)) + 1,
      isPrimary: false,
    });
    console.log(`+ ${C791.label} added to ${product.name}`);
  }

  // ---- The frozen yogurt photo ---------------------------------------------
  const secondaryImageId = await imageIdForUrl(SECONDARY.url, SECONDARY.alt);
  await db
    .update(products)
    .set({
      secondaryImageId,
      secondaryLabel: SECONDARY.label,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, product.id)));
  console.log(`~ ${product.name}: second photo set ("${SECONDARY.label}")`);

  console.log("\nDone. Product pages revalidate within 60s.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
