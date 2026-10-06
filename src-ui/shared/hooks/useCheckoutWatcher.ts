import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import { setPlanStatus } from "../../app/slices/statusSlice";
import { fetchPlanStatus } from "../api/client";
import type { PlanStatus } from "../types/api";

const MAX_POLLS = 35; // ~2.3 minutes total with backoff

function getPollDelay(index: number): number {
  if (index === 0) return 1000;
  if (index <= 5) return 1500;
  if (index <= 15) return 3000;
  return 5000;
}

/**
 * Sleeps for `ms` milliseconds, pausing while document.hidden is true.
 * Resolves with true if timer finished and loop is still active, false if cancelled early.
 */
function sleepWithVisibility(ms: number, isCurrent: () => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let start = Date.now();
    let remaining = ms;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };

    const done = () => {
      cleanup();
      resolve(isCurrent());
    };

    const schedule = (delay: number) => {
      if (!isCurrent()) {
        cleanup();
        resolve(false);
        return;
      }
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      start = Date.now();
      timer = setTimeout(done, Math.max(0, delay));
    };

    const onVis = () => {
      if (!isCurrent()) {
        cleanup();
        resolve(false);
        return;
      }
      if (document.hidden) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        remaining -= Date.now() - start;
      } else {
        schedule(remaining);
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    schedule(ms);
  });
}

export type WatchOutcome = "confirmed" | "timed_out" | "stopped";

interface WatchOptions {
  isSatisfied: (before: PlanStatus | null, after: PlanStatus) => boolean;
  onSettled: (outcome: WatchOutcome) => void;
}

export function useCheckoutWatcher() {
  const dispatch = useAppDispatch();
  const [isWatching, setIsWatching] = useState(false);
  // Each call to start() gets its own generation number, so an overlapping
  // start() call can't have two loops both writing state.
  const genRef = useRef(0);

  const stop = useCallback(() => {
    genRef.current++;
    setIsWatching(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      genRef.current++;
    };
  }, []);

  const start = useCallback(
    async (baseline: PlanStatus | null, opts: WatchOptions) => {
      genRef.current++;
      const myGen = genRef.current;
      setIsWatching(true);

      for (let i = 0; i < MAX_POLLS; i++) {
        const delay = getPollDelay(i);
        const shouldContinue = await sleepWithVisibility(delay, () => genRef.current === myGen);
        if (!shouldContinue || genRef.current !== myGen) {
          opts.onSettled("stopped");
          return;
        }

        try {
          const fresh = await fetchPlanStatus();
          if (genRef.current !== myGen) {
            opts.onSettled("stopped");
            return;
          }
          dispatch(setPlanStatus(fresh));
          if (opts.isSatisfied(baseline, fresh)) {
            setIsWatching(false);
            opts.onSettled("confirmed");
            return;
          }
        } catch {
          // transient failure mid-poll — keep polling
        }
      }

      if (genRef.current === myGen) {
        setIsWatching(false);
        opts.onSettled("timed_out");
      }
    },
    [dispatch]
  );

  return { isWatching, start, stop };
}
