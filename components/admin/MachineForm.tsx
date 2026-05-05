"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "./RichTextEditor";
import { ImagePicker } from "./ImagePicker";
import { saveMachine, deleteMachine } from "@/actions/machines";
import type { Image as ImageRow } from "@/lib/db/schema";

type Initial = {
  id?: number;
  slug: string;
  label: string;
  description: string | null;
  image: ImageRow | null;
};

export function MachineForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isNew = !initial.id;

  const [slug, setSlug] = useState(initial.slug);
  const [label, setLabel] = useState(initial.label);
  const [description, setDescription] = useState<string | null>(initial.description);
  const [image, setImage] = useState<ImageRow | null>(initial.image);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveMachine({
          id: initial.id,
          slug,
          label,
          imageId: image?.id ?? null,
          description,
        });
        if (!res.ok) {
          setError(res.error ?? "Save failed");
          return;
        }
        if (isNew && res.id) {
          router.push(`/admin/machines/${res.id}/edit`);
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
    if (!confirm(`Delete "${label}"? This unassigns it from all products.`)) return;
    startTransition(async () => {
      try {
        await deleteMachine(initial.id!);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-tpi-ink/10 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <Label required hint={isNew ? undefined : "Locked after creation"}>
              Slug
            </Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="taylor-c716"
              disabled={!isNew}
              className="font-mono text-xs"
            />
          </Field>
          <Field>
            <Label required>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
        </div>
        <ImagePicker value={image} onChange={setImage} label="Machine photo" />
        <Field>
          <Label>Description (optional)</Label>
          <RichTextEditor
            value={description}
            onChange={setDescription}
            variant="full"
          />
        </Field>
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
