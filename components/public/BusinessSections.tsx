import { RichText } from "./RichText";
import { cn } from "@/lib/utils";
import type { BusinessSection, Image as ImageRow } from "@/lib/db/schema";

export type PublicSection = BusinessSection & { image: ImageRow | null };

export function BusinessSections({
  sections,
  ctaUrl,
}: {
  sections: PublicSection[];
  ctaUrl: string;
}) {
  if (sections.length === 0) return null;
  return (
    <>
      {sections.map((section, i) => {
        switch (section.kind) {
          case "faq":
            return <FaqSection key={section.id} section={section} />;
          case "cta":
            return <CtaSection key={section.id} section={section} ctaUrl={ctaUrl} />;
          default:
            // Alternate the image side so consecutive prose blocks don't
            // read as one long column.
            return (
              <ProseSection key={section.id} section={section} flip={i % 2 === 1} />
            );
        }
      })}
    </>
  );
}

function Eyebrow({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="text-xs uppercase tracking-wider text-tpi-orange font-medium mb-3">
      {text}
    </div>
  );
}

function ProseSection({
  section,
  flip,
}: {
  section: PublicSection;
  flip: boolean;
}) {
  const hasImage = Boolean(section.image?.url);
  return (
    <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
      <div
        className={cn(
          "grid gap-10 md:gap-14 items-center",
          hasImage ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-3xl"
        )}
      >
        {hasImage && (
          <div
            className={cn(
              "rounded-3xl overflow-hidden bg-tpi-ink/5 aspect-[4/3]",
              flip && "lg:order-2"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={section.image!.url}
              alt={section.image!.altText ?? ""}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}
        <div className={cn(flip && "lg:order-1")}>
          <Eyebrow text={section.eyebrow} />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-tpi-ink leading-tight">
            {section.heading}
          </h2>
          <RichText
            content={section.body}
            className="mt-5 text-tpi-stone leading-relaxed"
          />
        </div>
      </div>
    </section>
  );
}

function FaqSection({ section }: { section: PublicSection }) {
  const items = section.items ?? [];
  return (
    <section className="max-w-7xl mx-auto px-6 py-12 md:py-16 border-t border-tpi-ink/10">
      <div className="max-w-3xl">
        <Eyebrow text={section.eyebrow} />
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-tpi-ink leading-tight">
          {section.heading}
        </h2>
        <RichText
          content={section.body}
          className="mt-5 text-tpi-stone leading-relaxed"
        />
        <div className="mt-8 divide-y divide-tpi-ink/10 border-y border-tpi-ink/10">
          {items.map((item, i) => (
            <details key={i} className="group py-4">
              <summary className="flex items-start justify-between gap-4 cursor-pointer list-none font-medium text-tpi-ink">
                {item.question}
                <span className="mt-1 shrink-0 text-tpi-orange transition-transform group-open:rotate-45">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-4 h-4"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-tpi-stone leading-relaxed pr-8">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection({
  section,
  ctaUrl,
}: {
  section: PublicSection;
  ctaUrl: string;
}) {
  return (
    <section className="max-w-7xl mx-auto px-6 py-12 md:py-16">
      <div className="rounded-3xl bg-tpi-ink text-white p-10 md:p-14 relative grain overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <Eyebrow text={section.eyebrow} />
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {section.heading}
          </h2>
          <RichText
            content={section.body}
            className="mt-5 text-white/80 leading-relaxed"
          />
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3.5 bg-tpi-orange text-white font-medium rounded-lg hover:bg-tpi-orange-dark transition-colors"
          >
            {section.ctaLabel ?? "Talk to a Salesperson"}
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
        </div>
      </div>
    </section>
  );
}
