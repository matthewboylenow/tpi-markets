"use client";

import { GripVertical, Plus, X } from "lucide-react";
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
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export function BenefitsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id);
    const newIndex = Number(over.id);
    onChange(arrayMove(value, oldIndex, newIndex));
  };
  const updateAt = (i: number, v: string) =>
    onChange(value.map((b, idx) => (idx === i ? v : b)));
  const removeAt = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={value.map((_, i) => String(i))}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-1.5">
            {value.map((b, i) => (
              <BenefitRow
                key={i}
                idx={i}
                value={b}
                onChange={(v) => updateAt(i, v)}
                onRemove={() => removeAt(i)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="mt-2 inline-flex items-center gap-1 text-xs text-tpi-blue hover:text-tpi-orange"
      >
        <Plus className="w-3 h-3" /> Add benefit
      </button>
    </div>
  );
}

function BenefitRow({
  idx,
  value,
  onChange,
  onRemove,
}: {
  idx: number;
  value: string;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(idx) });
  const style = { transform: CSS.Transform.toString(transform), transition };
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
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm bg-transparent focus:outline-none"
        placeholder="A benefit..."
      />
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
