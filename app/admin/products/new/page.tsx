import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { businessTypes, machines } from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
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
      <PageHeader title="New product" backHref="/admin/products" />
      <ProductForm
        initial={{
          slug: "",
          name: "",
          tagline: "",
          productLabel: null,
          summary: null,
          benefits: [],
          heroImage: null,
          learnMoreUrl: null,
          machines: [],
          businessTypeIds: [],
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
    </div>
  );
}
