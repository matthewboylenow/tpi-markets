import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  primaryKey,
  pgEnum,
  check,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["admin", "editor"]);
export const imageSource = pgEnum("image_source", ["blob", "external"]);

/** What a business page content block renders as. */
export const sectionKind = pgEnum("section_kind", ["prose", "faq", "cta"]);
/** Whether a block sits above or below the "Choose your equipment" grid. */
export const sectionPlacement = pgEnum("section_placement", [
  "before_products",
  "after_products",
]);

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  url: varchar("url", { length: 1024 }).notNull(),
  blobPathname: varchar("blob_pathname", { length: 512 }),
  altText: varchar("alt_text", { length: 256 }),
  sourceType: imageSource("source_type").notNull().default("external"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const businessTypes = pgTable("business_types", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).unique().notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  blurb: varchar("blurb", { length: 256 }).notNull(),
  description: text("description"),
  heroImageId: integer("hero_image_id").references(() => images.id, {
    onDelete: "set null",
  }),
  fallbackGradient: varchar("fallback_gradient", { length: 256 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).unique().notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  tagline: varchar("tagline", { length: 128 }).notNull(),
  productLabel: varchar("product_label", { length: 128 }),
  summary: text("summary"),
  benefits: jsonb("benefits").$type<string[]>().notNull().default([]),
  heroImageId: integer("hero_image_id").references(() => images.id, {
    onDelete: "set null",
  }),
  learnMoreUrl: varchar("learn_more_url", { length: 512 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 64 }).notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  imageId: integer("image_id").references(() => images.id, {
    onDelete: "set null",
  }),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).unique().notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  imageId: integer("image_id").references(() => images.id, {
    onDelete: "set null",
  }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const businessProducts = pgTable(
  "business_products",
  {
    businessTypeId: integer("business_type_id")
      .notNull()
      .references(() => businessTypes.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.businessTypeId, t.productId] }),
  })
);

export const productMachines = pgTable(
  "product_machines",
  {
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    machineId: integer("machine_id")
      .notNull()
      .references(() => machines.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.productId, t.machineId] }),
  })
);

/**
 * Long-form content blocks on a business page. Lets a business type carry
 * narrative sections (an overview, a service pitch, FAQs, a closing CTA)
 * around the product grid without a bespoke route per page.
 */
export const businessSections = pgTable("business_sections", {
  id: serial("id").primaryKey(),
  businessTypeId: integer("business_type_id")
    .notNull()
    .references(() => businessTypes.id, { onDelete: "cascade" }),
  kind: sectionKind("kind").notNull().default("prose"),
  placement: sectionPlacement("placement").notNull().default("before_products"),
  eyebrow: varchar("eyebrow", { length: 128 }),
  heading: varchar("heading", { length: 256 }).notNull(),
  body: text("body"),
  imageId: integer("image_id").references(() => images.id, {
    onDelete: "set null",
  }),
  /** kind "faq": [{ question, answer }] */
  items: jsonb("items").$type<{ question: string; answer: string }[]>().notNull().default([]),
  /** kind "cta": button label; the href is the salesperson URL. */
  ctaLabel: varchar("cta_label", { length: 128 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const siteSettings = pgTable(
  "site_settings",
  {
    id: integer("id").primaryKey(),
    heroPillText: varchar("hero_pill_text", { length: 128 }).notNull(),
    heroH1Part1: varchar("hero_h1_part1", { length: 128 }).notNull(),
    heroH1Part2: varchar("hero_h1_part2", { length: 128 }).notNull(),
    heroSubheading: text("hero_subheading"),
    emptyStateText: varchar("empty_state_text", { length: 256 }).notNull(),
    emptyStateLinkText: varchar("empty_state_link_text", { length: 128 }).notNull(),
    stat1Value: varchar("stat_1_value", { length: 32 }).notNull(),
    stat1Label: varchar("stat_1_label", { length: 64 }).notNull(),
    stat2Value: varchar("stat_2_value", { length: 32 }).notNull(),
    stat2Label: varchar("stat_2_label", { length: 64 }).notNull(),
    stat3Value: varchar("stat_3_value", { length: 32 }).notNull(),
    stat3Label: varchar("stat_3_label", { length: 64 }).notNull(),
    stat4Value: varchar("stat_4_value", { length: 32 }).notNull(),
    stat4Label: varchar("stat_4_label", { length: 64 }).notNull(),
    footerTagline: varchar("footer_tagline", { length: 128 }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    singletonCheck: check("site_settings_singleton", sql`${t.id} = 1`),
  })
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 256 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 256 }).notNull(),
  role: userRole("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leadSubmissions = pgTable("lead_submissions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  businessTypeId: integer("business_type_id").references(() => businessTypes.id, {
    onDelete: "set null",
  }),
  email: varchar("email", { length: 256 }),
  phone: varchar("phone", { length: 64 }),
  company: varchar("company", { length: 256 }),
  message: text("message"),
  utmSource: varchar("utm_source", { length: 128 }),
  utmMedium: varchar("utm_medium", { length: 128 }),
  utmCampaign: varchar("utm_campaign", { length: 128 }),
  utmContent: varchar("utm_content", { length: 128 }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  hubspotSyncedAt: timestamp("hubspot_synced_at", { withTimezone: true }),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  eventName: varchar("event_name", { length: 64 }).notNull(),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  businessTypeId: integer("business_type_id").references(() => businessTypes.id, {
    onDelete: "set null",
  }),
  path: varchar("path", { length: 512 }).notNull(),
  referrer: varchar("referrer", { length: 512 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const businessTypesRelations = relations(businessTypes, ({ one, many }) => ({
  heroImage: one(images, {
    fields: [businessTypes.heroImageId],
    references: [images.id],
  }),
  businessProducts: many(businessProducts),
  sections: many(businessSections),
}));

export const businessSectionsRelations = relations(businessSections, ({ one }) => ({
  businessType: one(businessTypes, {
    fields: [businessSections.businessTypeId],
    references: [businessTypes.id],
  }),
  image: one(images, {
    fields: [businessSections.imageId],
    references: [images.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  heroImage: one(images, {
    fields: [products.heroImageId],
    references: [images.id],
  }),
  businessProducts: many(businessProducts),
  productMachines: many(productMachines),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  image: one(images, {
    fields: [productVariants.imageId],
    references: [images.id],
  }),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  image: one(images, {
    fields: [machines.imageId],
    references: [images.id],
  }),
  productMachines: many(productMachines),
}));

export const businessProductsRelations = relations(businessProducts, ({ one }) => ({
  businessType: one(businessTypes, {
    fields: [businessProducts.businessTypeId],
    references: [businessTypes.id],
  }),
  product: one(products, {
    fields: [businessProducts.productId],
    references: [products.id],
  }),
}));

export const productMachinesRelations = relations(productMachines, ({ one }) => ({
  product: one(products, {
    fields: [productMachines.productId],
    references: [products.id],
  }),
  machine: one(machines, {
    fields: [productMachines.machineId],
    references: [machines.id],
  }),
}));

export type Image = typeof images.$inferSelect;
export type BusinessType = typeof businessTypes.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Machine = typeof machines.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type BusinessSection = typeof businessSections.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type User = typeof users.$inferSelect;
