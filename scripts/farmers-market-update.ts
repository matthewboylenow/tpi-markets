/**
 * Describes the desired state of the Farmer's Markets business page and makes
 * the database match it.
 *
 *   npm run farmers-market
 *
 * Additive and idempotent — unlike `scripts/seed.ts` (which wipes every table)
 * this only touches the rows named below, so it is safe against production and
 * safe to re-run.
 *
 * Optional image overrides, each a URL:
 *   FROZEN_CIDER_IMAGE_URL   hero for the Frozen Cider product
 *   TAYLOR_390_IMAGE_URL     the Taylor 390 machine shot
 *   FB_CART_IMAGE_URL        the single-head C708 + cart integrator shot
 * Without them the new rows borrow existing photos as stand-ins.
 */
import "./load-env";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  images,
  businessTypes,
  products,
  machines,
  productMachines,
  businessProducts,
  productVariants,
} from "../lib/db/schema";
import { plainTextToTiptap } from "../lib/utils";

const BUSINESS_SLUG = "farmers-markets";

/** The page's equipment grid, in display order. */
const GRID = [
  "slush",
  "frozen-cider",
  "wilson-pumps",
  "soft-serve",
  "smoothies",
  "flavor-burst",
  "batch",
];

/**
 * Frozen cider is its own category, not a variant tucked under Premium Slush.
 * It runs on the same kind of freezer, so it borrows the slush learn-more page.
 */
const FROZEN_CIDER = {
  slug: "frozen-cider",
  name: "Frozen Cider",
  tagline: "The fall market headliner",
  productLabel: "Frozen cider by the cup",
  summary:
    "Run your own local cider through a Taylor 390 and serve it frozen. The same apples " +
    "your customers already come for, at a premium cup price — and the machine goes back " +
    "to slush flavors the rest of the season.",
  benefits: [
    "Turns cider you already sell by the gallon into a premium by-the-cup item",
    "The same freezer runs slush the rest of the season, so it earns year-round",
    "Pours fast enough to keep a Saturday morning line moving",
    "No carbonation line or CO2 tank to haul out to the stand",
  ],
  learnMoreUrl: "https://taylorproducts.net/premium-slush-3/",
  /** Served from public/ — a static asset, so no blob upload needed. */
  imageUrl: "/images/frozen-cider.jpg",
  heroFromProduct: "slush",
};

/** Paired with frozen cider. Real machine shot from taylorproducts.net. */
const TAYLOR_390 = {
  slug: "taylor-390",
  label: "Taylor Model 390",
  imageUrl:
    "https://taylorproducts.net/wp-content/uploads/2022/04/model_390-300x300.jpg",
  imageFromMachine: "taylor-340",
};

/**
 * The Flavor Burst configuration Tom wants shown: single head, cart underneath.
 * Taylor's own render of exactly that rig — C708 with the 8-bag cart integrator.
 */
const FB_CART = {
  slug: "flavorburst-c708-cart",
  label: "FlavorBurst Single-Head C708 with Cart Integrator",
  imageUrl:
    "https://taylorproducts.net/wp-content/uploads/2022/04/flavor-burst-c708.png",
  imageFromMachine: "flavorburst-c708",
};

/**
 * Product hero images. Local files are served from public/ as static assets,
 * so they need no blob upload; the Flavor Burst graphic is hosted by
 * flavorburst.com.
 */
const PRODUCT_IMAGES: { slug: string; url: string; alt: string }[] = [
  { slug: "smoothies", url: "/images/smoothies.jpg", alt: "Fresh-blended smoothie" },
  {
    slug: "batch",
    url: "/images/batch-ice-cream.jpg",
    alt: "Batch ice cream in a waffle bowl",
  },
  {
    slug: "flavor-burst",
    url: "https://www.flavorburst.com/wp-content/uploads/2022/08/circle-comp-SS.jpg",
    alt: "Flavor Burst striped soft serve",
  },
];

/**
 * Renames a product on the Farmer's Markets page only. Product names are
 * global, so this leaves every other business page untouched.
 */
const NAME_OVERRIDES: Record<string, string> = {
  batch: "Batch Ice Cream, Ices & Gelato",
};

/** Wilson Pumps copy, from wilsonpumps.com and its distributors. */
const WILSON_PUMPS = {
  slug: "wilson-pumps",
  productLabel: "Real-fruit soft serve",
  summary:
    "A patent-pending air diaphragm pump that drops into the Taylor freezer you " +
    "already own. It holds constant pressure, tolerates high-butterfat mixes, and " +
    "passes real fruit and mix-ins that would clog a gravity-fed hopper.",
  benefits: [
    "Retrofits Taylor 794, C712, C713, C716 and C717 — split-lid design, no machine modifications",
    "3mm particle tolerance runs real fruit, cookie and candy mix-ins without clogging",
    "Handles high-butterfat mixes for a denser, scoop-shop texture",
    "Overrun dials from 30% to 80% with a screw — thick custards through light sorbets",
    "Injects a pre-portioned shot of air on every pump stroke, so texture stays consistent all day",
  ],
  learnMoreUrl: "https://www.wilsonpumps.com/",
};

