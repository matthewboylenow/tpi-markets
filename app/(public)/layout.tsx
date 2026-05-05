import { Nav } from "@/components/public/Nav";
import { Footer } from "@/components/public/Footer";
import { getSiteSettings } from "@/lib/db/queries/site-settings";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  const tagline = settings?.footerTagline ?? "Serving NJ, NY, PA & DE since 1985";
  return (
    <>
      <Nav />
      {children}
      <Footer tagline={tagline} />
    </>
  );
}
