import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { businessTypes } from "@/lib/db/schema";
import { asc } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const businesses = await db.query.businessTypes.findMany({
      orderBy: asc(businessTypes.sortOrder),
      with: {
        businessProducts: {
          with: { product: true },
        },
      },
    });

    return [
      { url: baseUrl, lastModified: new Date(), priority: 1 },
      ...businesses.map((b) => ({
        url: `${baseUrl}/business/${b.slug}`,
        lastModified: b.updatedAt,
        priority: 0.8,
      })),
      ...businesses.flatMap((b) =>
        b.businessProducts.map((bp) => ({
          url: `${baseUrl}/business/${b.slug}/product/${bp.product.slug}`,
          lastModified: bp.product.updatedAt,
          priority: 0.6,
        }))
      ),
    ];
  } catch {
    return [{ url: baseUrl, lastModified: new Date(), priority: 1 }];
  }
}
