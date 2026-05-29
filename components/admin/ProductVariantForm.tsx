"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "./RichTextEditor";
import { ImagePicker } from "./ImagePicker";
import {
  saveProductVariant,
  deleteProductVariant,
} from "@/actions/product-variants";
import type { Image as ImageRow } from "@/lib/db/schema";

type Initial = {
  id?: number;
  productId: number;
  slug: string;
  name: string;
  description: string | null;
  image: ImageRow | null;
};

export function ProductVariantForm({
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

  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState<string | null>(initial.description);
  const [image, setImage] = useState<ImageRow | null>(initial.image);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveProductVariant({
          id: initial.id,
          productId: initial.productId,
          slug,
          name,
          description,
          imageId: image?.id ?? null,
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
    if (!confirm(`Delete variant "${name}"?`)) return;
    startTransition(async () => {
      try {
        await deleteProductVariant(initial.id!);
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-tpi-ink/10">
          <h2 className="text-base font-semibold text-tpi-ink">
            {isNew ? "Add variant" : `Edit: ${initial.name}`}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field>
              <Label required hint={isNew ? undefined : "Locked after creation"}>
                Slug
              </Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="nice-ice"
                disabled={!isNew}
                className="font-mono text-xs"
              />
            </Field>
            <Field>
              <Label required>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Flavorburst Nice Ice"
              />
            </Field>
          </div>

          <ImagePicker value={image} onChange={setImage} label="Variant image" />

          <Field>
            <Label>Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              variant="full"
              placeholder="What makes this variant special..."
            />
          </Field>
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
            <Button onClick={submit} disabled={pending || !slug || !name}>
              {pending ? "Saving..." : isNew ? "Create" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
