"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { RichText } from "./RichText";

export type PublicVariant = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  image: { url: string; altText: string | null } | null;
};

export function ProductVariantsSection({
  productName,
  variants,
  ctaUrl,
}: {
  productName: string;
  variants: PublicVariant[];
  ctaUrl: string;
}) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = variants.find((v) => v.id === activeId) ?? null;

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  if (variants.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 pb-16">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-tpi-ink">
          Explore the {productName} lineup
        </h2>
        <p className="mt-2 text-tpi-stone">
          Tap any flavor to see what it serves and how it fits your menu.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger">
        {variants.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setActiveId(v.id)}
            className="card-hover group block bg-white rounded-2xl border border-tpi-ink/5 overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-tpi-orange/40"
          >
            <div className="aspect-square bg-tpi-ink/5 overflow-hidden relative">
              {v.image?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={v.image.url}
                  alt={v.image.altText ?? v.name}
                  className="img-zoom w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-tpi-ink/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="p-4 flex items-center justify-between gap-2">
              <div className="font-semibold text-tpi-ink text-sm leading-tight">
                {v.name}
              </div>
              <span className="text-xs text-tpi-orange font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                View →
              </span>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <VariantModal
          variant={active}
          ctaUrl={ctaUrl}
          onClose={() => setActiveId(null)}
        />
      )}
    </section>
  );
}

function VariantModal({
  variant,
  ctaUrl,
  onClose,
}: {
  variant: PublicVariant;
  ctaUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-tpi-ink/60 flex items-center justify-center p-4 sm:p-6 fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={variant.name}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur shadow-md flex items-center justify-center text-tpi-ink hover:bg-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-tpi-ink/5 aspect-square md:aspect-auto md:min-h-[420px]">
              {variant.image?.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={variant.image.url}
                  alt={variant.image.altText ?? variant.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-6 md:p-8 flex flex-col">
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-tpi-ink leading-tight">
                {variant.name}
              </h3>
              <div className="mt-4 flex-1">
                <RichText
                  content={variant.description}
                  className="text-tpi-stone leading-relaxed"
                />
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 bg-tpi-orange text-white font-medium rounded-lg hover:bg-tpi-orange-dark transition-colors flex items-center justify-center gap-2 text-center"
                >
                  Get Pricing &amp; Details
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
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 border-2 border-tpi-ink text-tpi-ink font-medium rounded-lg hover:bg-tpi-ink hover:text-white transition-colors text-center"
                >
                  Talk to a Salesperson
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
