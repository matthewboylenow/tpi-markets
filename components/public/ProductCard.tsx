import Link from "next/link";
import { tiptapToPlainText } from "@/lib/tiptap-render";
import type { Product, Machine, Image as ImageRow } from "@/lib/db/schema";

type Props = {
  businessSlug: string;
  /** Per-business rename; falls back to the product's global name. */
  displayName?: string | null;
  product: Product & {
    heroImage: ImageRow | null;
    primaryMachine: (Machine & { image: ImageRow | null }) | null;
  };
};

export function ProductCard({ businessSlug, displayName, product }: Props) {
  const name = displayName ?? product.name;
  const summary = tiptapToPlainText(product.summary);
  const machine = product.primaryMachine;
  return (
    <Link
      href={`/business/${businessSlug}/product/${product.slug}`}
      className="card-hover img-zoom group block bg-white rounded-2xl overflow-hidden border border-tpi-ink/5"
    >
      <div className="aspect-[5/3] overflow-hidden relative bg-tpi-ink/5">
        {product.heroImage?.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.heroImage.url}
            alt={product.heroImage.altText ?? name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {machine?.image?.url && (
          <div
            className="absolute top-3 right-3 w-20 h-20 rounded-xl product-img-bg border border-white shadow-md flex items-center justify-center p-2"
            title={machine.label}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={machine.image.url}
              alt={machine.label}
              className="machine-img max-h-full max-w-full object-contain"
              loading="lazy"
            />
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="text-xs text-tpi-orange font-medium uppercase tracking-wider mb-1">
          {product.tagline}
        </div>
        <h3 className="text-xl font-bold text-tpi-ink leading-tight">
          {name}
        </h3>
        <p className="mt-2 text-sm text-tpi-stone leading-relaxed line-clamp-2">
          {summary}
        </p>
        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm font-medium text-tpi-blue group-hover:text-tpi-orange transition-colors">
            View details
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-4 h-4 text-tpi-stone group-hover:text-tpi-orange group-hover:translate-x-1 transition-all"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