const standIns: string[] = [];

/** Returns the images row id for a URL, reusing an existing row when present. */
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

/** Resolves an image: an env override wins, else borrow an existing row. */
async function resolveImage(
  envVar: string,
  borrowedId: number | null,
  alt: string,
  note: string
): Promise<number | null> {
  const url = process.env[envVar];
  if (url) {
    const [row] = await db
      .insert(images)
      .values({ url, altText: alt, sourceType: "external" })
      .returning();
    return row.id;
  }
  if (borrowedId) standIns.push(note);
  return borrowedId;
}

async function ensureMachine(
  spec: {
    slug: string;
    label: string;
    imageUrl?: string;
    imageFromMachine: string;
  },
  envVar: string
) {
  // An env override wins, then the machine's own real photo, then a borrowed one.
  const url = process.env[envVar] ?? spec.imageUrl;
  let imageId: number | null = null;
  if (url) {
    imageId = await imageIdForUrl(url, spec.label);
  } else {
    const source = await db.query.machines.findFirst({
      where: eq(machines.slug, spec.imageFromMachine),
    });
    imageId = source?.imageId ?? null;
    if (imageId) {
      standIns.push(
        `${spec.label} is showing the ${source?.label ?? "existing"} photo`
      );
    }
  }

  const existing = await db.query.machines.findFirst({
    where: eq(machines.slug, spec.slug),
  });
  if (existing) {
    if (imageId && existing.imageId !== imageId) {
      await db
        .update(machines)
        .set({ imageId, updatedAt: new Date() })
        .where(eq(machines.id, existing.id));
      console.log(`  ~ machine ${spec.label} image updated`);
    } else {
      console.log(`  = machine ${spec.label} already correct`);
    }
    return { ...existing, imageId };
  }
  const [row] = await db
    .insert(machines)
    .values({ slug: spec.slug, label: spec.label, imageId })
    .returning();
  console.log(`  + machine ${spec.label} created`);
  return row;
}

/** Makes `machineId` the primary machine for a product, demoting the others. */
async function setPrimaryMachine(productId: number, machineId: number) {
  const existing = await db
    .select()
    .from(productMachines)
    .where(eq(productMachines.productId, productId));
  if (!existing.some((l) => l.machineId === machineId)) {
    await db
      .insert(productMachines)
      .values({ productId, machineId, sortOrder: 0, isPrimary: true });
  }
  for (const link of existing) {
    if (link.machineId !== machineId && link.isPrimary) {
      await db
        .update(productMachines)
        .set({ isPrimary: false, sortOrder: link.sortOrder + 1 })
        .where(
          and(
            eq(productMachines.productId, productId),
            eq(productMachines.machineId, link.machineId)
          )
        );
    }
  }
  await db
    .update(productMachines)
    .set({ isPrimary: true, sortOrder: 0 })
    .where(
      and(
        eq(productMachines.productId, productId),
        eq(productMachines.machineId, machineId)
      )
    );
}

