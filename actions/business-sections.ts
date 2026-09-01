"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessSections, businessTypes } from "@/lib/db/schema";
import { auth } from "@/lib/auth";

const Schema = z.object({
  id: z.number().optional(),
  businessTypeId: z.number(),
  kind: z.enum(["prose", "faq", "cta"]),
  placement: z.enum(["before_products", "after_products"]),
  eyebrow: z.string().max(128).nullable(),
  heading: z.string().min(1).max(256),
  body: z.string().nullable(),
  imageId: z.number().nullable(),
  items: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .default([]),
  ctaLabel: z.string().max(128).nullable(),
});

export type BusinessSectionInput = z.infer<typeof Schema>;

async function revalidateForBusiness(businessTypeId: number) {
  const business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.id, businessTypeId),
  });
  revalidatePath("/", "layout");
  if (business) revalidatePath(`/business/${business.slug}`);
}

export async function saveBusinessSection(input: BusinessSectionInput) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const data = Schema.parse(input);

  const business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.id, data.businessTypeId),
  });
  if (!business) return { ok: false as const, error: "Business type not found" };

  const values = {
    kind: data.kind,
    placement: data.placement,
    eyebrow: data.eyebrow,
    heading: data.heading,
    body: data.body,
    imageId: data.imageId,
    items: data.items,
    ctaLabel: data.ctaLabel,
  };

  let sectionId = data.id;
  if (sectionId) {
    await db
      .update(businessSections)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(businessSections.id, sectionId));
  } else {
    const existing = await db
      .select({ s: businessSections.sortOrder })
      .from(businessSections)
      .where(eq(businessSections.businessTypeId, data.businessTypeId));
    const sortOrder =
      existing.length > 0 ? Math.max(...existing.map((e) => e.s)) + 1 : 0;
    const [row] = await db
      .insert(businessSections)
      .values({ ...values, businessTypeId: data.businessTypeId, sortOrder })
      .returning();
    sectionId = row.id;
  }

  await revalidateForBusiness(data.businessTypeId);
  return { ok: true as const, id: sectionId };
}

export async function deleteBusinessSection(id: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const section = await db.query.businessSections.findFirst({
    where: eq(businessSections.id, id),
  });
  if (!section) return;
  await db.delete(businessSections).where(eq(businessSections.id, id));
  await revalidateForBusiness(section.businessTypeId);
}

export async function reorderBusinessSections(
  businessTypeId: number,
  orderedIds: number[]
) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(businessSections)
      .set({ sortOrder: i })
      .where(
        and(
          eq(businessSections.id, orderedIds[i]),
          eq(businessSections.businessTypeId, businessTypeId)
        )
      );
  }
  await revalidateForBusiness(businessTypeId);
}
