import { notFound } from "next/navigation";
import { getSiteSettings } from "@/lib/db/queries/site-settings";
import { SiteSettingsForm } from "@/components/admin/SiteSettingsForm";

export const metadata = { title: "Site Settings" };

export default async function SiteSettingsPage() {
  const settings = await getSiteSettings();
  if (!settings) notFound();
  return (
    <div>
      <h1 className="text-2xl font-bold text-tpi-ink mb-1">Site Settings</h1>
      <p className="text-sm text-tpi-stone mb-8">
        Edit the homepage hero, trust strip, and footer copy.
      </p>
      <SiteSettingsForm initial={settings} />
    </div>
  );
}
