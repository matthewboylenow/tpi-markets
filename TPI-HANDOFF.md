# TPI Equipment Finder — v1 Handoff Documentation

**Version:** 1.0
**Target Stack:** Next.js 15 (App Router) + Neon Postgres + Drizzle ORM + Vercel Blob + NextAuth + Tiptap
**Deployment:** Vercel
**Source of Truth (existing site):** `tpi-markets.vercel.app` (the HTML file Matthew provided)

---

## Table of Contents

1. [What We're Building](#1-what-were-building)
2. [Architecture Overview](#2-architecture-overview)
3. [Data Model](#3-data-model)
4. [Project Structure](#4-project-structure)
5. [Environment Setup (Codespaces + Local)](#5-environment-setup)
6. [Image Migration (Cowork Workflow)](#6-image-migration)
7. [Database Schema & Migrations (Drizzle)](#7-database-schema--migrations)
8. [Seed Data Strategy](#8-seed-data-strategy)
9. [Authentication](#9-authentication)
10. [Public Site Implementation](#10-public-site-implementation)
11. [Admin UI Implementation](#11-admin-ui-implementation)
12. [Rich Text Editor (Tiptap)](#12-rich-text-editor-tiptap)
13. [Image Uploads (Vercel Blob)](#13-image-uploads-vercel-blob)
14. [SEO, Open Graph, Sitemap](#14-seo-open-graph-sitemap)
15. [Vercel Deployment](#15-vercel-deployment)
16. [Visual Parity Checklist](#16-visual-parity-checklist)
17. [Future Phases (Stubbed)](#17-future-phases-stubbed)
18. [Maintenance Guide](#18-maintenance-guide)
19. [Common Gotchas](#19-common-gotchas)
20. [Claude Code Execution Plan](#20-claude-code-execution-plan)

---

## 1. What We're Building

A Next.js 15 application that replicates the current `tpi-markets.vercel.app` site exactly, with a custom CMS allowing Matthew to:

- Edit homepage copy (orange pill, H1, subheading, trust strip, footer line)
- Manage **Business Types** (Café, Diner, Pizza Shop, C-Store, Boardwalk, Mexican, Trendy Treats — 7 in total at v1) — full CRUD
- Manage **Product Lines** (Soft Serve, Frozen Coffee, etc.) — full CRUD, global
- Manage **Machines** (C716, L858, etc.) — full CRUD, can belong to one or more products
- Assign products to business types (many-to-many)
- Upload images to Vercel Blob, or paste external URLs
- Edit long-form text fields with a Tiptap rich text editor
- Log in via email + password to access `/admin`

> **Source-of-truth note:** The reference HTML's homepage hero currently reads:
> - **H1:** "Your *Business*" (italic accent on "Business" using Source Serif 4 italic)
> - **Subheading:** "Choose your business to get started."
> - **Logo size in nav:** `h-12` (not `h-8` as in earlier versions)
>
> These exact values must be in the seeded `site_settings` row so the homepage looks identical on first load.

**Out of scope for v1** (stubbed in schema, not implemented):
- Analytics dashboard
- HubSpot lead form integration

---

## 2. Architecture Overview

### Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components reduce client JS; native to Vercel; matches the rest of TPI's stack |
| Database | Neon Postgres | Serverless, branching for dev/prod, generous free tier |
| ORM | Drizzle | Type-safe, lightweight, no codegen step, plays well with edge runtime |
| Storage | Vercel Blob | Image uploads, native to deployment platform |
| Auth | NextAuth.js v5 (Auth.js) | Battle-tested, credentials provider for simple email/password |
| Rich Text | Tiptap v2 | Headless React editor, easy to constrain |
| Styling | Tailwind v3 | Matches existing HTML's Tailwind CDN |
| Validation | Zod | Form validation on server actions |
| Forms | React Hook Form + Zod | Standard combo |

### High-Level Request Flow

```
[Public visitor]
  → GET /
  → Next.js Server Component fetches Site Settings + Business Types from Neon
  → Renders HTML on server
  → Streams to browser

[Admin user]
  → GET /admin/*
  → Middleware checks NextAuth session cookie
  → If authed: render admin UI
  → If not: redirect to /login

[Admin edit]
  → Form submits to Server Action
  → Server Action validates with Zod
  → Drizzle writes to Neon
  → revalidatePath('/') refreshes public site cache
  → Redirect back to admin list view
```

### Why custom admin (not Payload/Sanity)

Matthew owns the admin UI — fields, layouts, validation, copy. No vendor lock-in. Smaller bundle. The trade-off is: you're building forms. For 4 collections + Site Settings, this is ~1-2 days of Claude Code work.

---

## 3. Data Model

### Entity Relationship Diagram (logical)

```
┌──────────────────┐       ┌──────────────────────┐       ┌─────────────────┐
│  business_types  │       │ business_products    │       │    products     │
│                  │◄──────┤  (join table)        ├──────►│                 │
│ - id             │  M:N  │  - business_type_id  │  M:N  │ - id            │
│ - slug           │       │  - product_id        │       │ - slug          │
│ - name           │       │  - sort_order        │       │ - name          │
│ - blurb          │       └──────────────────────┘       │ - tagline       │
│ - description    │                                      │ - hero_image_id │
│ - hero_image_id  │                                      │ - summary       │
│ - fallback_grad  │                                      │ - benefits[]    │
│ - sort_order     │                                      │ - learn_more_url│
└──────────────────┘                                      │ - sort_order    │
                                                          └────────┬────────┘
                                                                   │
                                                                   │ M:N
                                                                   ▼
                                                          ┌─────────────────────┐
                                                          │  product_machines   │
                                                          │  (join table)       │
                                                          │  - product_id       │
                                                          │  - machine_id       │
                                                          │  - sort_order       │
                                                          │  - is_primary       │
                                                          └────────┬────────────┘
                                                                   │
                                                                   ▼
                                                          ┌─────────────────────┐
                                                          │     machines        │
                                                          │                     │
                                                          │ - id                │
                                                          │ - slug              │
                                                          │ - label             │
                                                          │ - image_id          │
                                                          │ - description       │
                                                          └─────────────────────┘

┌─────────────────┐       ┌──────────────────┐
│     images      │       │  site_settings   │       (singleton row)
│                 │       │                  │
│ - id            │       │ - id (always 1)  │
│ - url           │       │ - hero_pill      │
│ - blob_pathname │       │ - hero_h1_a      │
│ - alt_text      │       │ - hero_h1_b      │ (italic accent)
│ - source_type   │       │ - hero_subhead   │
│ - width, height │       │ - stat_1..4_value│
└─────────────────┘       │ - stat_1..4_label│
                          │ - footer_tagline │
                          │ - empty_state    │ (the "Don't see your business?" copy)
                          └──────────────────┘

┌─────────────────┐       ┌────────────────────┐
│     users       │       │  lead_submissions  │  (stub for v1.2)
│                 │       │                    │
│ - id            │       │ - id               │
│ - email         │       │ - product_id       │
│ - password_hash │       │ - business_type_id │
│ - role          │       │ - email            │
└─────────────────┘       │ - phone            │
                          │ - utm_source...    │
                          │ - submitted_at     │
                          │ - hubspot_synced   │
                          └────────────────────┘

┌─────────────────────┐   (stub for v1.1)
│  analytics_events   │
│                     │
│ - id                │
│ - event_name        │
│ - product_id?       │
│ - business_type_id? │
│ - path              │
│ - referrer          │
│ - user_agent        │
│ - created_at        │
└─────────────────────┘
```

### Table-by-table specs

#### `business_types`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| slug | varchar(64) UNIQUE | URL segment, e.g. `cafe` |
| name | varchar(128) | Display, e.g. "Café" |
| blurb | varchar(256) | Short tagline, e.g. "Coffee shops, cafés & bakeries" |
| description | text | Tiptap JSON; longer copy on detail page hero |
| hero_image_id | integer FK → images.id | Nullable |
| fallback_gradient | varchar(256) | CSS linear-gradient string for fallback bg |
| sort_order | integer | Default 0 |
| created_at, updated_at | timestamptz | |

#### `products`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| slug | varchar(64) UNIQUE | e.g. `frozen-coffee` |
| name | varchar(128) | e.g. "Frozen Coffee" |
| tagline | varchar(128) | Short uppercase label, e.g. "Café-craft frozen drinks" |
| summary | text | Tiptap JSON |
| benefits | jsonb | Array of strings (or Tiptap JSON nodes if you want rich) — start with strings |
| hero_image_id | integer FK → images.id | The lifestyle/food photo |
| learn_more_url | varchar(512) | Link to taylorproducts.net detail page |
| sort_order | integer | |
| created_at, updated_at | timestamptz | |

#### `machines`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| slug | varchar(64) UNIQUE | e.g. `taylor-c716` |
| label | varchar(128) | e.g. "Taylor C716 Twin Twist, 28HT" |
| image_id | integer FK → images.id | Product photo of the machine |
| description | text | Tiptap JSON; can be empty for v1 |
| created_at, updated_at | timestamptz | |

#### `business_products` (join)
| Column | Type | Notes |
|---|---|---|
| business_type_id | integer FK → business_types.id ON DELETE CASCADE | |
| product_id | integer FK → products.id ON DELETE CASCADE | |
| sort_order | integer | Position within the business's product grid |
| PRIMARY KEY | (business_type_id, product_id) | |

#### `product_machines` (join)
| Column | Type | Notes |
|---|---|---|
| product_id | integer FK → products.id ON DELETE CASCADE | |
| machine_id | integer FK → machines.id ON DELETE CASCADE | |
| sort_order | integer | |
| is_primary | boolean | The one shown on the product detail page if multiple |
| PRIMARY KEY | (product_id, machine_id) | |

#### `images`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| url | varchar(1024) | Full URL, whether external or Blob |
| blob_pathname | varchar(512) | Null if external; the pathname for Blob's `del()` API |
| alt_text | varchar(256) | |
| source_type | enum('blob', 'external') | Tells admin if it's deletable from Blob |
| width | integer | Optional, for `next/image` |
| height | integer | Optional |
| created_at | timestamptz | |

#### `site_settings`
Single row, `id = 1` enforced.

| Column | Type | Notes |
|---|---|---|
| id | integer PK CHECK (id = 1) | |
| hero_pill_text | varchar(128) | "Taylor Company — 100 Years of Innovation" |
| hero_h1_part1 | varchar(128) | "Your" |
| hero_h1_part2 | varchar(128) | "Business" (italic accent) |
| hero_subheading | text | Tiptap JSON, e.g. "Choose your business to get started." |
| empty_state_text | varchar(256) | "Don't see your business type?" |
| empty_state_link_text | varchar(128) | "Tell us about your operation →" |
| stat_1_value | varchar(32) | "$174" |
| stat_1_label | varchar(64) | "Flat travel rate" |
| stat_2_value | varchar(32) | "96%+" |
| stat_2_label | varchar(64) | "Parts on truck" |
| stat_3_value | varchar(32) | "8am-8pm" |
| stat_3_label | varchar(64) | "Phone support, 7 days" |
| stat_4_value | varchar(32) | "1985" |
| stat_4_label | varchar(64) | "Serving NJ, NY, PA, DE" |
| footer_tagline | varchar(128) | "Serving NJ, NY, PA & DE since 1985" |
| updated_at | timestamptz | |

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| email | varchar(256) UNIQUE | |
| password_hash | varchar(256) | bcrypt |
| role | enum('admin') | Just admin for v1; leaves room for 'editor' later |
| created_at | timestamptz | |

#### `lead_submissions` (stub — table created but no UI in v1)
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| product_id | integer FK nullable | |
| business_type_id | integer FK nullable | |
| email | varchar(256) | |
| phone | varchar(64) | |
| company | varchar(256) | |
| message | text | |
| utm_source, utm_medium, utm_campaign, utm_content | varchar(128) | |
| submitted_at | timestamptz default now() | |
| hubspot_synced_at | timestamptz nullable | |

#### `analytics_events` (stub — table created but no recording in v1)
| Column | Type | Notes |
|---|---|---|
| id | serial PK | |
| event_name | varchar(64) | "view_home", "view_business", "view_product", "click_find_machine", "click_salesperson" |
| product_id | integer FK nullable | |
| business_type_id | integer FK nullable | |
| path | varchar(512) | |
| referrer | varchar(512) nullable | |
| user_agent | text nullable | |
| session_id | varchar(64) nullable | First-party cookie |
| created_at | timestamptz default now() | |

---

## 4. Project Structure

```
tpi-equipment-finder/
├── app/
│   ├── (public)/
│   │   ├── layout.tsx              # Public nav, footer, shared chrome
│   │   ├── page.tsx                # Home — fetches site_settings + business_types
│   │   ├── business/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx        # Business detail — products grid
│   │   │       └── product/
│   │   │           └── [productSlug]/
│   │   │               └── page.tsx # Product detail
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   └── opengraph-image.tsx
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx              # Minimal layout, no nav
│   │
│   ├── admin/
│   │   ├── layout.tsx              # Admin chrome — sidebar, top bar
│   │   ├── page.tsx                # Dashboard (v1: links to collections; v1.1: analytics)
│   │   ├── site-settings/
│   │   │   └── page.tsx            # Single-record edit form
│   │   ├── business-types/
│   │   │   ├── page.tsx            # List + sortable
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── products/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   ├── machines/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   └── images/
│   │       └── page.tsx            # Library view (optional v1, nice to have)
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── upload/route.ts         # Vercel Blob upload endpoint
│   │
│   ├── globals.css                 # Tailwind base + the existing CSS variables
│   └── layout.tsx                  # Root: fonts, metadata defaults
│
├── components/
│   ├── public/
│   │   ├── Nav.tsx
│   │   ├── Footer.tsx
│   │   ├── BusinessCard.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductDetailHero.tsx
│   │   ├── TrustStrip.tsx
│   │   └── RichText.tsx            # Renders Tiptap JSON to HTML
│   ├── admin/
│   │   ├── Sidebar.tsx
│   │   ├── DataTable.tsx
│   │   ├── ImageUploader.tsx       # Drag-drop, Blob upload, paste-URL fallback
│   │   ├── ImagePicker.tsx         # Modal: pick existing image OR upload new
│   │   ├── RichTextEditor.tsx      # Tiptap wrapper
│   │   ├── RelationshipPicker.tsx  # For business⇄product, product⇄machine
│   │   ├── SortableList.tsx        # dnd-kit for sort_order
│   │   └── forms/
│   │       ├── BusinessTypeForm.tsx
│   │       ├── ProductForm.tsx
│   │       ├── MachineForm.tsx
│   │       └── SiteSettingsForm.tsx
│   └── ui/                         # Shared primitives
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Label.tsx
│       └── Toast.tsx
│
├── lib/
│   ├── db/
│   │   ├── index.ts                # Drizzle client
│   │   ├── schema.ts               # All table definitions
│   │   └── queries/
│   │       ├── business-types.ts
│   │       ├── products.ts
│   │       ├── machines.ts
│   │       ├── images.ts
│   │       └── site-settings.ts
│   ├── auth.ts                     # NextAuth config
│   ├── blob.ts                     # Vercel Blob helpers
│   ├── tiptap-render.ts            # JSON → HTML server-side
│   └── utils.ts
│
├── actions/                        # Server Actions
│   ├── business-types.ts
│   ├── products.ts
│   ├── machines.ts
│   ├── images.ts
│   └── site-settings.ts
│
├── drizzle/                        # Generated migrations
│   └── 0000_initial.sql
│
├── scripts/
│   ├── seed.ts                     # Initial data load from extracted HTML
│   └── create-admin.ts             # Bcrypt password, insert user
│
├── public/
│   └── (static assets like favicon)
│
├── seed-data/                      # Source files for seeding
│   ├── content.json                # Extracted from existing HTML
│   └── images/                     # Pre-downloaded images (from Cowork)
│       ├── businesses/
│       ├── products/
│       └── machines/
│
├── middleware.ts                   # Auth gate for /admin
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local                      # Local secrets (gitignored)
```

---

## 5. Environment Setup

### 5.1 Codespaces

The repo includes a `.devcontainer/devcontainer.json` (create this) so Codespaces gets Node 20 and the right extensions:

```json
{
  "name": "TPI Equipment Finder",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "Prisma.prisma" // works for Drizzle SQL too
      ]
    }
  },
  "postCreateCommand": "npm install"
}
```

### 5.2 Environment variables

Create `.env.local` (gitignored), and add the same keys to Vercel project settings:

```bash
# Database — Neon connection string (Neon dashboard → Connection Details)
DATABASE_URL="postgres://..."

# Vercel Blob — created automatically by `vercel blob` integration
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# NextAuth — required
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000" # change for prod

# Salesperson URL (used to build CTA links)
NEXT_PUBLIC_SALESPERSON_URL="https://taylorproducts.net/meet-your-salesperson/"

# Site URL (used for sitemap, OG)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

In Codespaces, add these via **Settings → Codespaces → Repository secrets** so they're injected automatically.

### 5.3 Neon setup

1. Create a Neon project at neon.tech
2. Create a database called `tpi_equipment_finder`
3. Use the **branching feature**: create a branch called `dev` from `main`
   - `main` branch → production `DATABASE_URL`
   - `dev` branch → local + Codespaces `DATABASE_URL`
4. Copy the pooled connection string for each branch

### 5.4 Vercel Blob setup

1. In Vercel project: **Storage → Create → Blob**
2. Copy the `BLOB_READ_WRITE_TOKEN`
3. For local dev, the same token works (Blob doesn't have separate dev/prod stores by default — fine for v1; just be careful not to delete prod assets while developing)

### 5.5 Initial install

```bash
npx create-next-app@latest tpi-equipment-finder \
  --typescript --tailwind --app --no-src-dir --import-alias "@/*"

cd tpi-equipment-finder

# Core
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Auth
npm install next-auth@beta bcrypt
npm install -D @types/bcrypt

# Storage + uploads
npm install @vercel/blob

# Forms + validation
npm install react-hook-form @hookform/resolvers zod

# Rich text
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link \
  @tiptap/extension-placeholder @tiptap/pm

# UI helpers
npm install @dnd-kit/core @dnd-kit/sortable
npm install lucide-react
npm install clsx tailwind-merge

# Date/util
npm install date-fns
```

---

## 6. Image Migration

### 6.1 Goal

Get every image referenced in the current HTML into one of two states by go-live:

- **Uploaded to Vercel Blob** with a known pathname (preferred for content we own / Unsplash)
- **External URL preserved** (preferred for Taylor Company product photography on `taylorproducts.net`)

### 6.2 Cowork workflow (Matthew's path)

Use Claude Cowork on desktop to:

1. **Pull the existing HTML** into a workspace
2. Have Cowork **extract every image URL** from the file:
   - 7 business hero images (6 Unsplash + 1 iced matcha for Trendy Treats)
   - 13 product hero images (mix of Unsplash, Wix CDN, and flavorburst.com)
   - 13 machine product photos (taylorproducts.net)
3. Have Cowork **download all of them locally** into folders:
   ```
   seed-data/images/
   ├── businesses/
   │   ├── cafe.jpg
   │   ├── diner.jpg
   │   ├── pizza.jpg
   │   ├── cstore.jpg
   │   ├── boardwalk.jpg
   │   ├── mexican.jpg
   │   └── trendy-treats.jpg
   ├── products/
   │   ├── soft-serve.jpg
   │   ├── icetro-auto.jpg
   │   ├── gx.jpg
   │   ├── grill.jpg
   │   ├── milkshakes.jpg
   │   ├── batch.jpg            # source: static.wixstatic.com (gelato photo)
   │   ├── flavor-burst.png     # source: flavorburst.com (transparent PNG, keep as PNG)
   │   ├── fcb.jpg
   │   ├── slush.jpg
   │   ├── cocktails.jpg
   │   ├── smoothies.jpg
   │   ├── frozen-coffee.jpg
   │   └── acai.jpg
   └── machines/
       ├── taylor-c716.jpg
       ├── icetro-isi-271.jpg
       ├── icetro-isi-300ta.jpg
       ├── taylor-l858.jpg
       ├── taylor-490.jpg
       ├── emery-thompson-104.jpg
       ├── flavorburst-c708.jpg
       ├── taylor-c300.jpg
       ├── taylor-340.jpg
       ├── taylor-c300fab.jpg
       ├── taylor-430.jpg
       └── taylor-428.jpg
   ```
4. **Save them at reasonable resolutions** — for hero images, ~1600px wide is plenty. Use Cowork to resize anything over 2000px wide. The Flavorburst PNG should keep its transparency — don't convert to JPG.
5. **Commit them to the repo** under `seed-data/images/`. Yes, they go into git for v1 — they're small (probably ~5-10MB total) and the seed script needs them in a known place.

### 6.3 What the seed script does

When `npm run seed` runs:
1. Reads `seed-data/content.json` (extracted copy from the HTML)
2. For each image in `seed-data/images/`:
   - Uploads to Vercel Blob via `@vercel/blob` `put()`
   - Creates an `images` row with `source_type='blob'`, the returned URL, and the blob pathname
3. Inserts business types, products, machines, and join rows
4. Inserts the singleton `site_settings` row
5. Logs success and the admin URL

You'll run this **once** locally before first deploy. It's idempotent — re-running clears and re-seeds, useful during development.

### 6.4 What about Tom adding new images later?

Through the admin UI:
- Drag-drop into image picker → uploads to Blob → creates `images` row → linked to whatever record
- Or paste a URL → creates `images` row with `source_type='external'`

---

## 7. Database Schema & Migrations

### 7.1 Drizzle config (`drizzle.config.ts`)

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### 7.2 Schema (`lib/db/schema.ts`)

```ts
import {
  pgTable, serial, varchar, text, integer, timestamp,
  jsonb, boolean, primaryKey, pgEnum, check
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";

export const userRole = pgEnum("user_role", ["admin", "editor"]);
export const imageSource = pgEnum("image_source", ["blob", "external"]);

// IMAGES
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

// BUSINESS TYPES
export const businessTypes = pgTable("business_types", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).unique().notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  blurb: varchar("blurb", { length: 256 }).notNull(),
  description: text("description"), // Tiptap JSON as text
  heroImageId: integer("hero_image_id").references(() => images.id, { onDelete: "set null" }),
  fallbackGradient: varchar("fallback_gradient", { length: 256 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// PRODUCTS
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).unique().notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  tagline: varchar("tagline", { length: 128 }).notNull(),
  summary: text("summary"), // Tiptap JSON
  benefits: jsonb("benefits").$type<string[]>().notNull().default([]),
  heroImageId: integer("hero_image_id").references(() => images.id, { onDelete: "set null" }),
  learnMoreUrl: varchar("learn_more_url", { length: 512 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// MACHINES
export const machines = pgTable("machines", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).unique().notNull(),
  label: varchar("label", { length: 128 }).notNull(),
  imageId: integer("image_id").references(() => images.id, { onDelete: "set null" }),
  description: text("description"), // Tiptap JSON
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// JOIN: business_products
export const businessProducts = pgTable("business_products", {
  businessTypeId: integer("business_type_id").notNull().references(() => businessTypes.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
}, (t) => ({
  pk: primaryKey({ columns: [t.businessTypeId, t.productId] }),
}));

// JOIN: product_machines
export const productMachines = pgTable("product_machines", {
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  machineId: integer("machine_id").notNull().references(() => machines.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  isPrimary: boolean("is_primary").notNull().default(false),
}, (t) => ({
  pk: primaryKey({ columns: [t.productId, t.machineId] }),
}));

// SITE SETTINGS — singleton, enforced by CHECK constraint
export const siteSettings = pgTable("site_settings", {
  id: integer("id").primaryKey(),
  heroPillText: varchar("hero_pill_text", { length: 128 }).notNull(),
  heroH1Part1: varchar("hero_h1_part1", { length: 128 }).notNull(),
  heroH1Part2: varchar("hero_h1_part2", { length: 128 }).notNull(),
  heroSubheading: text("hero_subheading"), // Tiptap JSON
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
}, (t) => ({
  singletonCheck: check("site_settings_singleton", sql`${t.id} = 1`),
}));

// USERS
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 256 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 256 }).notNull(),
  role: userRole("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// STUBS — created but not used in v1
export const leadSubmissions = pgTable("lead_submissions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  businessTypeId: integer("business_type_id").references(() => businessTypes.id, { onDelete: "set null" }),
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
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  businessTypeId: integer("business_type_id").references(() => businessTypes.id, { onDelete: "set null" }),
  path: varchar("path", { length: 512 }).notNull(),
  referrer: varchar("referrer", { length: 512 }),
  userAgent: text("user_agent"),
  sessionId: varchar("session_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// RELATIONS — let Drizzle build the joins for us
export const businessTypesRelations = relations(businessTypes, ({ one, many }) => ({
  heroImage: one(images, { fields: [businessTypes.heroImageId], references: [images.id] }),
  businessProducts: many(businessProducts),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  heroImage: one(images, { fields: [products.heroImageId], references: [images.id] }),
  businessProducts: many(businessProducts),
  productMachines: many(productMachines),
}));

export const machinesRelations = relations(machines, ({ one, many }) => ({
  image: one(images, { fields: [machines.imageId], references: [images.id] }),
  productMachines: many(productMachines),
}));

export const businessProductsRelations = relations(businessProducts, ({ one }) => ({
  businessType: one(businessTypes, { fields: [businessProducts.businessTypeId], references: [businessTypes.id] }),
  product: one(products, { fields: [businessProducts.productId], references: [products.id] }),
}));

export const productMachinesRelations = relations(productMachines, ({ one }) => ({
  product: one(products, { fields: [productMachines.productId], references: [products.id] }),
  machine: one(machines, { fields: [productMachines.machineId], references: [machines.id] }),
}));
```

### 7.3 DB client (`lib/db/index.ts`)

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### 7.4 Migration commands (in `package.json` scripts)

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "seed": "tsx scripts/seed.ts",
    "create-admin": "tsx scripts/create-admin.ts"
  }
}
```

For v1, use `db:push` to sync schema changes without writing migration files. When the schema stabilizes, switch to `generate` + `migrate`.

---

## 8. Seed Data Strategy

### 8.1 Extracted content (`seed-data/content.json`)

Dump the existing HTML's `BUSINESS_TYPES` and `PRODUCTS` data to a JSON file. Tom-relevant copy (descriptions, summaries, benefits) goes here verbatim.

> **About Trendy Treats:** Tom shared a list of equipment for products like Matcha, Frozen Margaritas, Frozen Lemonade/Tea, and Frozen Cappuccino. For v1, **Trendy Treats reuses existing products** (`acai`, `cocktails`, `frozen-coffee`, `smoothies`) — no new product entries are created. If/when you want Matcha or Frozen Margaritas as their own product detail pages with their own machine lists, add them through the admin UI later. The schema and admin already support this.

```jsonc
{
  "siteSettings": {
    "heroPillText": "Taylor Company — 100 Years of Innovation",
    "heroH1Part1": "Your",
    "heroH1Part2": "Business",
    "heroSubheading": "Choose your business to get started.",
    "emptyStateText": "Don't see your business type?",
    "emptyStateLinkText": "Tell us about your operation →",
    "stat1Value": "$174",
    "stat1Label": "Flat travel rate",
    "stat2Value": "96%+",
    "stat2Label": "Parts on truck",
    "stat3Value": "8am-8pm",
    "stat3Label": "Phone support, 7 days",
    "stat4Value": "1985",
    "stat4Label": "Serving NJ, NY, PA, DE",
    "footerTagline": "Serving NJ, NY, PA & DE since 1985"
  },
  "businessTypes": [
    {
      "slug": "cafe",
      "name": "Café",
      "blurb": "Coffee shops, cafés & bakeries",
      "description": "Add cold, profitable items to your menu without slowing down the espresso line.",
      "imageFile": "businesses/cafe.jpg",
      "fallbackGradient": "linear-gradient(135deg, #6B4423 0%, #2D1810 100%)",
      "products": ["frozen-coffee", "acai", "smoothies", "soft-serve", "grill", "batch"]
    },
    {
      "slug": "diner",
      "name": "Diner",
      "blurb": "Diners, breakfast spots & family restaurants",
      "description": "Workhorse equipment that keeps up with the breakfast and weekend rush.",
      "imageFile": "businesses/diner.jpg",
      "fallbackGradient": "linear-gradient(135deg, #B8252D 0%, #5C0F14 100%)",
      "products": ["grill", "milkshakes", "soft-serve", "batch", "flavor-burst", "gx"]
    },
    {
      "slug": "pizza",
      "name": "Pizza Shop",
      "blurb": "Pizzerias & Italian restaurants",
      "description": "Beverage and dessert stations that turn one-item orders into full tickets.",
      "imageFile": "businesses/pizza.jpg",
      "fallbackGradient": "linear-gradient(135deg, #C4421A 0%, #5C1F0B 100%)",
      "products": ["grill", "fcb", "slush", "soft-serve", "milkshakes", "batch"]
    },
    {
      "slug": "cstore",
      "name": "C-Store",
      "blurb": "Convenience stores & gas stations",
      "description": "Self-serve units built for foot traffic, low labor, and high ticket margins.",
      "imageFile": "businesses/cstore.jpg",
      "fallbackGradient": "linear-gradient(135deg, #FF7B00 0%, #8C4400 100%)",
      "products": ["soft-serve", "icetro-auto", "gx", "grill", "fcb"]
    },
    {
      "slug": "boardwalk",
      "name": "Boardwalk & Theme Park",
      "blurb": "Boardwalks, amusement parks & entertainment",
      "description": "High-volume crowd-pleasers engineered for nonstop summer service.",
      "imageFile": "businesses/boardwalk.jpg",
      "fallbackGradient": "linear-gradient(135deg, #1E40AF 0%, #0F1F5C 100%)",
      "products": ["cocktails", "fcb", "soft-serve", "flavor-burst", "grill"]
    },
    {
      "slug": "mexican",
      "name": "Mexican Restaurant",
      "blurb": "Mexican restaurants, cantinas & taquerias",
      "description": "Cocktail-grade frozen drink machines plus high-output grills for the back of house.",
      "imageFile": "businesses/mexican.jpg",
      "fallbackGradient": "linear-gradient(135deg, #15803D 0%, #052E16 100%)",
      "products": ["cocktails", "grill", "soft-serve", "smoothies"]
    },
    {
      "slug": "trendy-treats",
      "name": "Trendy Treats",
      "blurb": "Matcha, açaí, frozen margaritas & on-trend menu items",
      "description": "On-trend, social-media-ready menu items that drive premium pricing and repeat visits.",
      "imageFile": "businesses/trendy-treats.jpg",
      "fallbackGradient": "linear-gradient(135deg, #16A34A 0%, #14532D 100%)",
      "products": ["acai", "cocktails", "frozen-coffee", "smoothies"]
    }
  ],
  "products": [
    {
      "slug": "soft-serve",
      "name": "Soft Serve & Frozen Yogurt",
      "tagline": "The classic profit center",
      "imageFile": "products/soft-serve.jpg",
      "summary": "Single-flavor, twin-twist, countertop, or floor-model freezers. Heat-treatment options cut cleaning to once a month.",
      "benefits": [
        "Over 20 freezer models from countertop to high-volume floor units",
        "Heat-treatment line requires only one cleaning per 28 days",
        "Single flavor, twin twist, or two-flavor configurations",
        "Air-cooled and water-cooled options available"
      ],
      "learnMoreUrl": "https://taylorproducts.net/soft-serve-frozen-yogurt/",
      "machines": ["taylor-c716"]
    },
    {
      "slug": "batch",
      "name": "Gelato & Batch Ice Cream",
      "tagline": "Premium scoop-shop quality",
      "imageFile": "products/batch.jpg",
      "summary": "Emery Thompson batch freezers produce small-batch artisan ice cream and gelato in-house. Premium pricing power.",
      "benefits": [
        "Authentic scoop-shop ice cream and gelato",
        "Full creative control over flavors and recipes",
        "Save over 50% on food costs vs. buying finished product",
        "Full training, recipes, and support from TPI"
      ],
      "learnMoreUrl": "https://taylorproducts.net/ice-cream-gelato-batch/",
      "machines": ["emery-thompson-104"]
    },
    {
      "slug": "flavor-burst",
      "name": "Flavor Burst",
      "tagline": "Up to 8 flavors, one machine",
      "imageFile": "products/flavor-burst.png",
      "summary": "Bolt-on system that injects concentrated flavorings into your existing soft serve. One machine, eight signature flavors.",
      "benefits": [
        "Up to 8 flavors from a single soft serve unit",
        "Integrates with existing Taylor freezers",
        "Color Touch Panel for easy operation",
        "Easy menu rotation and LTOs"
      ],
      "learnMoreUrl": "https://taylorproducts.net/flavorburst-programs/",
      "machines": ["flavorburst-c708"]
    }
    /* ... continue for the remaining 10 products: icetro-auto, gx, grill, milkshakes,
       fcb, slush, cocktails, smoothies, frozen-coffee, acai. Match the exact copy
       (summary, benefits, taglines) in the current HTML's PRODUCTS dictionary. */
  ],
  "machines": [
    {
      "slug": "taylor-c716",
      "label": "Taylor C716 Twin Twist, 28HT",
      "imageFile": "machines/taylor-c716.jpg",
      "description": ""
    }
    /* ... continue for all 13 machines, sourcing the label from each product's
       machineLabel field in the current HTML. */
  ]
}
```

The `description`, `summary`, and rich-text fields will be **converted to Tiptap JSON** during seeding. Plain text becomes a single-paragraph Tiptap doc.

### 8.2 Seed script (`scripts/seed.ts`)

Pseudocode (Claude Code will write the real version):

```ts
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

async function uploadImage(localPath: string, alt: string) {
  const buffer = await fs.readFile(localPath);
  const filename = path.basename(localPath);
  const blob = await put(`seed/${filename}`, buffer, {
    access: "public",
    addRandomSuffix: false,
  });
  const [img] = await db.insert(schema.images).values({
    url: blob.url,
    blobPathname: blob.pathname,
    altText: alt,
    sourceType: "blob",
  }).returning();
  return img;
}

function plainTextToTiptap(text: string) {
  return JSON.stringify({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  });
}

async function main() {
  const data = JSON.parse(await fs.readFile("./seed-data/content.json", "utf-8"));

  // Wipe (idempotent — order matters because of FKs)
  await db.delete(schema.businessProducts);
  await db.delete(schema.productMachines);
  await db.delete(schema.products);
  await db.delete(schema.machines);
  await db.delete(schema.businessTypes);
  await db.delete(schema.siteSettings);
  await db.delete(schema.images);

  // Site settings
  await db.insert(schema.siteSettings).values({
    id: 1,
    ...data.siteSettings,
    heroSubheading: plainTextToTiptap(data.siteSettings.heroSubheading),
  });

  // Insert images, business types, products, machines, joins
  // ... (verbose but mechanical)

  console.log("✅ Seeded.");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

### 8.3 Run order

```bash
# 1. Apply schema to Neon
npm run db:push

# 2. Place all images in seed-data/images/ (from Cowork)

# 3. Seed
npm run seed

# 4. Create admin user
npm run create-admin
# (script prompts for email/password OR reads from env)
```

---

## 9. Authentication

### 9.1 NextAuth v5 config (`lib/auth.ts`)

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;

        const [user] = await db.select().from(users)
          .where(eq(users.email, creds.email as string));
        if (!user) return null;

        const ok = await bcrypt.compare(creds.password as string, user.passwordHash);
        if (!ok) return null;

        return { id: String(user.id), email: user.email, role: user.role };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    session({ session, token }) {
      if (token) (session.user as any).role = token.role;
      return session;
    },
  },
});
```

### 9.2 API route (`app/api/auth/[...nextauth]/route.ts`)

```ts
export { GET, POST } from "@/lib/auth";
```

### 9.3 Middleware (`middleware.ts`)

```ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isAdmin = req.nextUrl.pathname.startsWith("/admin");
  if (isAdmin && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
```

### 9.4 Create-admin script (`scripts/create-admin.ts`)

```ts
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function main() {
  const email = "matthew@adventii.com";
  const password = "Dunkindonuts3!@";
  const hash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    email,
    passwordHash: hash,
    role: "admin",
  }).onConflictDoUpdate({
    target: users.email,
    set: { passwordHash: hash },
  });

  console.log(`✅ Admin user ready: ${email}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

> **Security note:** This file shouldn't ship to production with the password hardcoded. Convert to reading from env or prompt-based input before merging to main. For your single-user case it's fine to keep it as a local-only convenience.

### 9.5 Login page (`app/(auth)/login/page.tsx`)

A simple form: email, password, submit button. Calls `signIn("credentials", { email, password, redirectTo: callbackUrl })`. Match the existing site's typography (Outfit font, ink/cream colors, orange accent on submit button).

---

## 10. Public Site Implementation

### 10.1 Routing parity

| Old (hash) | New (App Router) |
|---|---|
| `#/` | `/` |
| `#/business/cafe` | `/business/cafe` |
| `#/business/cafe/product/frozen-coffee` | `/business/cafe/product/frozen-coffee` |

No redirects needed (per Matthew's confirmation).

### 10.2 Root layout (`app/layout.tsx`)

```tsx
import { Outfit, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-source-serif",
});

export const metadata = {
  title: { default: "Find Your Equipment — Taylor Products", template: "%s | Taylor Products" },
  description: "Find the right Taylor and Icetro equipment for your business. Soft serve, grills, frozen cocktails, slush, milkshakes and more.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${sourceSerif.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

### 10.3 Globals (`app/globals.css`)

Lift the existing `<style>` block from the HTML verbatim — `.grain::after`, `.card-hover`, `.img-zoom`, `.fade-in`, `.stagger`, `.ticker-dot`, `.underline-grow`, `.pill`, `.breadcrumb a:hover`, `.product-img-bg`. These are not Tailwind utilities; they're custom CSS that stays as-is.

Update Tailwind config to use the CSS variables from the fonts:
```ts
fontFamily: {
  sans: ["var(--font-outfit)", "sans-serif"],
  serif: ["var(--font-source-serif)", "Georgia", "serif"],
}
```

### 10.4 Public layout (`app/(public)/layout.tsx`)

Renders the existing `<nav>` and `<footer>` markup verbatim. The `Nav` and `Footer` components fetch `siteSettings.footerTagline` server-side.

### 10.5 Home page (`app/(public)/page.tsx`)

```tsx
import { db } from "@/lib/db";
import { businessTypes, siteSettings, images } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
// ... import card component, RichText component

export default async function HomePage() {
  const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1));
  const businesses = await db.query.businessTypes.findMany({
    with: { heroImage: true },
    orderBy: asc(businessTypes.sortOrder),
  });

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10 fade-in">
        <div className="max-w-3xl">
          <div className="pill bg-tpi-orange/10 text-tpi-orange-dark mb-6">
            <span className="ticker-dot" /> {settings.heroPillText}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-tpi-ink leading-[1.02]">
            {settings.heroH1Part1}{" "}
            <span className="font-serif-italic font-normal text-tpi-blue">
              {settings.heroH1Part2}
            </span>
          </h1>
          {/* Hero subheading. For v1 the seed value is plain text ("Choose your business
              to get started.") but the field stores Tiptap JSON, so render with <RichText>. */}
          <div className="mt-6 text-lg text-tpi-stone max-w-2xl">
            <RichText content={settings.heroSubheading} />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {businesses.map((b) => <BusinessCard key={b.id} business={b} />)}
        </div>

        <div className="mt-12 text-center">
          <p className="text-tpi-stone text-sm">
            {settings.emptyStateText}{" "}
            <a href={spURL("other", "not-listed")}
               className="text-tpi-blue font-medium underline-grow ml-1">
              {settings.emptyStateLinkText}
            </a>
          </p>
        </div>
      </section>

      <TrustStrip settings={settings} />
    </>
  );
}
```

### 10.6 Business detail (`app/(public)/business/[slug]/page.tsx`)

```tsx
export default async function BusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, slug),
    with: {
      heroImage: true,
      businessProducts: {
        orderBy: asc(businessProducts.sortOrder),
        with: { product: { with: { heroImage: true } } },
      },
    },
  });

  if (!business) notFound();

  return (/* ...JSX matching existing renderBusiness HTML */);
}

export async function generateStaticParams() {
  const all = await db.select({ slug: businessTypes.slug }).from(businessTypes);
  return all.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const b = await db.query.businessTypes.findFirst({ where: eq(businessTypes.slug, slug) });
  if (!b) return {};
  return {
    title: `Equipment for ${b.name}s`,
    description: b.blurb,
  };
}
```

### 10.7 Product detail (`app/(public)/business/[slug]/product/[productSlug]/page.tsx`)

Same pattern. Fetch business + product + product's machines (filter by `is_primary` for the main image; show all in a list if multiple).

### 10.8 RichText renderer (`lib/tiptap-render.ts` + `components/public/RichText.tsx`)

Use `@tiptap/html` (server-side) to convert JSON to HTML. Render with `dangerouslySetInnerHTML`. Sanitize on input, not output (we control the editor, so input is already clean).

### 10.9 Caching

Public pages use Next.js's default static caching. After admin edits, server actions call `revalidatePath('/')` and `revalidatePath('/business/[slug]', 'page')` to bust the cache.

---

## 11. Admin UI Implementation

### 11.1 Layout & navigation

`/admin` has a sidebar with:
- Dashboard (placeholder for v1.1 analytics)
- Site Settings
- Business Types
- Products
- Machines
- Images (library)
- Sign out

Match the visual language of the public site (Outfit font, blue/orange palette) but in a denser admin layout — tighter spacing, more text-heavy, sortable tables.

### 11.2 Site Settings page

Single form. All fields editable. Tiptap editor for `heroSubheading`. Plain inputs for everything else. Save button → server action → updates row id=1 → revalidates `/`.

### 11.3 Business Types — list page

Sortable table (drag handles using `@dnd-kit/sortable`):
| Image (40px thumb) | Name | Slug | # Products | Sort | Actions |

"Save Order" button only appears when sort changed; commits new `sort_order` values.

### 11.4 Business Types — create/edit form

Fields:
- **Slug** (text, locked after creation)
- **Name** (text)
- **Blurb** (text, max 256)
- **Description** (Tiptap)
- **Hero Image** (ImagePicker — pick existing or upload new)
- **Fallback Gradient** (text — paste a CSS linear-gradient string; show a live preview swatch)
- **Products** (RelationshipPicker — searchable multi-select of all products, with drag-to-reorder)

Save → server action → upsert business_type, sync business_products join table, revalidate.

### 11.5 Products — list page

Same table pattern:
| Image | Name | Slug | Tagline | # Businesses | # Machines | Sort | Actions |

### 11.6 Products — create/edit form

Fields:
- **Slug**, **Name**, **Tagline** (text)
- **Hero Image** (ImagePicker)
- **Summary** (Tiptap)
- **Benefits** (sortable list of plain-text strings; add/remove rows)
- **Learn More URL** (text)
- **Machines** (RelationshipPicker with star button to mark `is_primary`)
- **Available in business types** (RelationshipPicker — show as info, but allow editing here too for convenience)

### 11.7 Machines — list / form

| Image | Label | Slug | # Products | Actions |

Form: slug, label, image, description (Tiptap, optional).

### 11.8 RelationshipPicker

A reusable component. Behavior:
- Click "+ Add" → modal with search input
- Searches by name/slug
- Selected items shown as a draggable list below
- Each item has a remove button

### 11.9 Server actions

Every form submits via a server action in `actions/`. Pattern:

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { businessTypes, businessProducts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

const BusinessTypeSchema = z.object({
  id: z.number().optional(),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(128),
  blurb: z.string().min(1).max(256),
  description: z.string().nullable(),
  heroImageId: z.number().nullable(),
  fallbackGradient: z.string().min(1),
  productIds: z.array(z.number()),
});

export async function saveBusinessType(input: z.infer<typeof BusinessTypeSchema>) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const data = BusinessTypeSchema.parse(input);

  if (data.id) {
    await db.update(businessTypes).set({ /* ...fields */, updatedAt: new Date() })
      .where(eq(businessTypes.id, data.id));
  } else {
    const [row] = await db.insert(businessTypes).values({ /* ...fields */ }).returning();
    data.id = row.id;
  }

  // Sync products
  await db.delete(businessProducts).where(eq(businessProducts.businessTypeId, data.id!));
  if (data.productIds.length) {
    await db.insert(businessProducts).values(
      data.productIds.map((pid, i) => ({
        businessTypeId: data.id!,
        productId: pid,
        sortOrder: i,
      }))
    );
  }

  revalidatePath("/");
  revalidatePath(`/business/${data.slug}`);
  return { ok: true };
}
```

---

## 12. Rich Text Editor (Tiptap)

### 12.1 Where rich text is used

| Field | Editor type |
|---|---|
| `siteSettings.heroSubheading` | Tiptap (paragraph + bold/italic/link) |
| `businessTypes.description` | Tiptap (full toolbar) |
| `products.summary` | Tiptap (full toolbar) |
| `machines.description` | Tiptap (full toolbar) |
| Everything else | Plain text input |

### 12.2 Editor component (`components/admin/RichTextEditor.tsx`)

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

export function RichTextEditor({
  value, onChange, placeholder, variant = "full",
}: {
  value: string | null; // JSON string
  onChange: (json: string) => void;
  placeholder?: string;
  variant?: "full" | "minimal";
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: variant === "minimal" ? false : { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: variant === "full",
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: placeholder ?? "Write something..." }),
    ],
    content: value ? JSON.parse(value) : null,
    onUpdate({ editor }) {
      onChange(JSON.stringify(editor.getJSON()));
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-tpi-ink/15 overflow-hidden">
      <Toolbar editor={editor} variant={variant} />
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none p-4 focus:outline-none min-h-[120px]"
      />
    </div>
  );
}
```

`Toolbar` is a small bar with bold, italic, link, bullet list, ordered list, h2, h3 (if `variant === 'full'`).

### 12.3 Server-side rendering (`lib/tiptap-render.ts`)

```ts
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

export function tiptapToHtml(json: string | null): string {
  if (!json) return "";
  try {
    return generateHTML(JSON.parse(json), [StarterKit, Link]);
  } catch {
    return "";
  }
}
```

### 12.4 RichText component (`components/public/RichText.tsx`)

```tsx
import { tiptapToHtml } from "@/lib/tiptap-render";

export function RichText({ content, className }: { content: string | null; className?: string }) {
  const html = tiptapToHtml(content);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
```

---

## 13. Image Uploads (Vercel Blob)

### 13.1 Upload route (`app/api/upload/route.ts`)

```ts
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const altText = (form.get("altText") as string) ?? "";

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 10MB" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Images only" }, { status: 400 });
  }

  const blob = await put(`uploads/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  const [img] = await db.insert(images).values({
    url: blob.url,
    blobPathname: blob.pathname,
    altText,
    sourceType: "blob",
  }).returning();

  return NextResponse.json(img);
}
```

### 13.2 ImagePicker component (`components/admin/ImagePicker.tsx`)

Three modes in a tabbed modal:
1. **Existing** — grid of all `images` rows, click to select
2. **Upload** — drag-drop or click to upload, posts to `/api/upload`
3. **External URL** — paste a URL, creates an `images` row with `source_type='external'`

Returns `imageId` to the parent form.

### 13.3 Image rendering on public site

Use `next/image` with the Vercel Blob domain whitelisted:

```ts
// next.config.ts
export default {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "taylorproducts.net" },
      { protocol: "https", hostname: "static.wixstatic.com" },     // for the gelato photo
      { protocol: "https", hostname: "www.flavorburst.com" },      // for Flavor Burst hero
    ],
  },
};
```

> The `static.wixstatic.com` and `www.flavorburst.com` entries are only needed if you choose to keep those two product images as **external URLs** rather than uploading them to Blob during seed. The seed script's default behavior is to upload everything in `seed-data/images/` to Blob, in which case those two patterns aren't strictly required — but include them anyway since admin users may paste those URLs back in via the ImagePicker's "External URL" tab.

For the cards, `<Image>` with `fill` and `object-cover`. For the floating machine images on product detail pages, fixed dimensions with `object-contain`.

---

## 14. SEO, Open Graph, Sitemap

### 14.1 Per-route metadata

Already shown above with `generateMetadata`. Use the business/product name in the title, blurb/summary in the description.

### 14.2 OG image (`app/(public)/opengraph-image.tsx`)

Use `next/og` (`ImageResponse`) to generate a default OG image with the TPI logo + tagline.

For per-product OG images, add `app/(public)/business/[slug]/product/[productSlug]/opengraph-image.tsx` that fetches the product hero image and overlays the name/tagline.

### 14.3 Sitemap (`app/(public)/sitemap.ts`)

```ts
import { db } from "@/lib/db";
import { businessTypes, products, businessProducts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL!;
  const businesses = await db.query.businessTypes.findMany({
    with: { businessProducts: { with: { product: true } } },
  });

  const urls = [
    { url: baseUrl, lastModified: new Date(), priority: 1 },
    ...businesses.map((b) => ({
      url: `${baseUrl}/business/${b.slug}`,
      lastModified: new Date(),
      priority: 0.8,
    })),
    ...businesses.flatMap((b) =>
      b.businessProducts.map((bp) => ({
        url: `${baseUrl}/business/${b.slug}/product/${bp.product.slug}`,
        lastModified: new Date(),
        priority: 0.6,
      }))
    ),
  ];

  return urls;
}
```

### 14.4 Robots (`app/(public)/robots.ts`)

```ts
export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/login"] },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
  };
}
```

---

## 15. Vercel Deployment

### 15.1 First deploy

1. Push repo to GitHub
2. Vercel → New Project → Import the repo
3. **Framework Preset:** Next.js (auto-detected)
4. **Environment Variables:**
   - `DATABASE_URL` (Neon main branch pooled connection)
   - `BLOB_READ_WRITE_TOKEN` (created when you add Blob storage)
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (e.g., `https://tpi-equipment-finder.vercel.app`)
   - `NEXT_PUBLIC_SALESPERSON_URL`
   - `NEXT_PUBLIC_SITE_URL`
5. Deploy. Vercel runs `npm install` + `npm run build`.

### 15.2 Post-deploy

1. From your local machine (with prod env vars in a `.env.production.local`):
   - `npm run db:push` to apply schema to prod DB
   - `npm run seed` to load initial content (images upload to prod Blob)
   - `npm run create-admin` to create the admin user in prod
2. Visit the deploy URL, log in at `/login`, verify `/admin` works.

### 15.3 Custom domain

When ready, add `equipment.taylorproducts.net` (or wherever) as a custom domain in Vercel. Update DNS at the domain registrar with the CNAME Vercel provides. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the new domain.

### 15.4 Preview deploys (Neon branching)

For PR preview deploys to use a separate DB branch:
- Install the Neon Vercel integration
- It auto-creates a Neon branch per Vercel preview deploy
- Each PR gets isolated data

This is optional for v1 but worth setting up early.

---

## 16. Visual Parity Checklist

When porting the public site, verify each of these matches the existing HTML *exactly*:

- [ ] Outfit font 300/400/500/600/700/800 weights loaded
- [ ] Source Serif 4 italic loaded for the H1 accent and "Equipment for Cafés" italic accent
- [ ] Tailwind config has the `tpi` color palette (blue `#0066b2`, blue-dark `#004d85`, blue-light `#3389c4`, orange `#FF7B00`, orange-dark `#cc6200`, cream `#F8F6F1`, ink `#0E1620`, stone `#5C6470`)
- [ ] Body background is `#F8F6F1` (cream)
- [ ] **Nav logo size is `h-12`** (current — earlier versions used `h-8`; the seed/public render must use h-12)
- [ ] **Footer logo size is `h-6`** with `brightness-200` to render on dark background
- [ ] **Homepage H1 reads "Your *Business*"** with italic accent on "Business" (Source Serif 4 italic, `text-tpi-blue`)
- [ ] **Homepage subheading reads "Choose your business to get started."**
- [ ] Homepage shows **7 business cards** in this order: Café, Diner, Pizza Shop, C-Store, Boardwalk & Theme Park, Mexican Restaurant, Trendy Treats
- [ ] `.grain` SVG noise texture renders behind trust strip and business hero
- [ ] `.fade-in` animation on initial load (0.5s ease)
- [ ] `.stagger > *:nth-child(N)` delays cascading 50ms (extends to at least N=7 for the home grid)
- [ ] `.card-hover` lifts -6px and adds blue shadow on hover
- [ ] `.img-zoom img` scales to 1.06 on hover (700ms ease)
- [ ] `.ticker-dot` orange 6×6 dot in pills
- [ ] `.underline-grow` orange underline animates from 0 to 100% width on hover
- [ ] `.pill` rounded-full uppercase 11px tracking-wide
- [ ] `.product-img-bg` linear-gradient `#f0f2f5 → #e4e7ec` on machine photo blocks
- [ ] Sticky nav with backdrop-blur, `bg-tpi-cream/80`
- [ ] Footer has dark `tpi-ink` background, brightness-200 logo
- [ ] Business hero has gradient overlay `from-tpi-ink/85 via-tpi-ink/50 to-tpi-ink/30`
- [ ] Product card image has `aspect-[5/3]`
- [ ] Business card image has `aspect-[4/3]`
- [ ] Product detail hero image has `aspect-[4/3]` in 3xl rounded card
- [ ] Product detail machine image has `aspect-[3/2]` in `product-img-bg` rounded-2xl
- [ ] Salesperson URL constructor builds `?utm_source=equipment-finder&utm_medium=web&utm_campaign=equipment-finder&utm_content={biz}-{prod}` consistently
- [ ] All breadcrumb links work
- [ ] Hover on right-arrow in business cards turns the circle orange and white text
- [ ] "Find Your Machine" button is solid orange, "Talk to a Salesperson" is bordered ink

This list goes into the PR description / final QA pass.

---

## 17. Future Phases (Stubbed)

### 17.1 Analytics dashboard (v1.1)

**Schema:** `analytics_events` table is already created. No recording yet.

**When ready, add:**
1. A tiny client component that fires `fetch("/api/analytics/track", { method: "POST", body: JSON.stringify({ event, ...context }) })` on page view + CTA clicks. Set a first-party `tpi_session` cookie for grouping.
2. `/api/analytics/track` → insert into `analytics_events`.
3. `/admin` dashboard page with:
   - 30-day rolling page views by route
   - Top products by `view_product` count
   - Top businesses by `view_business` count
   - CTA conversion: `view_product` → `click_find_machine` and `view_product` → `click_salesperson` per product
   - Funnel: `view_home` → `view_business` → `view_product` → `click_*`
4. Recharts for visualization, simple tabular views below.

**Privacy:** No user-identifying info. Hash IP + user-agent server-side if you want session counts.

### 17.2 HubSpot lead form (v1.2)

**Schema:** `lead_submissions` table is already created.

**When ready, add:**
1. A `<LeadForm>` component on product detail pages: name, email, phone, message, hidden product_id + business_type_id + UTM params.
2. Server action: insert into `lead_submissions`, then call HubSpot Forms API (`https://api.hubapi.com/crm/v3/objects/contacts`) with the data.
3. On success: set `hubspot_synced_at = now()`. On failure: log and let admin retry.
4. Admin page at `/admin/leads` to view submissions, retry failed syncs, export CSV.

**HubSpot API key:** Store in env as `HUBSPOT_PRIVATE_APP_TOKEN`.

---

## 18. Maintenance Guide

### 18.1 Adding a new Business Type

1. Log in to `/admin`
2. Business Types → New
3. Fill slug (e.g., `bakery`), name, blurb, description, fallback gradient
4. Upload or pick a hero image
5. Select the products that should appear on this business's page
6. Save

The new business is live immediately at `/business/{slug}`.

### 18.2 Adding a new Product

1. Admin → Products → New
2. Fill slug, name, tagline, summary, benefits, learn-more URL
3. Upload hero image (the lifestyle/food photo)
4. Pick machines for this product (mark one as primary)
5. Pick which business types should show this product
6. Save

### 18.3 Adding a new Machine

1. Admin → Machines → New
2. Fill slug, label, optional description
3. Upload product photo (transparent PNG ideal; otherwise white-bg JPG)
4. Save
5. Then go to Products and assign this machine to the relevant product(s)

### 18.4 Editing site copy

Admin → Site Settings → edit any field → save. Changes appear on the homepage immediately after the cache revalidates (usually <5 seconds).

### 18.5 Reordering

- Business types order on home: Admin → Business Types → drag rows → "Save Order"
- Products order within a business: Admin → Business Type → edit → drag products in the picker

### 18.6 Replacing an image

Two options:
- **Update in place:** edit the existing image's alt text, replace the file via re-upload (creates a new image row, you point the record at the new one). Old image remains in Blob — clean up periodically.
- **Replace at the field:** edit the record (e.g., a Business Type), pick a new image. Old image still exists in the library.

### 18.7 Backups

Neon takes automatic point-in-time backups (free tier: 7 days; check current limits). For peace of mind, run `pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql` monthly and stash the file somewhere.

---

## 19. Common Gotchas

- **`CDN Tailwind` vs build-time Tailwind:** the existing HTML uses `<script src="https://cdn.tailwindcss.com">` which auto-generates classes. The new app uses build-time Tailwind via `tailwind.config.ts`. **Every utility class used in the existing HTML must be either a default Tailwind utility or added to your `tailwind.config.ts` extend block.** Custom values like `bg-tpi-orange/10`, `text-tpi-ink`, `font-serif-italic`, `aspect-[5/3]`, `leading-[1.02]` need to either work via JIT (which most arbitrary values do) or be defined.

- **Tiptap & SSR:** Set `immediatelyRender: false` on `useEditor` to avoid hydration mismatches.

- **Drizzle relations vs joins:** The `db.query.businessTypes.findMany({ with: { ... } })` syntax requires the `relations()` definitions in schema.ts. Without them, you get "no relations defined" errors.

- **Server Actions return values:** Must be JSON-serializable. Don't return Date objects directly — convert to ISO strings.

- **Neon connection limits:** The pooled connection string handles this. Use the pooled URL (with `-pooler` in the hostname), not the direct one.

- **Image domains in `next.config.ts`:** If you forget to whitelist a domain, `next/image` errors with "hostname not configured." Add it, restart dev server.

- **Vercel Blob `addRandomSuffix`:** During seeding we set this to `false` to get predictable URLs. For user uploads, set to `true` to avoid collisions.

- **Environment variable typing:** Add a `lib/env.ts` that validates `process.env` with Zod at startup. Catches typos and missing values before they cause runtime errors.

- **`generateStaticParams` + dynamic content:** Pages using `generateStaticParams` are static at build time. After admin edits, the revalidation triggers a regeneration. If you don't `revalidatePath`, the old version persists.

- **The `(public)` and `(admin)` route groups don't share layouts** — admin doesn't get the public nav; public doesn't get the admin sidebar. This is the intent of Next.js route groups.

---

## 20. Claude Code Execution Plan

Hand this entire document to Claude Code. Then execute in phases. After each phase, *you* verify before proceeding to the next. This keeps token usage manageable.

### Phase 1 — Bootstrap (~15-20 min)
- Initialize Next.js project per Section 5.5
- Set up Tailwind config with TPI palette
- Set up `lib/db/schema.ts`, `lib/db/index.ts`, `drizzle.config.ts`
- Run `npm run db:push` to verify Neon connection
- **Verify:** `npx drizzle-kit studio` shows all tables

### Phase 2 — Auth & admin shell (~15-20 min)
- NextAuth config, middleware, login page
- Admin layout with sidebar (no functional pages yet)
- `create-admin` script
- **Verify:** Can log in at `/login`, see `/admin` placeholder, get redirected if logged out

### Phase 3 — Seed pipeline (~30-40 min)
- Have Cowork download images to `seed-data/images/` *first* (do this before this phase)
- Create `seed-data/content.json` with all 6 businesses + 13 products + 12 machines
- Write `scripts/seed.ts`
- Run `npm run seed`
- **Verify:** Drizzle studio shows all rows + images, blob URLs resolve

### Phase 4 — Public site parity (~45-60 min)
- Root layout with fonts
- `globals.css` with all custom styles from existing HTML
- Home, business detail, product detail pages
- Visual parity QA pass against checklist in Section 16
- **Verify:** Side-by-side comparison with existing `tpi-markets.vercel.app` matches

### Phase 5 — Admin CRUD (~60-90 min)
- Site Settings page
- Business Types list + form
- Products list + form
- Machines list + form
- Image upload route + ImagePicker
- RichTextEditor
- RelationshipPicker
- **Verify:** Can edit a business type, see change on public site after revalidation

### Phase 6 — SEO + finishing (~20-30 min)
- Sitemap, robots, OG image
- Per-route metadata
- 404 pages
- **Verify:** `/sitemap.xml` returns valid XML, OG image renders for a product page

### Phase 7 — Deploy (~15-20 min)
- Push to GitHub
- Set up Vercel project + env vars
- First deploy
- Run `db:push`, `seed`, `create-admin` against prod DB
- **Verify:** Production URL works, can log in, public pages render

**Total estimate:** 3-5 hours of Claude Code time. Token cost: $200-300 if everything goes smoothly, more with iteration.

---

## Closing notes for the developer (Matthew or Claude Code)

- **Don't redesign anything.** Match the existing HTML pixel-for-pixel. Design iteration is the most expensive thing in this project.
- **Server Components by default.** Only mark something `"use client"` if it has interactivity (forms, editors, drag-drop).
- **Server Actions over API routes** for admin mutations. Cleaner, type-safe, automatic revalidation.
- **Validate every server action input with Zod.** Even though the form is internal, defense in depth.
- **Check auth on every server action and API route.** Don't rely on middleware alone — middleware only protects `/admin` page navigation, not the underlying mutations.
- **Use Drizzle's query builder, not raw SQL,** unless you have a specific need. Type safety is the main value.
- **When stuck, prefer the boring solution.** This is a small site with a small admin. Optimize for clarity over cleverness.

End of doc.
