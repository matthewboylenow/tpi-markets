"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "./RichTextEditor";
import { ImagePicker } from "./ImagePicker";
import { RelationshipPicker, type PickerOption } from "./RelationshipPicker";
import { saveBusinessType, deleteBusinessType } from "@/actions/business-types";
import type { Image as ImageRow } from "@/lib/db/schema";

type Initial = {
  id?: number;
  slug: string;
  name: string;
  blurb: string;
  description: string | null;
  heroImage: ImageRow | null;
  fallbackGradient: string;
  productIds: number[];
};

export function BusinessTypeForm({
  initial,
  productOptions,
}: {
  initial: Initial;
  productOptions: PickerOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.name);
  const [blurb, setBlurb] = useState(initial.blurb);
  const [description, setDescription] = useState<string | null>(initial.description);
  const [heroImage, setHeroImage] = useState<ImageRow | null>(initial.heroImage);
  const [fallbackGradient, setFallbackGradient] = useState(initial.fallbackGradient);
  const [productIds, setProductIds] = useState(
    initial.productIds.map((id) => ({ id }))
  );

  const isNew = !initial.id;

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveBusinessType({
          id: initial.id,
          slug,
          name,
          blurb,
          description,
          heroImageId: heroImage?.id ?? null,
          fallbackGradient,
          productIds: productIds.map((p) => p.id),
        });
        if (!res.ok) {
          setError(res.error ?? "Save failed");
          return;
        }
        if (isNew && res.id) {
          router.push(`/admin/business-types/${res.id}/edit`);
        } else {
          router.refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  function handleDelete() {
    if (!initial.id) return;
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteBusinessType(initial.id!);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-tpi-ink/10 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-tpi-stone">
          Basics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label required hint={isNew ? undefined : "Locked after creation"}>
              Slug (URL segment)
            </Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="cafe"
              disabled={!isNew}
              className="font-mono text-xs"
            />
          </Field>
          <Field>
            <Label required>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        </div>
        <Field>
          <Label required>Blurb (uppercase tracker on hero card)</Label>
          <Input value={blurb} onChange={(e) => setBlurb(e.target.value)} />
        </Field>
        <Field>
          <Label>Description (homepage card + business hero subheading)</Label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            variant="full"
            placeholder="Add cold, profitable items to your menu..."
          />
        </Field>
      </div>

      <div className="bg-white rounded-xl border border-tpi-ink/10 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-tpi-stone">
          Visuals
        </h2>
        <ImagePicker value={heroImage} onChange={setHeroImage} label="Hero image" />
        <Field>
          <Label hint="CSS linear-gradient(...). Used as fallback if image missing.">
            Fallback gradient
          </Label>
          <Input
            value={fallbackGradient}
            onChange={(e) => setFallbackGradient(e.target.value)}
            placeholder="linear-gradient(135deg, #6B4423 0%, #2D1810 100%)"
            className="font-mono text-xs"
          />
          <div
            className="mt-2 h-10 rounded-md border border-tpi-ink/10"
            style={{ background: fallbackGradient }}
          />
        </Field>
      </div>

      <div className="bg-white rounded-xl border border-tpi-ink/10 p-6">
        <RelationshipPicker
          label="Products shown on this business page"
          options={productOptions}
          value={productIds}
          onChange={setProductIds}
          emptyHint="Add products to populate this business's equipment grid."
        />
      </div>

      <div className="flex items-center justify-between sticky bottom-0 bg-tpi-cream py-3 -mx-8 px-8 border-t border-tpi-ink/10">
        <div>
          {!isNew && (
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
              Delete
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving..." : isNew ? "Create" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
