"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SortableRowList } from "./SortableRowList";
import {
  BusinessSectionForm,
  type SectionKind,
  type SectionPlacement,
  type FaqItem,
} from "./BusinessSectionForm";
import { reorderBusinessSections } from "@/actions/business-sections";
import type { Image as ImageRow } from "@/lib/db/schema";

export type SectionRow = {
  id: number;
  kind: SectionKind;
  placement: SectionPlacement;
  eyebrow: string | null;
  heading: string;
  body: string | null;
  image: ImageRow | null;
  items: FaqItem[];
  ctaLabel: string | null;
};

type EditorState =
  | { mode: "closed" }
  | { mode: "new" }
  | { mode: "edit"; section: SectionRow };

const KIND_LABEL: Record<SectionKind, string> = {
  prose: "Prose",
  faq: "FAQ",
  cta: "Call to action",
};

const PLACEMENT_LABEL: Record<SectionPlacement, string> = {
  before_products: "Above grid",
  after_products: "Below grid",
};

export function BusinessSectionsManager({
  businessTypeId,
  sections,
}: {
  businessTypeId: number;
  sections: SectionRow[];
}) {
  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });

  const rows = sections.map((s) => ({
    id: s.id,
    render: (
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-sm font-medium text-tpi-ink truncate">
              {s.heading}
            </div>
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-tpi-ink/5 text-tpi-stone text-[10px] font-semibold uppercase tracking-wider">
              {KIND_LABEL[s.kind]}
            </span>
          </div>
          <div className="text-xs text-tpi-stone truncate">
            {PLACEMENT_LABEL[s.placement]}
            {s.kind === "faq" && ` · ${s.items.length} questions`}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditor({ mode: "edit", section: s })}
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
            Page sections
          </h2>
          <p className="text-xs text-tpi-stone/80 mt-1">
            Optional long-form blocks for this business page — an overview, a
            service pitch, FAQs, a closing call to action. Each one sits above
            or below the equipment grid; drag to reorder within a position.
          </p>
        </div>
        <Button size="sm" onClick={() => setEditor({ mode: "new" })}>
          <Plus className="w-3.5 h-3.5" />
          Add section
        </Button>
      </div>

      {sections.length === 0 ? (
        <div className="text-sm text-tpi-stone bg-tpi-cream/40 border border-dashed border-tpi-ink/10 rounded-lg px-4 py-6 text-center">
          No sections yet — the page shows just the hero and equipment grid.
        </div>
      ) : (
        <SortableRowList
          rows={rows}
          onSaveOrder={async (orderedIds) => {
            await reorderBusinessSections(businessTypeId, orderedIds);
          }}
        />
      )}

      {editor.mode === "new" && (
        <BusinessSectionForm
          initial={{
            businessTypeId,
            kind: "prose",
            placement: "before_products",
            eyebrow: null,
            heading: "",
            body: null,
            image: null,
            items: [],
            ctaLabel: null,
          }}
          onClose={() => setEditor({ mode: "closed" })}
        />
      )}
      {editor.mode === "edit" && (
        <BusinessSectionForm
          initial={{ ...editor.section, businessTypeId }}
          onClose={() => setEditor({ mode: "closed" })}
        />
      )}
    </div>
  );
}
