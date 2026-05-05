"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessTypes, businessProducts } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const slugRegex = /^[a-z0-9-]+$/;

const Schema = z.object({
  id: z.number().optional(),
  slug: z.string().min(1).max(64).regex(slugRegex, "Use lowercase letters, numbers, hyphens"),
  name: z.string().min(1).max(128),
  blurb: z.string().min(1).max(256),
  description: z.string().nullable(),
  heroImageId: z.number().nullable(),
  fallbackGradient: z.string().min(1).max(256),
  productIds: z.array(z.number()),
});

export type BusinessTypeInput = z.infer<typeof Schema>;

export async function saveBusinessType(input: BusinessTypeInput) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const data = Schema.parse(input);

  // Slug uniqueness
  const conflict = await db
    .select({ id: businessTypes.id })
    .from(businessTypes)
    .where(
      data.id
        ? and(eq(businessTypes.slug, data.slug), ne(businessTypes.id, data.id))
        : eq(businessTypes.slug, data.slug)
    );
  if (conflict.length > 0) {
    return { ok: false, error: `Slug "${data.slug}" already in use.` };
  }

  let businessId = data.id;
  if (businessId) {
    await db
      .update(businessTypes)
      .set({
        slug: data.slug,
        name: data.name,
        blurb: data.blurb,
        description: data.description,
        heroImageId: data.heroImageId,
        fallbackGradient: data.fallbackGradient,
        updatedAt: new Date(),
      })
      .where(eq(businessTypes.id, businessId));
  } else {
    // Append to end of sort order
    const last = await db
      .select({ s: businessTypes.sortOrder })
      .from(businessTypes)
      .orderBy(businessTypes.sortOrder);
    const sortOrder =
      last.length > 0 ? Math.max(...last.map((r) => r.s)) + 1 : 0;
    const [row] = await db
      .insert(businessTypes)
      .values({
        slug: data.slug,
        name: data.name,
        blurb: data.blurb,
        description: data.description,
        heroImageId: data.heroImageId,
        fallbackGradient: data.fallbackGradient,
        sortOrder,
      })
      .returning();
    businessId = row.id;
  }

  // Sync product join
  await db
    .delete(businessProducts)
    .where(eq(businessProducts.businessTypeId, businessId));
  if (data.productIds.length > 0) {
    await db.insert(businessProducts).values(
      data.productIds.map((pid, i) => ({
        businessTypeId: businessId!,
        productId: pid,
        sortOrder: i,
      }))
    );
  }

  revalidatePath("/", "layout");
  revalidatePath(`/business/${data.slug}`);
  return { ok: true, id: businessId };
}

export async function deleteBusinessType(id: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await db.delete(businessTypes).where(eq(businessTypes.id, id));
  revalidatePath("/", "layout");
  redirect("/admin/business-types");
}

export async function reorderBusinessTypes(orderedIds: number[]) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(businessTypes)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(eq(businessTypes.id, orderedIds[i]));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
