"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SortableRowList } from "./SortableRowList";
import { ProductVariantForm } from "./ProductVariantForm";
import { reorderProductVariants } from "@/actions/product-variants";
import type { Image as ImageRow } from "@/lib/db/schema";

export type VariantRow = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  isFeatured: boolean;
  image: ImageRow | null;
};

type EditorState =
  | { mode: "closed" }
  | { mode: "new" }
  | { mode: "edit"; variant: VariantRow };

export function ProductVariantsManager({
  productId,
  variants,
}: {
  productId: number;
  variants: VariantRow[];
}) {
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const rows = variants.map((v) => ({
    id: v.id,
    render: (
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-md bg-tpi-ink/5 overflow-hidden shrink-0">
          {v.image?.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.image.url}
              alt={v.image.altText ?? v.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-sm font-medium text-tpi-ink truncate">{v.name}</div>
            {v.isFeatured && (
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-tpi-orange/10 text-tpi-orange text-[10px] font-semibold uppercase tracking-wider">
                Featured
              </span>
            )}
          </div>
          <div className="text-xs text-tpi-stone font-mono truncate">{v.slug}</div>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ mode: "edit", variant: v })}
          className="p-1.5 rounded-md hover:bg-tpi-ink/5 text-tpi-stone hover:text-tpi-ink"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    ),
  }));

  return (
    <div className="bg-white rounded-xl border border-tpi-ink/10 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-tpi-stone">
            Variants
          </h2>
          <p className="text-xs text-tpi-stone/80 mt-1">
            Optional. When present, the product page shows a grid of variants
            instead of the standard layout. Each variant opens a modal with its
            image, description, and the standard CTAs.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditor({ mode: "new" })}>
          <Plus className="w-3.5 h-3.5" />
          Add variant
        </Button>
      </div>

      {variants.length === 0 ? (
        <div className="text-sm text-tpi-stone bg-tpi-cream/40 border border-dashed border-tpi-ink/10 rounded-lg px-4 py-6 text-center">
          No variants yet.
        </div>
      ) : (
        <SortableRowList
          rows={rows}
          onSaveOrder={async (orderedIds) => {
            await reorderProductVariants(productId, orderedIds);
          }}
        />
      )}

      {editor.mode === "new" && (
        <ProductVariantForm
          initial={{
            productId,
            slug: "",
            name: "",
            description: null,
            isFeatured: false,
            image: null,
          }}
          onClose={() => setEditor({ mode: "closed" })}
        />
      )}
      {editor.mode === "edit" && (
        <ProductVariantForm
          initial={{
            id: editor.variant.id,
            productId,
            slug: editor.variant.slug,
            name: editor.variant.name,
            description: editor.variant.description,
            isFeatured: editor.variant.isFeatured,
            image: editor.variant.image,
          }}
          onClose={() => setEditor({ mode: "closed" })}
        />
      )}
    </div>
  );
}
