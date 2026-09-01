import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  businessTypes,
  businessProducts,
  businessSections,
  products,
} from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { BusinessTypeForm } from "@/components/admin/BusinessTypeForm";
import { BusinessSectionsManager } from "@/components/admin/BusinessSectionsManager";

export const metadata = { title: "Edit business type" };

export default async function EditBusinessTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const business = await db.query.businessTypes.findFirst({
    where: eq(businessTypes.id, id),
    with: {
      heroImage: true,
      sections: {
        orderBy: asc(businessSections.sortOrder),
        with: { image: true },
      },
      businessProducts: {
        orderBy: asc(businessProducts.sortOrder),
      },
    },
  });
  if (!business) notFound();

  const productList = await db
    .select({ id: products.id, name: products.name, slug: products.slug })
    .from(products)
    .orderBy(asc(products.sortOrder));

  return (
    <div>
      <PageHeader
        title={`Edit: ${business.name}`}
        backHref="/admin/business-types"
      />
      <BusinessTypeForm
        initial={{
          id: business.id,
          slug: business.slug,
          name: business.name,
          blurb: business.blurb,
          description: business.description,
          heroImage: business.heroImage,
          fallbackGradient: business.fallbackGradient,
          productIds: business.businessProducts.map((bp) => bp.productId),
        }}
        productOptions={productList.map((p) => ({
          id: p.id,
          label: p.name,
          sublabel: p.slug,
        }))}
      />
      <div className="mt-6">
        <BusinessSectionsManager
          businessTypeId={business.id}
          sections={business.sections.map((s) => ({
            id: s.id,
            kind: s.kind,
            placement: s.placement,
            eyebrow: s.eyebrow,
            heading: s.heading,
            body: s.body,
            image: s.image,
            items: s.items ?? [],
            ctaLabel: s.ctaLabel,
          }))}
        />
      </div>
    </div>
  );
}
