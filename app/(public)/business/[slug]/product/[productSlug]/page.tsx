import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import {
  businessTypes,
  products,
  businessProducts,
  productMachines,
  productVariants,
} from "@/lib/db/schema";
import { tiptapToPlainText } from "@/lib/tiptap-render";
import { spURL } from "@/lib/utils";
import { ProductVariantsSection } from "@/components/public/ProductVariantsSection";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const rows = await db
      .select({
        businessSlug: businessTypes.slug,
        productSlug: products.slug,
      })
      .from(businessProducts)
      .innerJoin(businessTypes, eq(businessProducts.businessTypeId, businessTypes.id))
      .innerJoin(products, eq(businessProducts.productId, products.id));
    return rows.map((r) => ({
      slug: r.businessSlug,
      productSlug: r.productSlug,
    }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { productSlug } = await params;
  const p = await db.query.products.findFirst({
    where: eq(products.slug, productSlug),
  });
  if (!p) return {};
  const summaryPlain = tiptapToPlainText(p.summary);
  return {
    title: p.name,
    description: summaryPlain.slice(0, 160),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;

  const business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.slug, slug),
    with: {
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
              variants: {
                orderBy: asc(productVariants.sortOrder),
                with: { image: true },
              },
            },
          },
        },
      },
    },
  });
  if (!business) notFound();

  const productEntry = business.businessProducts.find(
    (bp) => bp.product.slug === productSlug
  );
  if (!productEntry) notFound();

  const product = productEntry.product;
  const primaryMachine =
    product.productMachines.find((pm) => pm.isPrimary)?.machine ??
    product.productMachines[0]?.machine ??
    null;

  const ctaUrl = spURL(business.slug, productSlug);
  const summaryPlain = tiptapToPlainText(product.summary);

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-10">
        <nav className="breadcrumb text-xs uppercase tracking-wider text-tpi-stone mb-8">
          <Link href="/" className="hover:text-tpi-orange">
            All Businesses
          </Link>
          <span className="mx-2">/</span>
          <Link
            href={`/business/${business.slug}`}
            className="hover:text-tpi-orange"
          >
            {business.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-tpi-ink">{product.name}</span>
        </nav>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-12 fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="lg:sticky lg:top-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl border border-tpi-ink/5 overflow-hidden">
              <div className="aspect-square bg-tpi-ink/5 overflow-hidden">
                {product.heroImage?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.heroImage.url}
                    alt={
                      product.heroImage.altText ??
                      product.productLabel ??
                      product.name
                    }
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="px-4 py-3 border-t border-tpi-ink/5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-tpi-orange font-medium mb-0.5">
                  What you&apos;ll serve
                </div>
                <div className="text-xs text-tpi-ink font-medium">
                  {product.productLabel ?? product.name}
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-tpi-ink/5 overflow-hidden">
              <div className="aspect-square product-img-bg flex items-center justify-center p-6">
                {primaryMachine?.image?.url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={primaryMachine.image.url}
                    alt={primaryMachine.label}
                    className="machine-img max-h-full max-w-full object-contain drop-shadow-lg"
                  />
                )}
              </div>
              <div className="px-4 py-3 border-t border-tpi-ink/5 text-center">
                <div className="text-[10px] uppercase tracking-wider text-tpi-blue font-medium mb-0.5">
                  The machine
                </div>
                <div className="text-xs text-tpi-ink font-medium">
                  {primaryMachine?.label ?? "—"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="pill bg-tpi-orange/10 text-tpi-orange-dark mb-5">
              For your {business.name}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-tpi-ink leading-[1.05]">
              {product.name}
            </h1>
            <p className="mt-5 text-lg text-tpi-stone leading-relaxed">
              {summaryPlain}
            </p>

            <div className="mt-10">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-tpi-ink mb-5">
                Why operators choose it
              </h3>
              <ul className="space-y-3">
                {(product.benefits ?? []).map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-tpi-orange/15 flex items-center justify-center flex-shrink-0">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#FF7B00"
                        strokeWidth="3"
                        className="w-3 h-3"
                      >
                        <path d="M5 12l5 5L20 7" />
                      </svg>
                    </div>
                    <span className="text-tpi-ink">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 bg-tpi-orange text-white font-medium rounded-lg hover:bg-tpi-orange-dark transition-colors flex items-center justify-center gap-2 text-center"
              >
                Get Pricing &amp; Details
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 border-2 border-tpi-ink text-tpi-ink font-medium rounded-lg hover:bg-tpi-ink hover:text-white transition-colors text-center"
              >
                Talk to a Salesperson
              </a>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {product.learnMoreUrl && (
                <a
                  href={product.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 text-sm text-tpi-blue font-medium rounded-lg border border-tpi-blue/20 hover:border-tpi-blue/50 transition-colors text-center"
                >
                  View all models on taylorproducts.net →
                </a>
              )}
              <a
                href="https://finder.taylorproducts.net"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 text-sm text-tpi-stone font-medium rounded-lg border border-tpi-ink/10 hover:border-tpi-ink/30 transition-colors text-center"
              >
                Use the detailed model finder →
              </a>
            </div>
          </div>
        </div>
      </section>

      {product.variants.length > 0 && (
        <ProductVariantsSection
          productName={product.name}
          ctaUrl={ctaUrl}
          variants={product.variants.map((v) => ({
            id: v.id,
            slug: v.slug,
            name: v.name,
            description: v.description,
            image: v.image
              ? { url: v.image.url, altText: v.image.altText }
              : null,
          }))}
        />
      )}

      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-tpi-ink/10">
        <h2 className="text-2xl font-bold text-tpi-ink mb-8">
          Other equipment for {business.name}s
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 stagger">
          {business.businessProducts
            .filter((bp) => bp.product.slug !== productSlug)
            .map((bp) => {
              const op = bp.product;
              const opMachine =
                op.productMachines.find((pm) => pm.isPrimary)?.machine ??
                op.productMachines[0]?.machine ??
                null;
              return (
                <Link
                  key={op.id}
                  href={`/business/${business.slug}/product/${op.slug}`}
                  className="card-hover group block bg-white rounded-xl border border-tpi-ink/5 overflow-hidden"
                >
                  <div className="aspect-square relative bg-tpi-ink/5 overflow-hidden">
                    {op.heroImage?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={op.heroImage.url}
                        alt={op.heroImage.altText ?? op.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {opMachine?.image?.url && (
                      <div
                        className="absolute bottom-2 right-2 w-12 h-12 rounded-lg product-img-bg border border-white shadow-sm flex items-center justify-center p-1"
                        title={opMachine.label}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={opMachine.image.url}
                          alt={opMachine.label}
                          className="machine-img max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-tpi-ink text-sm leading-tight">
                      {op.name}
                    </div>
                    <div className="text-xs text-tpi-stone mt-1">
                      {op.tagline}
                    </div>
                  </div>
                </Link>
              );
            })}
        </div>
      </section>
    </>
  );
}
