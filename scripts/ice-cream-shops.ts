/**
 * Creates the Ice Cream Shops business page: the business type, its equipment
 * stack, and the long-form sections around the grid.
 *
 *   npm run ice-cream-shops
 *
 * Additive and idempotent — safe to run against production, and safe to re-run.
 * It creates the business_sections table and its enums first, so run it BEFORE
 * deploying the code that reads them.
 *
 * The section copy here is a FIRST DRAFT for Tom to correct in /admin. The
 * service, training and stocking claims in "Support, Service & Training"
 * especially need a read before anyone treats them as promises.
 */
import "./load-env";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import {
  businessTypes,
  businessSections,
  businessProducts,
  products,
} from "../lib/db/schema";
import { plainTextToTiptap } from "../lib/utils";

const BUSINESS = {
  slug: "ice-cream-shops",
  // Singular: the page template renders "Equipment for {name}s".
  name: "Ice Cream Shop",
  blurb: "Scoop shops, parlors & dessert bars",
  description:
    "Soft serve, hard-dip, shakes and a small food menu — specced, installed and serviced by one team.",
  fallbackGradient: "linear-gradient(135deg, #D6336C 0%, #6B1030 100%)",
  /** Stand-in until a shop photo is uploaded: the soft serve product hero. */
  heroImageFromProduct: "soft-serve",
};

/** Sections 3–7 of the brief, in order, as the equipment grid. */
const PRODUCTS = [
  "soft-serve",
  "batch",
  "flavor-burst",
  "wilson-pumps",
  "grill",
];

type SectionSeed = {
  key: string;
  kind: "prose" | "faq" | "cta";
  placement: "before_products" | "after_products";
  eyebrow: string | null;
  heading: string;
  body: string;
  items?: { question: string; answer: string }[];
  ctaLabel?: string;
};

const SECTIONS: SectionSeed[] = [
  {
    key: "overview",
    kind: "prose",
    placement: "before_products",
    eyebrow: "Build your ice cream shop",
    heading: "One partner for the whole shop",
    body:
      "Soft serve, hard-dip, shakes, toppings and a small food menu come from a handful of different manufacturers. Getting them from one place means one install, one service number, and one team that knows how your shop is laid out. Taylor Products has been outfitting shops across New Jersey, New York, Pennsylvania and Delaware since 1985. Start with the categories below, or tell us what you are picturing and we will spec it.",
  },
  {
    key: "layout",
    kind: "prose",
    placement: "after_products",
    eyebrow: "Your shop, your layout",
    heading: "Built around your floor plan",
    body:
      "A corner scoop shop and a seasonal stand off a state highway need different machines in different places. Counter space, door width, ceiling height, single- or three-phase power, air-cooled or water-cooled — these narrow the model list before flavor ever comes up. Send a floor plan or a few photos and we will come back with a layout: what fits where, what it draws, and what it will serve per hour on your busiest Saturday.",
  },
  {
    key: "support",
    kind: "prose",
    placement: "after_products",
    eyebrow: "Support, service & training",
    heading: "The part that matters in July",
    body:
      "A freezer down on a holiday weekend is the difference between a record day and a lost one. Machines are installed and commissioned by our technicians, and your staff is trained on daily operation, cleaning and heat-treat cycles before you open. Parts for the lines we carry are stocked regionally, and service comes from the same people who did your install.",
  },
  {
    key: "faq",
    kind: "faq",
    placement: "after_products",
    eyebrow: null,
    heading: "Common questions",
    body: "",
    items: [
      {
        question: "How much space does a soft serve setup need?",
        answer:
          "A countertop twin-twist runs in roughly three feet of counter, with clearance behind it for airflow. Floor models need about two by three feet plus service access. We size it against your actual floor plan before quoting.",
      },
      {
        question: "Can I serve both soft serve and hard-dip ice cream?",
        answer:
          "Most shops do. Soft serve comes off a freezer like the Taylor C716. Hard ice cream and gelato are made in-house on an Emery Thompson batch freezer and held in a dipping cabinet. They are separate machines sharing one menu.",
      },
      {
        question: "How much cleaning does a soft serve machine take?",
        answer:
          "Standard freezers are disassembled and cleaned every day or two. Heat-treatment models hold the mix at a safe temperature overnight and need a full teardown only once every 28 days, which is why shops under staffing pressure tend to choose them.",
      },
      {
        question: "Do I need three-phase power?",
        answer:
          "Many countertop and single-flavor models run on single-phase. Higher-volume floor models often want three-phase. It is one of the first things we check, because it can change the model list entirely.",
      },
      {
        question: "Can you help before I have signed a lease?",
        answer:
          "Yes, and that is the best time to call. Power, water, drainage and door width are far cheaper to solve on a floor plan than after build-out.",
      },
    ],
  },
  {
    key: "cta",
    kind: "cta",
    placement: "after_products",
    eyebrow: "Ready when you are",
    heading: "Let's design your shop",
    body:
      "Tell us the space, the menu you are picturing, and roughly when you want to open. We will come back with an equipment list, a layout and pricing.",
    ctaLabel: "Design My Shop",
  },
];

