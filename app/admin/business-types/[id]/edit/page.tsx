import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  businessTypes,
  businessProducts,
  products,
} from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { BusinessTypeForm } from "@/components/admin/BusinessTypeForm";

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
    </div>
  );
}