async function main() {
  // Kept so a fresh database gets the columns the newer UI needs.
  await db.execute(
    sql`alter table product_variants add column if not exists is_featured boolean not null default false`
  );
  await db.execute(
    sql`alter table business_products add column if not exists name_override varchar(128)`
  );

  const business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, BUSINESS_SLUG),
  });
  if (!business) {
    throw new Error(`No business type with slug "${BUSINESS_SLUG}".`);
  }
  console.log(`Business type: ${business.name} (id ${business.id})`);

  // ---- 1. Frozen Cider as its own product ----------------------------------
  const taylor390 = await ensureMachine(TAYLOR_390, "TAYLOR_390_IMAGE_URL");

  const ciderUrl = process.env.FROZEN_CIDER_IMAGE_URL ?? FROZEN_CIDER.imageUrl;
  let heroImageId: number | null = null;
  if (ciderUrl) {
    heroImageId = await imageIdForUrl(ciderUrl, "Frozen cider");
  } else {
    const heroSource = await db.query.products.findFirst({
      where: eq(products.slug, FROZEN_CIDER.heroFromProduct),
    });
    heroImageId = await resolveImage(
      "FROZEN_CIDER_IMAGE_URL",
      heroSource?.heroImageId ?? null,
      "Frozen cider",
      `Frozen Cider is showing the ${heroSource?.name ?? "Premium Slush"} photo`
    );
  }

  let cider = await db.query.products.findFirst({
    where: eq(products.slug, FROZEN_CIDER.slug),
  });
  if (cider) {
    if (heroImageId && cider.heroImageId !== heroImageId) {
      await db
        .update(products)
        .set({ heroImageId, updatedAt: new Date() })
        .where(eq(products.id, cider.id));
      console.log(`  ~ ${FROZEN_CIDER.name} hero image updated`);
    } else {
      console.log(`  = ${FROZEN_CIDER.name} product already correct`);
    }
  } else {
    const all = await db.select({ s: products.sortOrder }).from(products);
    const [row] = await db
      .insert(products)
      .values({
        slug: FROZEN_CIDER.slug,
        name: FROZEN_CIDER.name,
        tagline: FROZEN_CIDER.tagline,
        productLabel: FROZEN_CIDER.productLabel,
        summary: plainTextToTiptap(FROZEN_CIDER.summary),
        benefits: FROZEN_CIDER.benefits,
        heroImageId,
        learnMoreUrl: FROZEN_CIDER.learnMoreUrl,
        sortOrder: Math.max(0, ...all.map((r) => r.s)) + 1,
      })
      .returning();
    cider = row;
    console.log(`  + ${FROZEN_CIDER.name} product created`);
  }
  await setPrimaryMachine(cider.id, taylor390.id);
  console.log(`  ~ ${FROZEN_CIDER.name} paired with ${TAYLOR_390.label}`);

  // Retire the old variant — cider is a category now, not a slush flavor.
  const slush = await db.query.products.findFirst({
    where: eq(products.slug, "slush"),
  });
  if (slush) {
    const stale = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, slush.id),
          eq(productVariants.slug, "frozen-cider")
        )
      );
    if (stale.length > 0) {
      await db.delete(productVariants).where(eq(productVariants.id, stale[0].id));
      console.log("  - Frozen Cider variant removed from Premium Slush");
    }
  }

  // ---- 2. Flavor Burst on the single-head C708 with cart integrator ---------
  const fbCart = await ensureMachine(FB_CART, "FB_CART_IMAGE_URL");
  const flavorBurst = await db.query.products.findFirst({
    where: eq(products.slug, "flavor-burst"),
  });
  if (flavorBurst) {
    await setPrimaryMachine(flavorBurst.id, fbCart.id);
    console.log(`  ~ Flavor Burst now leads with ${FB_CART.label}`);
  } else {
    console.warn('  ! No product with slug "flavor-burst" — skipped.');
  }

  // ---- 3. Batch freezer on the Emery Thompson CB-350 ------------------------
  const batch = await db.query.products.findFirst({
    where: eq(products.slug, "batch"),
  });
  const cb350 = await db.query.machines.findFirst({
    where: eq(machines.slug, "emery-thompson-cb-350"),
  });
  if (batch && cb350) {
    await setPrimaryMachine(batch.id, cb350.id);
    console.log(`  ~ ${batch.name} paired with ${cb350.label}`);
  }

  // ---- 4. Wilson Pumps copy ------------------------------------------------
  const wilson = await db.query.products.findFirst({
    where: eq(products.slug, WILSON_PUMPS.slug),
  });
  if (wilson) {
    await db
      .update(products)
      .set({
        productLabel: WILSON_PUMPS.productLabel,
        summary: plainTextToTiptap(WILSON_PUMPS.summary),
        benefits: WILSON_PUMPS.benefits,
        learnMoreUrl: WILSON_PUMPS.learnMoreUrl,
        updatedAt: new Date(),
      })
      .where(eq(products.id, wilson.id));
    console.log(`  ~ ${wilson.name} copy written`);
  }

  // ---- 5. Product hero images ----------------------------------------------
  for (const spec of PRODUCT_IMAGES) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, spec.slug),
    });
    if (!product) {
      console.warn(`  ! No product with slug "${spec.slug}" — skipped.`);
      continue;
    }
    const imageId = await imageIdForUrl(spec.url, spec.alt);
    if (product.heroImageId === imageId) {
      console.log(`  = ${product.name} image already correct`);
      continue;
    }
    await db
      .update(products)
      .set({ heroImageId: imageId, updatedAt: new Date() })
      .where(eq(products.id, product.id));
    console.log(`  ~ ${product.name} hero image updated`);
  }

  // ---- 6. The grid: exactly these products, in this order ------------------
  const existingLinks = await db
    .select({ productId: businessProducts.productId })
    .from(businessProducts)
    .where(eq(businessProducts.businessTypeId, business.id));

  for (const [i, slug] of GRID.entries()) {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });
    if (!product) {
      console.warn(`  ! No product with slug "${slug}" — skipped.`);
      continue;
    }
    const nameOverride = NAME_OVERRIDES[slug] ?? null;
    if (existingLinks.some((l) => l.productId === product.id)) {
      await db
        .update(businessProducts)
        .set({ sortOrder: i, nameOverride })
        .where(
          and(
            eq(businessProducts.businessTypeId, business.id),
            eq(businessProducts.productId, product.id)
          )
        );
      console.log(
        `  = ${nameOverride ?? product.name} (position ${i})` +
          (nameOverride ? " [renamed on this page]" : "")
      );
    } else {
      await db.insert(businessProducts).values({
        businessTypeId: business.id,
        productId: product.id,
        nameOverride,
        sortOrder: i,
      });
      console.log(`  + ${product.name} linked (position ${i})`);
    }
  }

  if (standIns.length > 0) {
    console.log("\n  ! Stand-in images — upload real photos in /admin:");
    standIns.forEach((s) => console.log(`      ${s}`));
  }
  console.log("\nDone. Public pages revalidate within 60s.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
