"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ImagePicker } from "./ImagePicker";
import type { Image as ImageRow } from "@/lib/db/schema";

export function ImagesLibrary({ initial }: { initial: ImageRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);

  async function handleDelete(id: number) {
    if (!confirm("Delete this image? Records pointing to it will keep their reference set to null.")) return;
    setBusy(id);
    const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-tpi-stone">{initial.length} image(s)</span>
        <Button onClick={() => setPicker((s) => !s)} size="sm" variant="secondary">
          {picker ? "Hide picker" : "Add image"}
        </Button>
      </div>

      {picker && (
        <div className="mb-6 bg-white rounded-xl border border-tpi-ink/10 p-5">
          <ImagePicker
            value={null}
            onChange={() => {
              setPicker(false);
              router.refresh();
            }}
            label="Upload, paste a URL, or pick existing"
          />
        </div>
      )}

      {initial.length === 0 ? (
        <div className="bg-white rounded-xl border border-tpi-ink/10 px-6 py-12 text-center text-sm text-tpi-stone">
          No images yet. Click &quot;Add image&quot; to upload your first one.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {initial.map((img) => (
            <div
              key={img.id}
              className="bg-white rounded-xl border border-tpi-ink/10 overflow-hidden group"
            >
              <div className="aspect-square bg-tpi-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.altText ?? ""}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3">
                <div className="text-xs text-tpi-ink font-medium truncate">
                  {img.altText || "(no alt text)"}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-tpi-stone">
                    {img.sourceType}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(img.id)}
                    disabled={busy === img.id}
                    className="p-1 rounded hover:bg-red-50 text-tpi-stone hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
