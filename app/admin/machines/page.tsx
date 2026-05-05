import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { machines, productMachines, images } from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Machines" };

export default async function MachinesAdminPage() {
  const rows = await db
    .select({
      id: machines.id,
      label: machines.label,
      slug: machines.slug,
      imageUrl: images.url,
    })
    .from(machines)
    .leftJoin(images, eq(machines.imageId, images.id))
    .orderBy(asc(machines.label));

  const counts = await db
    .select({
      id: productMachines.machineId,
      n: sql<number>`count(*)::int`,
    })
    .from(productMachines)
    .groupBy(productMachines.machineId);
  const countMap = new Map(counts.map((c) => [c.id, Number(c.n)]));

  return (
    <div>
      <PageHeader
        title="Machines"
        description="Equipment models that can be attached to one or more products."
        newHref="/admin/machines/new"
        newLabel="New machine"
      />
      <div className="bg-white rounded-xl border border-tpi-ink/10 overflow-hidden">
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/admin/machines/${r.id}/edit`}
            className="flex items-center gap-3 px-4 py-3 border-b border-tpi-ink/5 last:border-0 hover:bg-tpi-cream/40"
          >
            <div className="w-12 h-12 rounded product-img-bg overflow-hidden flex items-center justify-center p-1.5 shrink-0">
              {r.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.imageUrl}
                  alt=""
                  className="machine-img max-w-full max-h-full object-contain"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-tpi-ink truncate">
                {r.label}
              </div>
              <div className="text-xs text-tpi-stone truncate">/{r.slug}</div>
            </div>
            <div className="text-xs text-tpi-stone">
              {countMap.get(r.id) ?? 0} product{(countMap.get(r.id) ?? 0) === 1 ? "" : "s"}
            </div>
            <div className="text-xs text-tpi-blue ml-3">Edit →</div>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-tpi-stone">No machines yet.</div>
        )}
      </div>
    </div>
  );
}
