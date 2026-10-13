/**
 * Creates the Flavor Burst page and puts it first on the homepage grid.
 *
 *   npm run flavor-burst-page
 *
 * Additive and idempotent — safe against production, safe to re-run. Uses the
 * business page machinery (hero, equipment grid, content sections), so the
 * page stays editable in /admin like every other one.
 *
 * Copy is grounded in the existing Flavor Burst product copy and its variant
 * lineup; Tom should still give it a read.
 */
import "./load-env";
import { and, eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  images,
  businessTypes,
  businessSections,
  businessProducts,
  products,
} from "../lib/db/schema";
import { plainTextToTiptap } from "../lib/utils";

const BUSINESS = {
  slug: "flavor-burst",
  // Ends in "s", so the page template renders "Equipment for Flavor Burst
  // Programs" rather than "Flavor Bursts". Matches Taylor's own page name.
  name: "Flavor Burst Programs",
  blurb: "Up to 8 flavors from one soft serve machine",
  description:
    "Bolt Flavor Burst onto the soft serve freezer you already run and turn one base into eight striped flavors, shakes and more.",
  fallbackGradient: "linear-gradient(135deg, #DB2777 0%, #5B21B6 100%)",
  /** The striped-cone photo — reads better behind white type than the circle graphic. */
  heroImageUrl:
    "https://dssfxl42eiz61htn.public.blob.vercel-storage.com/migrated/19-flavorburst.jpg",
};

/** Equipment grid, in order: the system, then the freezers it bolts onto. */
const PRODUCTS = ["flavor-burst", "soft-serve"];

const MACHINE_RENDER =
  "https://taylorproducts.net/wp-content/uploads/2022/04/flavor-burst-c708.png";

type SectionSeed = {
  kind: "prose" | "faq" | "cta";
  placement: "before_products" | "after_products";
  eyebrow: string | null;
  heading: string;
  body: string;
  imageUrl?: string;
  items?: { question: string; answer: string }[];
  ctaLabel?: string;
};

const SECTIONS: SectionSeed[] = [
  {
    kind: "prose",
    placement: "before_products",
    eyebrow: "One machine, eight flavors",
    heading: "Turn one base into a whole menu",
    body:
      "Flavor Burst bolts onto the Taylor soft serve freezer you already run and injects concentrated flavor as each serving is drawn — up to eight flavors from a single unit. Striped cones, cups, sundaes, shakes and limited-time flavors all come off the same machine, picked from a color touch panel.",
  },
  {
    kind: "prose",
    placement: "after_products",
    eyebrow: "The setup",
    heading: "Single head, cart underneath",
    body:
      "One setup worth knowing: a single-head Taylor C708 with the Flavor Burst cart integrator underneath. All eight flavor bags live in one rolling cabinet below the freezer — off the counter and out of sight — so it fits a seasonal stand as easily as a full-service counter.",
    imageUrl: MACHINE_RENDER,
  },
  {
    kind: "faq",
    placement: "after_products",
    eyebrow: null,
    heading: "Common questions",
    body: "",
    items: [
      {
        question: "Do I need a new soft serve machine?",
        answer:
          "Not necessarily. Flavor Burst integrates with existing Taylor freezers. We will confirm your model is compatible before quoting.",
      },
      {
        question: "How many flavors can I run at once?",
        answer:
          "Up to eight from a single soft serve unit, selected from the color touch panel.",
      },
      {
        question: "What can I make besides striped cones?",
        answer:
          "Cups, sundaes and shakes, plus programs like Flavor Blend, Nice Ice, Flavor Burst Cocktails and Java Latte. The full lineup is on the Flavor Burst product page.",
      },
      {
        question: "How hard is it to change flavors?",
        answer:
          "Rotating the menu is built in, which makes seasonal and limited-time flavors simple to run.",
      },
    ],
  },
  {
    kind: "cta",
    placement: "after_products",
    eyebrow: "See it run",
    heading: "Add Flavor Burst to your menu",
    body:
      "Tell us which freezer you run now and what you would like to serve. We will come back with a setup and pricing.",
    ctaLabel: "Get Flavor Burst Pricing",
  },
];

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
  // ---- Business type, first on the homepage --------------------------------
  const all = await db
    .select({ slug: businessTypes.slug, s: businessTypes.sortOrder })
    .from(businessTypes);
  const firstSort =
    Math.min(0, ...all.filter((r) => r.slug !== BUSINESS.slug).map((r) => r.s)) - 1;
  const heroImageId = await imageIdForUrl(BUSINESS.heroImageUrl, "Flavor Burst striped cone");

  let business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, BUSINESS.slug),
  });
  const values = {
    name: BUSINESS.name,
    blurb: BUSINESS.blurb,
    description: plainTextToTiptap(BUSINESS.description),
    heroImageId,
    fallbackGradient: BUSINESS.fallbackGradient,
    sortOrder: firstSort,
  };
  if (business) {
    await db
      .update(businessTypes)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(businessTypes.id, business.id));
    console.log(`= ${BUSINESS.name} updated (id ${business.id})`);
  } else {
    const [row] = await db
      .insert(businessTypes)
      .values({ slug: BUSINESS.slug, ...values })
      .returning();
    business = row;
    console.log(`+ ${BUSINESS.name} created (id ${business.id})`);
  }
  console.log(`  homepage position: first (sort ${firstSort})`);

  // ---- Equipment grid -------------------------------------------------------
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

  // ---- Page sections (matched on heading, so re-runs update in place) ------
  for (const [i, section] of SECTIONS.entries()) {
    const imageId = section.imageUrl
      ? await imageIdForUrl(section.imageUrl, section.heading)
      : null;
    const sectionValues = {
      kind: section.kind,
      placement: section.placement,
      eyebrow: section.eyebrow,
      heading: section.heading,
      body: section.body ? plainTextToTiptap(section.body) : null,
      imageId,
      items: section.items ?? [],
      ctaLabel: section.ctaLabel ?? null,
      sortOrder: i,
    };
    const existing = await db
      .select({ id: businessSections.id })
      .from(businessSections)
      .where(
        and(
          eq(businessSections.businessTypeId, business.id),
          eq(businessSections.heading, section.heading)
        )
      );
    if (existing[0]) {
      await db
        .update(businessSections)
        .set({ ...sectionValues, updatedAt: new Date() })
        .where(eq(businessSections.id, existing[0].id));
      console.log(`  = section "${section.heading}" updated`);
    } else {
      await db
        .insert(businessSections)
        .values({ ...sectionValues, businessTypeId: business.id });
      console.log(`  + section "${section.heading}" created`);
    }
  }

  console.log(`\nDone. /business/${BUSINESS.slug}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
