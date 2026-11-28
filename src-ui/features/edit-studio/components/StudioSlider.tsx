import React, { useRef, useState, useEffect, useCallback } from "react";

interface StudioSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  className?: string;
  ariaLabel?: string;
}

export function StudioSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onCommit,
  className = "",
  ariaLabel,
}: StudioSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState<number>(() =>
    typeof value === "number" ? value : min
  );

  const valueRef = useRef(value);
  valueRef.current = value;

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  // Sync from prop when not actively dragging
  useEffect(() => {
    if (!isDraggingRef.current && typeof value === "number") {
      setLocalValue(value);
    }
  }, [value]);

  const calculateValueFromPointer = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return valueRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return valueRef.current;

      const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = clampedX / rect.width;
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);

    const initialVal = calculateValueFromPointer(e.clientX);
    setLocalValue(initialVal);
    onChangeRef.current(initialVal);

    let rafId: number | null = null;
    let latestClientX = e.clientX;

    const onPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      ev.preventDefault();
      latestClientX = ev.clientX;

      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (!isDraggingRef.current) return;
          const updatedVal = calculateValueFromPointer(latestClientX);
          setLocalValue(updatedVal);
          onChangeRef.current(updatedVal);
        });
      }
    };

    const handleEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("blur", handleEnd);
    };

    const onPointerUp = (ev: PointerEvent) => {
      const finalVal = calculateValueFromPointer(ev.clientX);
      handleEnd();
      setLocalValue(finalVal);
      onChangeRef.current(finalVal);
      onCommitRef.current?.(finalVal);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("blur", handleEnd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      next = Math.min(max, localValue + step);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      next = Math.max(min, localValue - step);
    } else if (e.key === "Home") {
      next = min;
    } else if (e.key === "End") {
      next = max;
    }

    if (next !== null) {
      e.preventDefault();
      setLocalValue(next);
      onChange(next);
      onCommit?.(next);
    }
  };

  const pct = Math.max(0, Math.min(100, ((localValue - min) / (max - min)) * 100));

  return (
    <div
      ref={containerRef}
      className={`studio-slider-container ${isDragging ? "is-dragging" : ""} ${className}`}
      role="slider"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={localValue}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      <div className="studio-slider-rail">
        <div className="studio-slider-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="studio-slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  );
}
