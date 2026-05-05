"use client";

import { useMemo, useState } from "react";
import { GripVertical, Plus, Star, X } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export type PickerOption = {
  id: number;
  label: string;
  sublabel?: string;
};

export type SelectedItem = {
  id: number;
  isPrimary?: boolean;
};

export function RelationshipPicker({
  label,
  options,
  value,
  onChange,
  allowPrimary = false,
  emptyHint,
}: {
  label: string;
  options: PickerOption[];
  value: SelectedItem[];
  onChange: (next: SelectedItem[]) => void;
  allowPrimary?: boolean;
  emptyHint?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const optionMap = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = value.findIndex((v) => String(v.id) === active.id);
    const newIndex = value.findIndex((v) => String(v.id) === over.id);
    onChange(arrayMove(value, oldIndex, newIndex));
  };

  const remove = (id: number) => onChange(value.filter((v) => v.id !== id));
  const togglePrimary = (id: number) =>
    onChange(
      value.map((v) =>
        v.id === id ? { ...v, isPrimary: !v.isPrimary } : { ...v, isPrimary: false }
      )
    );

  const add = (id: number) => {
    if (value.some((v) => v.id === id)) return;
    const isFirst = value.length === 0;
    onChange([...value, { id, isPrimary: allowPrimary && isFirst }]);
    setPickerOpen(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium uppercase tracking-wider text-tpi-stone">
          {label}
        </label>
        <button
          type="button"
          onClick={() => setPickerOpen((s) => !s)}
          className="text-xs text-tpi-blue hover:text-tpi-orange flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      {value.length === 0 && emptyHint && (
        <div className="text-xs text-tpi-stone bg-tpi-cream/60 border border-dashed border-tpi-ink/15 rounded-md px-3 py-2 mb-2">
          {emptyHint}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={value.map((v) => String(v.id))}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5">
            {value.map((v) => {
              const option = optionMap.get(v.id);
              if (!option) return null;
              return (
                <SortableRow
                  key={v.id}
                  id={String(v.id)}
                  label={option.label}
                  sublabel={option.sublabel}
                  allowPrimary={allowPrimary}
                  isPrimary={!!v.isPrimary}
                  onTogglePrimary={() => togglePrimary(v.id)}
                  onRemove={() => remove(v.id)}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      {pickerOpen && (
        <PickerModal
          options={options.filter((o) => !value.some((v) => v.id === o.id))}
          onSelect={add}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function SortableRow({
  id,
  label,
  sublabel,
  allowPrimary,
  isPrimary,
  onTogglePrimary,
  onRemove,
}: {
  id: string;
  label: string;
  sublabel?: string;
  allowPrimary: boolean;
  isPrimary: boolean;
  onTogglePrimary: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 bg-white border border-tpi-ink/10 rounded-md px-2 py-1.5",
        isDragging && "opacity-60"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-tpi-stone hover:text-tpi-ink"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-tpi-ink truncate">{label}</div>
        {sublabel && (
          <div className="text-xs text-tpi-stone truncate">{sublabel}</div>
        )}
      </div>
      {allowPrimary && (
        <button
          type="button"
          onClick={onTogglePrimary}
          title={isPrimary ? "Primary" : "Mark as primary"}
          className={cn(
            "p-1 rounded hover:bg-tpi-ink/5",
            isPrimary ? "text-tpi-orange" : "text-tpi-stone"
          )}
        >
          <Star
            className="w-3.5 h-3.5"
            fill={isPrimary ? "currentColor" : "none"}
          />
        </button>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="p-1 rounded hover:bg-red-50 text-tpi-stone hover:text-red-600"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

function PickerModal({
  options,
  onSelect,
  onClose,
}: {
  options: PickerOption[];
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = options.filter(
    (o) =>
      o.label.toLowerCase().includes(q.toLowerCase()) ||
      o.sublabel?.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div
      className="fixed inset-0 z-50 bg-tpi-ink/40 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-tpi-ink/10">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full text-sm px-3 py-2 rounded-md border border-tpi-ink/15 focus:outline-none focus:border-tpi-blue"
          />
        </div>
        <div className="overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-sm text-tpi-stone text-center">
              {options.length === 0
                ? "All available items already added."
                : "No matches."}
            </div>
          )}
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className="w-full text-left px-5 py-3 hover:bg-tpi-cream/60 border-b border-tpi-ink/5 last:border-0"
            >
              <div className="text-sm text-tpi-ink">{o.label}</div>
              {o.sublabel && (
                <div className="text-xs text-tpi-stone">{o.sublabel}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
