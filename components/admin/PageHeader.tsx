import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";

export function PageHeader({
  title,
  description,
  newHref,
  newLabel,
  backHref,
}: {
  title: string;
  description?: string;
  newHref?: string;
  newLabel?: string;
  backHref?: string;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs text-tpi-stone hover:text-tpi-ink mb-2"
          >
            <ChevronLeft className="w-3 h-3" /> Back
          </Link>
        )}
        <h1 className="text-2xl font-bold text-tpi-ink">{title}</h1>
        {description && <p className="text-sm text-tpi-stone mt-1">{description}</p>}
      </div>
      {newHref && (
        <Link
          href={newHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-tpi-orange text-white text-sm font-medium rounded-md hover:bg-tpi-orange-dark transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {newLabel ?? "New"}
        </Link>
      )}
    </div>
  );
}
