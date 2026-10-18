import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, type ReactNode } from 'react';

// Browsers may deliver a click on the dragged card after the drop (mouse release on the same card,
// a long-press "tap" on touch screens - sometimes noticeably later). Swallow clicks from drag start
// until a short while after the drop has been rendered.
const SWALLOW_AFTER_DROP_MS = 400;
let swallowClicksUntil = 0;

document.addEventListener(
  'click',
  (e) => {
    if (Date.now() < swallowClicksUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  },
  true, // capture: runs before React handlers and link navigation
);

const armClickGuard = () => {
  swallowClicksUntil = Date.now() + 60_000; // upper bound in case the drag never reports its end
};
const cancelClickGuard = () => {
  if (swallowClicksUntil - Date.now() > SWALLOW_AFTER_DROP_MS) swallowClicksUntil = 0;
};
const releaseClickGuard = () => {
  // setTimeout(0) runs after the re-render caused by the drop, so the window starts once the UI is updated
  setTimeout(() => (swallowClicksUntil = Date.now() + SWALLOW_AFTER_DROP_MS), 0);
};

interface Props<T> {
  items: T[];
  getId: (x: T) => string;
  render: (x: T) => ReactNode;
  onReorder: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function SortableGrid<T>({ items, getId, render, onReorder, disabled = false, className = 'grid' }: Props<T>) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // long-press on touch screens so normal scrolling keeps working
    useSensor(TouchSensor, { activationConstraint: { delay: 280, tolerance: 8 } }),
  );
  const ids = items.map(getId);
  useEffect(() => cancelClickGuard, []); // unmounted mid-drag: don't leave clicks blocked

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    releaseClickGuard();
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) onReorder(arrayMove(ids, from, to));
  };

  if (disabled) {
    return (
      <div className={className}>
        {items.map((x) => (
          <div key={getId(x)} className="grid-cell">
            {render(x)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={armClickGuard}
      onDragEnd={onDragEnd}
      onDragCancel={releaseClickGuard}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className={className}>
          {items.map((x) => (
            <SortableCell key={getId(x)} id={getId(x)}>
              {render(x)}
            </SortableCell>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableCell({ id, children }: { id: string; children: ReactNode }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`grid-cell sortable ${isDragging ? 'dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...listeners}
      role="listitem"
    >
      {children}
    </div>
  );
}
