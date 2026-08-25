import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  products,
  productMachines,
  productVariants,
  businessProducts,
  businessTypes,
  machines,
} from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { ProductVariantsManager } from "@/components/admin/ProductVariantsManager";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const product = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      heroImage: true,
      productMachines: {
        orderBy: asc(productMachines.sortOrder),
      },
      businessProducts: true,
      variants: {
        orderBy: asc(productVariants.sortOrder),
        with: { image: true },
      },
    },
  });
  if (!product) notFound();

  const [machineList, businessList] = await Promise.all([
    db
      .select({ id: machines.id, label: machines.label, slug: machines.slug })
      .from(machines)
      .orderBy(asc(machines.label)),
    db
      .select({ id: businessTypes.id, name: businessTypes.name, slug: businessTypes.slug })
      .from(businessTypes)
      .orderBy(asc(businessTypes.sortOrder)),
  ]);

  return (
    <div>
      <PageHeader title={`Edit: ${product.name}`} backHref="/admin/products" />
      <ProductForm
        initial={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          tagline: product.tagline,
          productLabel: product.productLabel,
          summary: product.summary,
          benefits: product.benefits ?? [],
          heroImage: product.heroImage,
          learnMoreUrl: product.learnMoreUrl,
          machines: product.productMachines.map((pm) => ({
            id: pm.machineId,
            isPrimary: pm.isPrimary,
          })),
          businessTypeIds: product.businessProducts.map((bp) => bp.businessTypeId),
        }}
        machineOptions={machineList.map((m) => ({
          id: m.id,
          label: m.label,
          sublabel: m.slug,
        }))}
        businessOptions={businessList.map((b) => ({
          id: b.id,
          label: b.name,
          sublabel: b.slug,
        }))}
      />
      <div className="mt-6">
        <ProductVariantsManager
          productId={product.id}
          variants={product.variants.map((v) => ({
            id: v.id,
            slug: v.slug,
            name: v.name,
            description: v.description,
            isFeatured: v.isFeatured,
            image: v.image,
          }))}
        />
      </div>
    </div>
  );
}
