import { useState, useCallback, useEffect } from "react";
import type { EditSnapshot } from "../types";

const MAX_HISTORY = 25;

export function useUndoRedo(initialSnapshot: EditSnapshot) {
  const [undoStack, setUndoStack] = useState<EditSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<EditSnapshot[]>([]);
  const [current, setCurrent] = useState<EditSnapshot>(initialSnapshot);

  // Push a new state onto the undo stack and clear redo
  const pushSnapshot = useCallback((newSnapshot: EditSnapshot) => {
    setUndoStack((prev) => {
      const next = [...prev, current];
      if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY);
      }
      return next;
    });
    setRedoStack([]);
    setCurrent(newSnapshot);
  }, [current]);

  // Undo: pop previous state from undoStack, push current to redoStack
  const undo = useCallback((): EditSnapshot | null => {
    if (undoStack.length === 0) return null;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [current, ...prev]);
    setCurrent(previous);
    return previous;
  }, [undoStack, current]);

  // Redo: pop next state from redoStack, push current to undoStack
  const redo = useCallback((): EditSnapshot | null => {
    if (redoStack.length === 0) return null;
    const next = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setUndoStack((prev) => [...prev, current]);
    setCurrent(next);
    return next;
  }, [redoStack, current]);

  // Keyboard shortcut listener (Ctrl+Z / Cmd+Z, Ctrl+Y / Cmd+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (!isCmdOrCtrl) return;

      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return {
    current,
    setCurrent,
    pushSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
