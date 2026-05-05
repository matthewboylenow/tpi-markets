import Link from "next/link";
import { tiptapToPlainText } from "@/lib/tiptap-render";
import type { BusinessType, Image as ImageRow } from "@/lib/db/schema";

type Props = {
  business: BusinessType & { heroImage: ImageRow | null };
  productCount: number;
};

export function BusinessCard({ business, productCount }: Props) {
  const description = tiptapToPlainText(business.description);
  return (
    <Link
      href={`/business/${business.slug}`}
      className="card-hover img-zoom group block bg-white rounded-2xl overflow-hidden border border-tpi-ink/5"
    >
      <div
        className="aspect-[4/3] overflow-hidden relative"
        style={{ background: business.fallbackGradient }}
      >
        {business.heroImage?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.heroImage.url}
            alt={business.heroImage.altText ?? business.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="text-xs tracking-wider uppercase opacity-80 mb-1">
            {business.blurb}
          </div>
          <div className="text-3xl font-bold tracking-tight">{business.name}</div>
        </div>
      </div>
      <div className="p-6">
        <p className="text-tpi-stone text-sm leading-relaxed">{description}</p>
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-tpi-stone uppercase tracking-wider">
            {productCount} equipment categories
          </div>
          <div className="w-9 h-9 rounded-full bg-tpi-cream group-hover:bg-tpi-orange group-hover:text-white flex items-center justify-center transition-colors">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
