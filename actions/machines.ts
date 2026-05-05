"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { machines } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

const slugRegex = /^[a-z0-9-]+$/;

const Schema = z.object({
  id: z.number().optional(),
  slug: z.string().min(1).max(64).regex(slugRegex),
  label: z.string().min(1).max(128),
  imageId: z.number().nullable(),
  description: z.string().nullable(),
});

export type MachineInput = z.infer<typeof Schema>;

export async function saveMachine(input: MachineInput) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const data = Schema.parse(input);

  const conflict = await db
    .select({ id: machines.id })
    .from(machines)
    .where(
      data.id
        ? and(eq(machines.slug, data.slug), ne(machines.id, data.id))
        : eq(machines.slug, data.slug)
    );
  if (conflict.length > 0) {
    return { ok: false, error: `Slug "${data.slug}" already in use.` };
  }

  if (data.id) {
    await db
      .update(machines)
      .set({
        slug: data.slug,
        label: data.label,
        imageId: data.imageId,
        description: data.description,
        updatedAt: new Date(),
      })
      .where(eq(machines.id, data.id));
    revalidatePath("/", "layout");
    return { ok: true, id: data.id };
  }

  const [row] = await db
    .insert(machines)
    .values({
      slug: data.slug,
      label: data.label,
      imageId: data.imageId,
      description: data.description,
    })
    .returning();
  revalidatePath("/", "layout");
  return { ok: true, id: row.id };
}

export async function deleteMachine(id: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  await db.delete(machines).where(eq(machines.id, id));
  revalidatePath("/", "layout");
  redirect("/admin/machines");
}
