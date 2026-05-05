import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  businessTypes,
  businessProducts,
  type BusinessType,
  type Image as ImageRow,
  type SiteSettings,
} from "@/lib/db/schema";
import { getSiteSettings } from "@/lib/db/queries/site-settings";
import { BusinessCard } from "@/components/public/BusinessCard";
import { TrustStrip } from "@/components/public/TrustStrip";
import { RichText } from "@/components/public/RichText";
import { spURL } from "@/lib/utils";
import { notFound } from "next/navigation";

export const revalidate = 60;

export default async function HomePage() {
  let settings: SiteSettings | null = null;
  let businesses: (BusinessType & { heroImage: ImageRow | null })[] = [];
  let counts: { businessTypeId: number; count: number }[] = [];

  try {
    settings = await getSiteSettings();
    businesses = await db.query.businessTypes.findMany({
      with: { heroImage: true },
      orderBy: asc(businessTypes.sortOrder),
    });
    counts = await db
      .select({
        businessTypeId: businessProducts.businessTypeId,
        count: sql<number>`count(*)::int`,
      })
      .from(businessProducts)
      .groupBy(businessProducts.businessTypeId);
  } catch {
    // DB unreachable — fall through to notFound()
  }

  if (!settings) notFound();

  const countMap = new Map(counts.map((c) => [c.businessTypeId, Number(c.count)]));

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-10 fade-in">
        <div className="max-w-3xl">
          <div className="pill bg-tpi-orange/10 text-tpi-orange-dark mb-6">
            <span className="ticker-dot" /> {settings.heroPillText}
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-tpi-ink leading-[1.02]">
            {settings.heroH1Part1}{" "}
            <span className="font-serif-italic font-normal text-tpi-blue">
              {settings.heroH1Part2}
            </span>
          </h1>
          <div className="mt-6 text-lg text-tpi-stone max-w-2xl">
            <RichText content={settings.heroSubheading} />
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {businesses.map((b) => (
            <BusinessCard
              key={b.id}
              business={b}
              productCount={countMap.get(b.id) ?? 0}
            />
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-tpi-stone text-sm">
            {settings.emptyStateText}{" "}
            <a
              href={spURL("other", "not-listed")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-tpi-blue font-medium underline-grow ml-1"
            >
              {settings.emptyStateLinkText}
            </a>
          </p>
        </div>
      </section>

      <TrustStrip settings={settings} />
    </>
  );
}
