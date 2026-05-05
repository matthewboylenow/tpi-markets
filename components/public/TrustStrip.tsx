import type { SiteSettings } from "@/lib/db/schema";

export function TrustStrip({ settings }: { settings: SiteSettings }) {
  const items = [
    { v: settings.stat1Value, l: settings.stat1Label },
    { v: settings.stat2Value, l: settings.stat2Label },
    { v: settings.stat3Value, l: settings.stat3Label },
    { v: settings.stat4Value, l: settings.stat4Label },
  ];
  return (
    <section className="max-w-7xl mx-auto px-6 pb-16">
      <div className="bg-white rounded-2xl border border-tpi-ink/5 p-8 md:p-10 relative grain">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          {items.map((it, i) => (
            <div key={i}>
              <div className="text-3xl font-bold text-tpi-blue">{it.v}</div>
              <div className="text-xs text-tpi-stone mt-1 uppercase tracking-wider">
                {it.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
