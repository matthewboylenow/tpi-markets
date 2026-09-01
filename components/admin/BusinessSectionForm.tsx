"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Input, Label, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "./RichTextEditor";
import { ImagePicker } from "./ImagePicker";
import {
  saveBusinessSection,
  deleteBusinessSection,
} from "@/actions/business-sections";
import type { Image as ImageRow } from "@/lib/db/schema";

export type SectionKind = "prose" | "faq" | "cta";
export type SectionPlacement = "before_products" | "after_products";
export type FaqItem = { question: string; answer: string };

type Initial = {
  id?: number;
  businessTypeId: number;
  kind: SectionKind;
  placement: SectionPlacement;
  eyebrow: string | null;
  heading: string;
  body: string | null;
  image: ImageRow | null;
  items: FaqItem[];
  ctaLabel: string | null;
};

const KINDS: { value: SectionKind; label: string; hint: string }[] = [
  { value: "prose", label: "Prose", hint: "Heading, rich text, optional image beside it" },
  { value: "faq", label: "FAQ", hint: "Heading plus expandable question/answer pairs" },
  { value: "cta", label: "Call to action", hint: "Dark panel with a salesperson button" },
];

export function BusinessSectionForm({
  initial,
  onClose,
}: {
  initial: Initial;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isNew = !initial.id;

  const [kind, setKind] = useState<SectionKind>(initial.kind);
  const [placement, setPlacement] = useState<SectionPlacement>(initial.placement);
  const [eyebrow, setEyebrow] = useState(initial.eyebrow ?? "");
  const [heading, setHeading] = useState(initial.heading);
  const [body, setBody] = useState<string | null>(initial.body);
  const [image, setImage] = useState<ImageRow | null>(initial.image);
  const [items, setItems] = useState<FaqItem[]>(initial.items);
  const [ctaLabel, setCtaLabel] = useState(initial.ctaLabel ?? "");

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveBusinessSection({
          id: initial.id,
          businessTypeId: initial.businessTypeId,
          kind,
          placement,
          eyebrow: eyebrow.trim() || null,
          heading,
          body,
          imageId: image?.id ?? null,
          // Only the active kind's extra fields are persisted, so switching
          // kind doesn't leave stale FAQ rows or a button label behind.
          items: kind === "faq" ? items.filter((i) => i.question && i.answer) : [],
          ctaLabel: kind === "cta" ? ctaLabel.trim() || null : null,
        });
        if (!res.ok) {
          setError(res.error ?? "Save failed");
          return;
        }
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function handleDelete() {
    if (!initial.id) return;
    if (!confirm(`Delete section "${heading}"?`)) return;
    startTransition(async () => {
      try {
        await deleteBusinessSection(initial.id!);
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-tpi-ink/40 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-tpi-ink/10">
          <h2 className="text-base font-semibold text-tpi-ink">
            {isNew ? "Add section" : `Edit: ${initial.heading}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-tpi-stone hover:text-tpi-ink text-sm"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <Field>
            <Label required>Type</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={`text-left rounded-lg border px-3 py-2.5 transition-colors ${
                    kind === k.value
                      ? "border-tpi-orange bg-tpi-orange/5"
                      : "border-tpi-ink/10 hover:border-tpi-ink/30"
                  }`}
                >
                  <div className="text-sm font-medium text-tpi-ink">{k.label}</div>
                  <div className="text-[11px] text-tpi-stone mt-0.5 leading-snug">
                    {k.hint}
                  </div>
                </button>
              ))}
            </div>
          </Field>

          <Field>
            <Label required>Position</Label>
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value as SectionPlacement)}
              className="w-full rounded-lg border border-tpi-ink/15 px-3 py-2 text-sm bg-white"
            >
              <option value="before_products">
                Above the equipment grid
              </option>
              <option value="after_products">Below the equipment grid</option>
            </select>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <Label hint="Small orange line above the heading">Eyebrow</Label>
              <Input
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                placeholder="Build your shop"
              />
            </Field>
            <Field>
              <Label required>Heading</Label>
              <Input
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Everything under one roof"
              />
            </Field>
          </div>

          <Field>
            <Label>Body</Label>
            <RichTextEditor
              value={body}
              onChange={setBody}
              variant="full"
              placeholder="Write the section copy..."
            />
          </Field>

          {kind === "prose" && (
            <ImagePicker value={image} onChange={setImage} label="Section image" />
          )}

          {kind === "cta" && (
            <Field>
              <Label hint="Defaults to “Talk to a Salesperson”">Button label</Label>
              <Input
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="Design My Shop"
              />
            </Field>
          )}

          {kind === "faq" && (
            <Field>
              <Label>Questions</Label>
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-tpi-ink/10 p-3 space-y-2 bg-tpi-cream/30"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.question}
                        onChange={(e) =>
                          setItems(
                            items.map((it, j) =>
                              j === i ? { ...it, question: e.target.value } : it
                            )
                          )
                        }
                        placeholder="Question"
                      />
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, j) => j !== i))}
                        className="p-2 rounded-md text-tpi-stone hover:text-red-600 hover:bg-red-50 shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={item.answer}
                      onChange={(e) =>
                        setItems(
                          items.map((it, j) =>
                            j === i ? { ...it, answer: e.target.value } : it
                          )
                        )
                      }
                      placeholder="Answer"
                      rows={3}
                      className="w-full rounded-lg border border-tpi-ink/15 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setItems([...items, { question: "", answer: "" }])}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add question
                </Button>
              </div>
            </Field>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-tpi-ink/10 bg-tpi-cream/40">
          <div>
            {!isNew && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                disabled={pending}
              >
                Delete
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-sm text-red-600">{error}</span>}
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !heading}>
              {pending ? "Saving..." : isNew ? "Create" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
