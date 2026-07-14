import { useEffect, useRef, useState } from "react";

export function useAnimatedNumber(target: number, ms = 600): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (fromRef.current === target) return;
    const from = fromRef.current;
    const start = performance.now();

    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (p < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { fromRef.current = target; }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, ms]);

  return display;
}
