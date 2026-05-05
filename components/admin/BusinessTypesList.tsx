"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SortableRowList, type SortableRow } from "./SortableRowList";
import { reorderBusinessTypes } from "@/actions/business-types";
import type { BusinessType, Image as ImageRow } from "@/lib/db/schema";

type Row = BusinessType & {
  heroImage: ImageRow | null;
  productCount: number;
};

export function BusinessTypesList({ rows }: { rows: Row[] }) {
  const router = useRouter();

  const items: SortableRow[] = rows.map((b) => ({
    id: b.id,
    render: (
      <Link
        href={`/admin/business-types/${b.id}/edit`}
        className="flex items-center gap-3 -my-1 -mx-2 px-2 py-1 rounded hover:bg-tpi-cream/40"
      >
        <div className="w-10 h-10 rounded bg-tpi-ink/5 overflow-hidden shrink-0">
          {b.heroImage?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.heroImage.url}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-tpi-ink font-medium truncate">{b.name}</div>
          <div className="text-xs text-tpi-stone truncate">/{b.slug}</div>
        </div>
        <div className="text-xs text-tpi-stone hidden md:block">
          {b.productCount} products
        </div>
        <div className="text-xs text-tpi-blue">Edit →</div>
      </Link>
    ),
  }));

  return (
    <SortableRowList
      rows={items}
      onSaveOrder={async (ids) => {
        await reorderBusinessTypes(ids);
        router.refresh();
      }}
    />
  );
}
