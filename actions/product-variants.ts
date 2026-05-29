"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  productVariants,
  products,
  businessProducts,
  businessTypes,
} from "@/lib/db/schema";
import { auth } from "@/lib/auth";

const slugRegex = /^[a-z0-9-]+$/;

const Schema = z.object({
  id: z.number().optional(),
  productId: z.number(),
  slug: z.string().min(1).max(64).regex(slugRegex),
  name: z.string().min(1).max(128),
  description: z.string().nullable(),
  imageId: z.number().nullable(),
  sortOrder: z.number().optional(),
});

export type ProductVariantInput = z.infer<typeof Schema>;

async function revalidateForProduct(productId: number, productSlug: string) {
  revalidatePath("/", "layout");
  const linked = await db
    .select({ slug: businessTypes.slug })
    .from(businessProducts)
    .innerJoin(businessTypes, eq(businessProducts.businessTypeId, businessTypes.id))
    .where(eq(businessProducts.productId, productId));
  for (const b of linked) {
    revalidatePath(`/business/${b.slug}`);
    revalidatePath(`/business/${b.slug}/product/${productSlug}`);
  }
}

export async function saveProductVariant(input: ProductVariantInput) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const data = Schema.parse(input);

  const product = await db.query.products.findFirst({
    where: eq(products.id, data.productId),
  });
  if (!product) return { ok: false as const, error: "Product not found" };

  const conflict = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(
      data.id
        ? and(
            eq(productVariants.productId, data.productId),
            eq(productVariants.slug, data.slug),
            ne(productVariants.id, data.id)
          )
        : and(
            eq(productVariants.productId, data.productId),
            eq(productVariants.slug, data.slug)
          )
    );
  if (conflict.length > 0) {
    return { ok: false as const, error: `Slug "${data.slug}" already used on this product.` };
  }

  let variantId = data.id;
  if (variantId) {
    await db
      .update(productVariants)
      .set({
        slug: data.slug,
        name: data.name,
        description: data.description,
        imageId: data.imageId,
        updatedAt: new Date(),
      })
      .where(eq(productVariants.id, variantId));
  } else {
    const existing = await db
      .select({ s: productVariants.sortOrder })
      .from(productVariants)
      .where(eq(productVariants.productId, data.productId));
    const sortOrder =
      existing.length > 0 ? Math.max(...existing.map((e) => e.s)) + 1 : 0;
    const [row] = await db
      .insert(productVariants)
      .values({
        productId: data.productId,
        slug: data.slug,
        name: data.name,
        description: data.description,
        imageId: data.imageId,
        sortOrder,
      })
      .returning();
    variantId = row.id;
  }

  await revalidateForProduct(product.id, product.slug);
  return { ok: true as const, id: variantId };
}

export async function deleteProductVariant(id: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const variant = await db.query.productVariants.findFirst({
    where: eq(productVariants.id, id),
    with: { product: true },
  });
  if (!variant) return;
  await db.delete(productVariants).where(eq(productVariants.id, id));
  await revalidateForProduct(variant.product.id, variant.product.slug);
}

export async function reorderProductVariants(
  productId: number,
  orderedIds: number[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) return;
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(productVariants)
      .set({ sortOrder: i })
      .where(
        and(
          eq(productVariants.id, orderedIds[i]),
          eq(productVariants.productId, productId)
        )
      );
  }
  await revalidateForProduct(product.id, product.slug);
}
