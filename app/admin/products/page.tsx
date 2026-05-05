import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  products,
  businessProducts,
  productMachines,
  images,
} from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";

export const metadata = { title: "Products" };

export default async function ProductsAdminPage() {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      tagline: products.tagline,
      heroImageUrl: images.url,
    })
    .from(products)
    .leftJoin(images, eq(products.heroImageId, images.id))
    .orderBy(asc(products.sortOrder));

  const businessCounts = await db
    .select({
      id: businessProducts.productId,
      n: sql<number>`count(*)::int`,
    })
    .from(businessProducts)
    .groupBy(businessProducts.productId);

  const machineCounts = await db
    .select({
      id: productMachines.productId,
      n: sql<number>`count(*)::int`,
    })
    .from(productMachines)
    .groupBy(productMachines.productId);

  const bMap = new Map(businessCounts.map((c) => [c.id, Number(c.n)]));
  const mMap = new Map(machineCounts.map((c) => [c.id, Number(c.n)]));

  return (
    <div>
      <PageHeader
        title="Products"
        description="Equipment categories shown on each business page."
        newHref="/admin/products/new"
        newLabel="New product"
      />
      <div className="bg-white rounded-xl border border-tpi-ink/10 overflow-hidden">
        <div className="grid grid-cols-[40px_2fr_1fr_80px_80px_60px] items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-wider text-tpi-stone border-b border-tpi-ink/5 bg-tpi-cream/40">
          <div></div>
          <div>Name</div>
          <div>Tagline</div>
          <div className="text-right">Businesses</div>
          <div className="text-right">Machines</div>
          <div></div>
        </div>
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/admin/products/${r.id}/edit`}
            className="grid grid-cols-[40px_2fr_1fr_80px_80px_60px] items-center gap-3 px-4 py-3 border-b border-tpi-ink/5 last:border-0 hover:bg-tpi-cream/40"
          >
            <div className="w-10 h-10 rounded bg-tpi-ink/5 overflow-hidden">
              {r.heroImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.heroImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-tpi-ink truncate">
                {r.name}
              </div>
              <div className="text-xs text-tpi-stone truncate">/{r.slug}</div>
            </div>
            <div className="text-xs text-tpi-stone truncate">{r.tagline}</div>
            <div className="text-xs text-tpi-stone text-right">
              {bMap.get(r.id) ?? 0}
            </div>
            <div className="text-xs text-tpi-stone text-right">
              {mMap.get(r.id) ?? 0}
            </div>
            <div className="text-xs text-tpi-blue text-right">Edit →</div>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-tpi-stone">
            No products yet.
          </div>
        )}
      </div>
    </div>
  );
}
