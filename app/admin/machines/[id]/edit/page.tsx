import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { machines } from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { MachineForm } from "@/components/admin/MachineForm";

export const metadata = { title: "Edit machine" };

export default async function EditMachinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const machine = await db.query.machines.findFirst({
    where: eq(machines.id, id),
    with: { image: true },
  });
  if (!machine) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit: ${machine.label}`}
        backHref="/admin/machines"
      />
      <MachineForm
        initial={{
          id: machine.id,
          slug: machine.slug,
          label: machine.label,
          description: machine.description,
          image: machine.image,
        }}
      />
    </div>
  );
}
