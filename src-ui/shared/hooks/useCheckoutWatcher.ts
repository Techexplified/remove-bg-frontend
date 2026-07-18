import { useCallback, useRef, useState } from "react";
import { useAppDispatch } from "../../app/hooks";
import { setPlanStatus } from "../../app/slices/statusSlice";
import { fetchPlanStatus } from "../api/client";
import type { PlanStatus } from "../types/api";

const POLL_MS = 1500;       // poll every 1.5s for snappy credit arrival
const FIRST_POLL_MS = 1000; // first check after 1s (payment webhook is usually fast)
const MAX_POLLS = 120;      // ~3 minutes total

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

  const start = useCallback(
    async (baseline: PlanStatus | null, opts: WatchOptions) => {
      genRef.current++;
      const myGen = genRef.current;
      setIsWatching(true);

      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? FIRST_POLL_MS : POLL_MS));
        if (genRef.current !== myGen) {
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
