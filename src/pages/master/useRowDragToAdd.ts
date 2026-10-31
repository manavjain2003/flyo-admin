import { useCallback, useRef, useState, type DragEvent } from "react";

const DRAG_MIME = "application/x-flyo-master-row";

type RowId = string | number;

interface Options<T> {
  enabled: boolean;
  onDropRow: (row: T) => void;
}

export function useRowDragToAdd<T>({ enabled, onDropRow }: Options<T>) {
  const dragged = useRef<T | null>(null);
  const [draggingId, setDraggingId] = useState<RowId | null>(null);
  const [overAdd, setOverAdd] = useState(false);

  const reset = useCallback(() => {
    dragged.current = null;
    setDraggingId(null);
    setOverAdd(false);
  }, []);

  const rowProps = useCallback(
    (row: T, id: RowId) => ({
      draggable: enabled,
      title: enabled ? "Drag onto the Add button to create a copy of this row" : undefined,
      onDragStart: (e: DragEvent<HTMLElement>) => {
        dragged.current = row;
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData(DRAG_MIME, String(id));
        // Defer the visual change: restyling the dragged element synchronously inside
        // dragstart can cancel the drag in Chrome.
        setTimeout(() => {
          if (dragged.current === row) setDraggingId(id);
        }, 0);
      },
      onDragEnd: reset,
    }),
    [enabled, reset]
  );

  const addTargetProps = {
    onDragEnter: (e: DragEvent<HTMLElement>) => {
      if (!dragged.current) return;
      e.preventDefault();
      setOverAdd(true);
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!dragged.current) return;
      e.preventDefault(); // required to make the button a valid drop target
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (e: DragEvent<HTMLElement>) => {
      // Ignore leave events fired when moving between the button's own children (icon / label).
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setOverAdd(false);
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      const row = dragged.current;
      if (!row) return;
      e.preventDefault();
      reset();
      onDropRow(row);
    },
  };

  const isDragging = draggingId !== null;

  return {
    isDragging,
    rowProps,
    addTargetProps,
    /** Classes for a row: grab cursor, dimmed while it is the one being dragged. */
    rowClass: (id: RowId) =>
      enabled ? `cursor-grab active:cursor-grabbing ${draggingId === id ? "opacity-40" : ""}` : "",
    addButtonClass: `transition-transform ${
      overAdd
        ? "scale-105 ring-2 ring-offset-2 ring-[var(--color-brand)] ring-offset-[var(--color-surface)]"
        : isDragging
        ? "ring-2 ring-[var(--color-brand)]/50 animate-pulse"
        : ""
    }`,
  };
}