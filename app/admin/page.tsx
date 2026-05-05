import Link from "next/link";
import { db } from "@/lib/db";
import { businessTypes, products, machines, images } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export default async function AdminDashboard() {
  const [bt, pr, mc, im] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(businessTypes),
    db.select({ count: sql<number>`count(*)::int` }).from(products),
    db.select({ count: sql<number>`count(*)::int` }).from(machines),
    db.select({ count: sql<number>`count(*)::int` }).from(images),
  ]);

  const stats = [
    { label: "Business Types", value: bt[0]?.count ?? 0, href: "/admin/business-types" },
    { label: "Products", value: pr[0]?.count ?? 0, href: "/admin/products" },
    { label: "Machines", value: mc[0]?.count ?? 0, href: "/admin/machines" },
    { label: "Images", value: im[0]?.count ?? 0, href: "/admin/images" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-tpi-ink mb-1">Dashboard</h1>
      <p className="text-sm text-tpi-stone mb-8">
        Manage the public site content. Click a tile to drill in.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="bg-white rounded-xl border border-tpi-ink/10 p-5 hover:border-tpi-blue/40 hover:shadow-sm transition-all"
          >
            <div className="text-xs uppercase tracking-wider text-tpi-stone mb-2">
              {s.label}
            </div>
            <div className="text-3xl font-bold text-tpi-ink">{s.value}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10 bg-white rounded-xl border border-tpi-ink/10 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-tpi-stone mb-4">
          Quick start
        </h2>
        <ol className="space-y-2.5 text-sm text-tpi-ink list-decimal list-inside">
          <li>
            Edit homepage hero copy in{" "}
            <Link href="/admin/site-settings" className="text-tpi-blue hover:text-tpi-orange underline-offset-2 hover:underline">
              Site Settings
            </Link>
            .
          </li>
          <li>
            Add or reorder cards in{" "}
            <Link href="/admin/business-types" className="text-tpi-blue hover:text-tpi-orange underline-offset-2 hover:underline">
              Business Types
            </Link>
            .
          </li>
          <li>
            Update product copy and machine assignments under{" "}
            <Link href="/admin/products" className="text-tpi-blue hover:text-tpi-orange underline-offset-2 hover:underline">
              Products
            </Link>
            .
          </li>
        </ol>
      </div>
    </div>
  );
}
