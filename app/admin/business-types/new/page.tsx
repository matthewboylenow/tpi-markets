import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { BusinessTypeForm } from "@/components/admin/BusinessTypeForm";

export const metadata = { title: "New business type" };

export default async function NewBusinessTypePage() {
  const productList = await db
    .select({ id: products.id, name: products.name, slug: products.slug })
    .from(products)
    .orderBy(asc(products.sortOrder));

  return (
    <div>
      <PageHeader
        title="New business type"
        backHref="/admin/business-types"
      />
      <BusinessTypeForm
        initial={{
          slug: "",
          name: "",
          blurb: "",
          description: null,
          heroImage: null,
          fallbackGradient: "linear-gradient(135deg, #0066b2 0%, #004d85 100%)",
          productIds: [],
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
