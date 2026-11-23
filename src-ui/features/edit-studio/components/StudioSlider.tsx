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
  const [localValue, setLocalValue] = useState<number>(() =>
    typeof value === "number" ? value : min
  );

  // Sync from prop when not actively dragging
  useEffect(() => {
    if (!isDraggingRef.current && typeof value === "number") {
      setLocalValue(value);
    }
  }, [value]);

  const calculateValueFromPointer = useCallback(
    (clientX: number): number => {
      if (!containerRef.current) return localValue;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return localValue;

      const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const ratio = clampedX / rect.width;
      const raw = min + ratio * (max - min);
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step, localValue]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    isDraggingRef.current = true;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {
      // In case pointer capture fails in older webviews
    }

    const newVal = calculateValueFromPointer(e.clientX);
    setLocalValue(newVal);
    onChange(newVal);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const newVal = calculateValueFromPointer(e.clientX);
    setLocalValue(newVal);
    onChange(newVal);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    const finalVal = calculateValueFromPointer(e.clientX);
    setLocalValue(finalVal);
    onChange(finalVal);
    onCommit?.(finalVal);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    onCommit?.(localValue);
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
      className={`studio-slider-container ${className}`}
      role="slider"
      tabIndex={0}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={localValue}
      aria-label={ariaLabel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      <div className="studio-slider-rail">
        <div className="studio-slider-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="studio-slider-thumb" style={{ left: `${pct}%` }} />
    </div>
  );
}
