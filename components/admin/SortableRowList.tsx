"use client";

import { useState } from "react";
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
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type SortableRow = {
  id: number;
  render: React.ReactNode;
};

export function SortableRowList({
  rows,
  onSaveOrder,
}: {
  rows: SortableRow[];
  onSaveOrder: (orderedIds: number[]) => Promise<void>;
}) {
  const [order, setOrder] = useState<number[]>(rows.map((r) => r.id));
  const [saving, setSaving] = useState(false);
  const dirty =
    order.length !== rows.length ||
    order.some((id, i) => id !== rows[i]?.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((curr) => {
      const oldIdx = curr.findIndex((id) => String(id) === active.id);
      const newIdx = curr.findIndex((id) => String(id) === over.id);
      return arrayMove(curr, oldIdx, newIdx);
    });
  };

  const rowMap = new Map(rows.map((r) => [r.id, r]));

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={order.map(String)}
          strategy={verticalListSortingStrategy}
        >
          <div className="bg-white rounded-xl border border-tpi-ink/10 overflow-hidden">
            {order.map((id) => {
              const row = rowMap.get(id);
              if (!row) return null;
              return <SortableItem key={id} id={String(id)} content={row.render} />;
            })}
          </div>
        </SortableContext>
      </DndContext>
      {dirty && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setOrder(rows.map((r) => r.id))}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setSaving(true);
              try {
                await onSaveOrder(order);
              } finally {
                setSaving(false);
              }
            }}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save order"}
          </Button>
        </div>
      )}
    </div>
  );
}

function SortableItem({ id, content }: { id: string; content: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-tpi-ink/5 last:border-0",
        isDragging && "opacity-60 bg-tpi-cream/40"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-tpi-stone hover:text-tpi-ink shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">{content}</div>
    </div>
  );
}
