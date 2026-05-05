"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Field } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "./RichTextEditor";
import { ImagePicker } from "./ImagePicker";
import {
  RelationshipPicker,
  type PickerOption,
  type SelectedItem,
} from "./RelationshipPicker";
import { BenefitsEditor } from "./BenefitsEditor";
import { saveProduct, deleteProduct } from "@/actions/products";
import type { Image as ImageRow } from "@/lib/db/schema";

type Initial = {
  id?: number;
  slug: string;
  name: string;
  tagline: string;
  productLabel: string | null;
  summary: string | null;
  benefits: string[];
  heroImage: ImageRow | null;
  learnMoreUrl: string | null;
  machines: { id: number; isPrimary: boolean }[];
  businessTypeIds: number[];
};

export function ProductForm({
  initial,
  machineOptions,
  businessOptions,
}: {
  initial: Initial;
  machineOptions: PickerOption[];
  businessOptions: PickerOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isNew = !initial.id;

  const [slug, setSlug] = useState(initial.slug);
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [productLabel, setProductLabel] = useState(initial.productLabel ?? "");
  const [summary, setSummary] = useState<string | null>(initial.summary);
  const [benefits, setBenefits] = useState<string[]>(initial.benefits);
  const [heroImage, setHeroImage] = useState<ImageRow | null>(initial.heroImage);
  const [learnMoreUrl, setLearnMoreUrl] = useState(initial.learnMoreUrl ?? "");
  const [machines, setMachines] = useState<SelectedItem[]>(
    initial.machines.map((m) => ({ id: m.id, isPrimary: m.isPrimary }))
  );
  const [businessTypeIds, setBusinessTypeIds] = useState(
    initial.businessTypeIds.map((id) => ({ id }))
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveProduct({
          id: initial.id,
          slug,
          name,
          tagline,
          productLabel: productLabel.trim() || null,
          summary,
          benefits,
          heroImageId: heroImage?.id ?? null,
          learnMoreUrl: learnMoreUrl.trim() || null,
          machines: machines.map((m) => ({
            id: m.id,
            isPrimary: !!m.isPrimary,
          })),
          businessTypeIds: businessTypeIds.map((b) => b.id),
        });
        if (!res.ok) {
          setError(res.error ?? "Save failed");
          return;
        }
        if (isNew && res.id) {
          router.push(`/admin/products/${res.id}/edit`);
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
    if (!confirm(`Delete "${name}"? This will remove it from all business pages.`)) return;
    startTransition(async () => {
      try {
        await deleteProduct(initial.id!);
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
              Slug
            </Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="frozen-coffee"
              disabled={!isNew}
              className="font-mono text-xs"
            />
          </Field>
          <Field>
            <Label required>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <Label required>Tagline (orange uppercase tracker)</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Café-craft frozen drinks"
            />
          </Field>
          <Field>
            <Label hint="Caption under the lifestyle photo">
              Product label
            </Label>
            <Input
              value={productLabel}
              onChange={(e) => setProductLabel(e.target.value)}
              placeholder="Frozen coffee & cappuccino"
            />
          </Field>
        </div>
        <Field>
          <Label>Summary</Label>
          <RichTextEditor
            value={summary}
            onChange={setSummary}
            variant="full"
            placeholder="What makes this product line a fit..."
          />
        </Field>
        <Field>
          <Label>Learn more URL</Label>
          <Input
            value={learnMoreUrl}
            onChange={(e) => setLearnMoreUrl(e.target.value)}
            placeholder="https://taylorproducts.net/..."
          />
        </Field>
      </div>

      <div className="bg-white rounded-xl border border-tpi-ink/10 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-tpi-stone">
          Hero image
        </h2>
        <ImagePicker value={heroImage} onChange={setHeroImage} label="Lifestyle / food photo" />
      </div>

      <div className="bg-white rounded-xl border border-tpi-ink/10 p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-tpi-stone">
          Benefits
        </h2>
        <BenefitsEditor value={benefits} onChange={setBenefits} />
      </div>

      <div className="bg-white rounded-xl border border-tpi-ink/10 p-6">
        <RelationshipPicker
          label="Machines (★ marks the primary machine)"
          options={machineOptions}
          value={machines}
          onChange={setMachines}
          allowPrimary
          emptyHint="Add at least one machine to display on the product detail page."
        />
      </div>

      <div className="bg-white rounded-xl border border-tpi-ink/10 p-6">
        <RelationshipPicker
          label="Business types this product appears on"
          options={businessOptions}
          value={businessTypeIds}
          onChange={setBusinessTypeIds}
          emptyHint="Pick which business pages this product should be listed on."
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
