import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { ImagesLibrary } from "@/components/admin/ImagesLibrary";

export const metadata = { title: "Image library" };

export default async function ImagesAdminPage() {
  const rows = await db.select().from(images).orderBy(desc(images.createdAt));
  return (
    <div>
      <PageHeader
        title="Image library"
        description="Every image uploaded to the site or referenced by URL."
      />
      <ImagesLibrary initial={rows} />
    </div>
  );
}
