"use client";

import { useEffect, useState } from "react";
import { X, Upload, Link as LinkIcon, ImageIcon } from "lucide-react";
import { upload } from "@vercel/blob/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import type { Image as ImageRow } from "@/lib/db/schema";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type Mode = "library" | "upload" | "external";

export function ImagePicker({
  value,
  onChange,
  label = "Image",
}: {
  value: ImageRow | null;
  onChange: (img: ImageRow | null) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium uppercase tracking-wider text-tpi-stone">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-tpi-stone hover:text-red-600"
          >
            Remove
          </button>
        )}
      </div>
      <div
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setOpen(true);
        }}
        className={cn(
          "rounded-lg border border-dashed border-tpi-ink/20 bg-white p-3 cursor-pointer hover:border-tpi-blue/50 transition-colors",
          value && "border-solid border-tpi-ink/15"
        )}
      >
        {value ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.url}
              alt={value.altText ?? ""}
              className="w-16 h-16 rounded object-cover bg-tpi-ink/5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-tpi-ink truncate">
                {value.altText || value.url.split("/").pop()}
              </div>
              <div className="text-xs text-tpi-stone capitalize">
                {value.sourceType}
              </div>
            </div>
            <span className="text-xs text-tpi-blue underline">Change</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-tpi-stone">
            <ImageIcon className="w-4 h-4" />
            <span>Click to choose, upload, or paste a URL</span>
          </div>
        )}
      </div>
      {open && (
        <ImagePickerModal
          onClose={() => setOpen(false)}
          onSelect={(img) => {
            onChange(img);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

function ImagePickerModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (img: ImageRow) => void;
}) {
  const [mode, setMode] = useState<Mode>("library");
  return (
    <div
      className="fixed inset-0 z-50 bg-tpi-ink/40 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-tpi-ink/10">
          <h2 className="text-base font-semibold text-tpi-ink">Choose image</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-tpi-ink/5"
          >
            <X className="w-4 h-4 text-tpi-stone" />
          </button>
        </div>

        <div className="flex border-b border-tpi-ink/10 px-5 gap-2">
          {(
            [
              { id: "library", label: "Library", icon: ImageIcon },
              { id: "upload", label: "Upload", icon: Upload },
              { id: "external", label: "External URL", icon: LinkIcon },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 -mb-px transition-colors",
                  mode === t.id
                    ? "border-tpi-blue text-tpi-blue"
                    : "border-transparent text-tpi-stone hover:text-tpi-ink"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto p-5">
          {mode === "library" && <LibraryPanel onSelect={onSelect} />}
          {mode === "upload" && <UploadPanel onSelect={onSelect} />}
          {mode === "external" && <ExternalPanel onSelect={onSelect} />}
        </div>
      </div>
    </div>
  );
}

function LibraryPanel({ onSelect }: { onSelect: (img: ImageRow) => void }) {
  const [list, setList] = useState<ImageRow[] | null>(null);
  useEffect(() => {
    fetch("/api/images")
      .then((r) => r.json())
      .then((data) => setList(data));
  }, []);
  if (!list) return <div className="text-sm text-tpi-stone">Loading...</div>;
  if (list.length === 0)
    return <div className="text-sm text-tpi-stone">No images yet. Upload one to get started.</div>;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
      {list.map((img) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onSelect(img)}
          className="aspect-square rounded-lg overflow-hidden border border-tpi-ink/10 hover:border-tpi-blue hover:shadow-sm transition-all bg-tpi-ink/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt={img.altText ?? ""}
            className="w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}

function UploadPanel({ onSelect }: { onSelect: (img: ImageRow) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alt, setAlt] = useState("");

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error("Max file size is 10MB");
      }
      const blob = await upload(`uploads/${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: blob.url,
          blobPathname: blob.pathname,
          altText: alt,
          sourceType: "blob",
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      const img = (await res.json()) as ImageRow;
      onSelect(img);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-tpi-stone block mb-1.5">
          Alt text (for accessibility & SEO)
        </label>
        <Input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image briefly"
        />
      </div>
      <label
        className={cn(
          "block rounded-lg border-2 border-dashed border-tpi-ink/20 p-10 text-center cursor-pointer hover:border-tpi-blue/50 transition-colors",
          busy && "opacity-60 pointer-events-none"
        )}
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          disabled={busy}
        />
        <Upload className="w-6 h-6 mx-auto mb-2 text-tpi-stone" />
        <div className="text-sm text-tpi-ink font-medium">
          {busy ? "Uploading..." : "Click to upload"}
        </div>
        <div className="text-xs text-tpi-stone mt-1">PNG, JPG, WebP up to 10MB</div>
      </label>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}

function ExternalPanel({ onSelect }: { onSelect: (img: ImageRow) => void }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, altText: alt, sourceType: "external" }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      const img = (await res.json()) as ImageRow;
      onSelect(img);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-tpi-stone block mb-1.5">
          External image URL
        </label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/photo.jpg"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-tpi-stone block mb-1.5">
          Alt text
        </label>
        <Input
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Describe the image briefly"
        />
      </div>
      <Button onClick={save} disabled={!url || busy}>
        {busy ? "Saving..." : "Save image"}
      </Button>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
