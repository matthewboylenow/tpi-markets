import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessTypes, businessProducts } from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { BusinessTypesList } from "@/components/admin/BusinessTypesList";

export const metadata = { title: "Business Types" };

export default async function BusinessTypesAdminPage() {
  const rows = await db.query.businessTypes.findMany({
    with: { heroImage: true },
    orderBy: asc(businessTypes.sortOrder),
  });
  const counts = await db
    .select({
      id: businessProducts.businessTypeId,
      n: sql<number>`count(*)::int`,
    })
    .from(businessProducts)
    .groupBy(businessProducts.businessTypeId);
  const countMap = new Map(counts.map((c) => [c.id, Number(c.n)]));

  const enriched = rows.map((r) => ({
    ...r,
    productCount: countMap.get(r.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Business Types"
        description="Drag to reorder. Click to edit copy, image, gradient, and product list."
        newHref="/admin/business-types/new"
        newLabel="New business type"
      />
      <BusinessTypesList rows={enriched} />
    </div>
  );
}