async function ensureSchema() {
  // CREATE TYPE has no IF NOT EXISTS, hence the DO blocks.
  await db.execute(sql`
    do $$ begin
      create type section_kind as enum ('prose', 'faq', 'cta');
    exception when duplicate_object then null; end $$;
  `);
  await db.execute(sql`
    do $$ begin
      create type section_placement as enum ('before_products', 'after_products');
    exception when duplicate_object then null; end $$;
  `);
  await db.execute(sql`
    create table if not exists business_sections (
      id serial primary key,
      business_type_id integer not null references business_types(id) on delete cascade,
      kind section_kind not null default 'prose',
      placement section_placement not null default 'before_products',
      eyebrow varchar(128),
      heading varchar(256) not null,
      body text,
      image_id integer references images(id) on delete set null,
      items jsonb not null default '[]'::jsonb,
      cta_label varchar(128),
      sort_order integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);
  console.log("Schema: business_sections ready");
}

async function main() {
  await ensureSchema();

  // ---- Business type --------------------------------------------------------
  let business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, BUSINESS.slug),
  });
  if (business) {
    console.log(`= ${BUSINESS.name} already exists (id ${business.id})`);
  } else {
    const heroSource = await db.query.products.findFirst({
      where: eq(products.slug, BUSINESS.heroImageFromProduct),
    });
    const all = await db.select({ s: businessTypes.sortOrder }).from(businessTypes);
    const [row] = await db
      .insert(businessTypes)
      .values({
        slug: BUSINESS.slug,
        name: BUSINESS.name,
        blurb: BUSINESS.blurb,
        description: plainTextToTiptap(BUSINESS.description),
        heroImageId: heroSource?.heroImageId ?? null,
        fallbackGradient: BUSINESS.fallbackGradient,
        sortOrder: Math.max(0, ...all.map((r) => r.s)) + 1,
      })
      .returning();
    business = row;
    console.log(`+ ${BUSINESS.name} created (id ${business.id})`);
  }

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
      console.log(`  = ${product.name} already linked`);
      continue;
    }
    await db.insert(businessProducts).values({
      businessTypeId: business.id,
      productId: product.id,
      sortOrder: i,
    });
    console.log(`  + ${product.name} linked`);
  }

  // ---- Page sections --------------------------------------------------------
  // Matched on heading so a re-run updates in place instead of duplicating.
  for (const [i, section] of SECTIONS.entries()) {
    const existing = await db
      .select({ id: businessSections.id })
      .from(businessSections)
      .where(
        and(
          eq(businessSections.businessTypeId, business.id),
          eq(businessSections.heading, section.heading)
        )
      );
    const values = {
      kind: section.kind,
      placement: section.placement,
      eyebrow: section.eyebrow,
      heading: section.heading,
      body: section.body ? plainTextToTiptap(section.body) : null,
      items: section.items ?? [],
      ctaLabel: section.ctaLabel ?? null,
      sortOrder: i,
    };
    if (existing.length > 0) {
      await db
        .update(businessSections)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(businessSections.id, existing[0].id));
      console.log(`  = section "${section.heading}" updated`);
    } else {
      await db
        .insert(businessSections)
        .values({ ...values, businessTypeId: business.id });
      console.log(`  + section "${section.heading}" created`);
    }
  }

  console.log(`\nDone. /business/${BUSINESS.slug}`);
  console.log(
    "  ! Hero image is a stand-in (the soft serve product photo). Upload a shop photo in /admin."
  );
  console.log(
    "  ! Section copy is a draft — have Tom check the support/service/training claims."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
