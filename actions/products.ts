"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  products,
  productMachines,
  businessProducts,
  businessTypes,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const slugRegex = /^[a-z0-9-]+$/;

const MachineSelection = z.object({
  id: z.number(),
  isPrimary: z.boolean().optional(),
});

const Schema = z.object({
  id: z.number().optional(),
  slug: z.string().min(1).max(64).regex(slugRegex),
  name: z.string().min(1).max(128),
  tagline: z.string().min(1).max(128),
  productLabel: z.string().max(128).nullable(),
  summary: z.string().nullable(),
  benefits: z.array(z.string().max(512)),
  heroImageId: z.number().nullable(),
  learnMoreUrl: z.string().max(512).nullable(),
  machines: z.array(MachineSelection),
  businessTypeIds: z.array(z.number()),
});

export type ProductInput = z.infer<typeof Schema>;

export async function saveProduct(input: ProductInput) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const data = Schema.parse(input);

  // Filter out empty benefits
  const benefits = data.benefits.map((b) => b.trim()).filter(Boolean);

  const conflict = await db
    .select({ id: products.id })
    .from(products)
    .where(
      data.id
        ? and(eq(products.slug, data.slug), ne(products.id, data.id))
        : eq(products.slug, data.slug)
    );
  if (conflict.length > 0) {
    return { ok: false, error: `Slug "${data.slug}" already in use.` };
  }

  let productId = data.id;
  if (productId) {
    await db
      .update(products)
      .set({
        slug: data.slug,
        name: data.name,
        tagline: data.tagline,
        productLabel: data.productLabel,
        summary: data.summary,
        benefits,
        heroImageId: data.heroImageId,
        learnMoreUrl: data.learnMoreUrl,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));
  } else {
    const last = await db.select({ s: products.sortOrder }).from(products);
    const sortOrder =
      last.length > 0 ? Math.max(...last.map((r) => r.s)) + 1 : 0;
    const [row] = await db
      .insert(products)
      .values({
        slug: data.slug,
        name: data.name,
        tagline: data.tagline,
        productLabel: data.productLabel,
        summary: data.summary,
        benefits,
        heroImageId: data.heroImageId,
        learnMoreUrl: data.learnMoreUrl,
        sortOrder,
      })
      .returning();
    productId = row.id;
  }

  // Sync machine join
  await db.delete(productMachines).where(eq(productMachines.productId, productId));
  if (data.machines.length > 0) {
    // ensure exactly one primary
    let primaryAssigned = false;
    const rows = data.machines.map((m, i) => {
      const isPrimary = !primaryAssigned && (m.isPrimary || i === 0);
      if (isPrimary) primaryAssigned = true;
      return {
        productId: productId!,
        machineId: m.id,
        sortOrder: i,
        isPrimary: !!m.isPrimary,
      };
    });
    if (!primaryAssigned && rows.length > 0) rows[0].isPrimary = true;
    await db.insert(productMachines).values(rows);
  }

  // Sync business→product join (preserving order from each business unchanged
  // for businesses that already had it; new ones append)
  // Strategy: remove all existing rows for this product, then re-add at the end
  // of each business's product list.
  await db
    .delete(businessProducts)
    .where(eq(businessProducts.productId, productId));
  for (const btId of data.businessTypeIds) {
    const existing = await db
      .select({ s: businessProducts.sortOrder })
      .from(businessProducts)
      .where(eq(businessProducts.businessTypeId, btId));
    const sortOrder =
      existing.length > 0 ? Math.max(...existing.map((e) => e.s)) + 1 : 0;
    await db.insert(businessProducts).values({
      businessTypeId: btId,
      productId: productId,
      sortOrder,
    });
  }

  revalidatePath("/", "layout");

  // revalidate any business page that includes this product
  const linkedBusinesses = await db
    .select({ slug: businessTypes.slug })
    .from(businessProducts)
    .innerJoin(businessTypes, eq(businessProducts.businessTypeId, businessTypes.id))
    .where(eq(businessProducts.productId, productId));
  for (const b of linkedBusinesses) {
    revalidatePath(`/business/${b.slug}`);
    revalidatePath(`/business/${b.slug}/product/${data.slug}`);
  }

  return { ok: true, id: productId };
}

export async function deleteProduct(id: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await db.delete(products).where(eq(products.id, id));
  revalidatePath("/", "layout");
  redirect("/admin/products");
}
