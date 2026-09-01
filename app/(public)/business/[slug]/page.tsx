import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  businessTypes,
  businessProducts,
  businessSections,
  productMachines,
} from "@/lib/db/schema";
import { ProductCard } from "@/components/public/ProductCard";
import { BusinessSections } from "@/components/public/BusinessSections";
import { tiptapToPlainText } from "@/lib/tiptap-render";
import { pluralizeBusiness, spURL } from "@/lib/utils";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const all = await db.select({ slug: businessTypes.slug }).from(businessTypes);
    return all.map((b) => ({ slug: b.slug }));
  } catch {
    // DB unavailable at build time (e.g., first deploy before seed) — render on demand.
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const b = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, slug),
  });
  if (!b) return {};
  return {
    title: `Equipment for ${pluralizeBusiness(b.name)}`,
    description: b.blurb,
  };
}

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, slug),
    with: {
      heroImage: true,
      sections: {
        orderBy: asc(businessSections.sortOrder),
        with: { image: true },
      },
      businessProducts: {
        orderBy: asc(businessProducts.sortOrder),
        with: {
          product: {
            with: {
              heroImage: true,
              productMachines: {
                orderBy: asc(productMachines.sortOrder),
                with: { machine: { with: { image: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!business) notFound();

  const description = tiptapToPlainText(business.description);
  const ctaUrl = spURL(business.slug);
  const sectionsBefore = business.sections.filter(
    (s) => s.placement === "before_products"
  );
  const sectionsAfter = business.sections.filter(
    (s) => s.placement === "after_products"
  );

  return (
    <>
      <section className="relative grain">
        <div
          className="absolute inset-0"
          style={{ background: business.fallbackGradient }}
        >
          {business.heroImage?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.heroImage.url}
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-tpi-ink/85 via-tpi-ink/50 to-tpi-ink/30" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28 text-white z-10">
          <nav className="breadcrumb text-xs uppercase tracking-wider opacity-70 mb-6">
            <Link href="/" className="hover:text-tpi-orange">
              All Businesses
            </Link>
            <span className="mx-2">/</span>
            <span>{business.name}</span>
          </nav>
          <div className="max-w-2xl fade-in">
            <div className="text-sm uppercase tracking-wider text-tpi-orange font-medium mb-4">
              {business.blurb}
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.02]">
              Equipment for{" "}
              <span className="font-serif-italic font-normal">
                {pluralizeBusiness(business.name)}
              </span>
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-xl">{description}</p>
          </div>
        </div>
      </section>

      <BusinessSections sections={sectionsBefore} ctaUrl={ctaUrl} />

      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="text-2xl font-bold text-tpi-ink">
            Choose your equipment
          </h2>
          <div className="text-xs text-tpi-stone uppercase tracking-wider">
            {business.businessProducts.length} categories
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {business.businessProducts.map((bp) => {
            const primary =
              bp.product.productMachines.find((pm) => pm.isPrimary) ??
              bp.product.productMachines[0];
            return (
              <ProductCard
                key={bp.product.id}
                businessSlug={business.slug}
                product={{
                  ...bp.product,
                  primaryMachine: primary
                    ? { ...primary.machine }
                    : null,
                }}
              />
            );
          })}
        </div>
      </section>

      <BusinessSections sections={sectionsAfter} ctaUrl={ctaUrl} />
    </>
  );
}
