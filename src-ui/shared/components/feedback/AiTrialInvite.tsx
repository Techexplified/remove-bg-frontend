import { useState, useEffect } from "react";
import { Sparkles, Loader2, X, ArrowRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { runAiTrial, ApiError } from "../../api/client";
import { loadPlanStatus } from "../../../app/slices/statusSlice";
import { openModal, addToast } from "../../../app/slices/uiSlice";
import { usePluginBridgeContext } from "../../context/PluginBridgeContext";

interface Props {
  originalImageBytes: Uint8Array | null;
}

export function AiTrialInvite({ originalImageBytes }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);
  const bridge = usePluginBridgeContext();

  const [hasAlreadyBeenOffered, setHasAlreadyBeenOffered] = useState<boolean>(() => {
    try {
      return localStorage.getItem("removebg_ai_trial_offered") === "true" || localStorage.getItem("zerobg_ai_trial_offered") === "true";
    } catch {
      return false;
    }
  });

  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);
  const [errorDismiss, setErrorDismiss] = useState(false);

  // BUG-08 fix: revoke the AI trial blob URL when it changes or the component unmounts,
  // preventing a memory leak that accumulated on every trial use.
  useEffect(() => {
    return () => {
      if (aiResultUrl) URL.revokeObjectURL(aiResultUrl);
    };
  }, [aiResultUrl]);

  useEffect(() => {
    if (status && !status.aiTrialUsed && !hasAlreadyBeenOffered) {
      try {
        localStorage.setItem("removebg_ai_trial_offered", "true");
      } catch {
        /* ignore */
      }
    }
  }, [status, hasAlreadyBeenOffered]);

  // Check condition
  if (!status || status.aiTrialUsed || hasAlreadyBeenOffered || dismissed || errorDismiss) return null;

  async function handleAccept() {
    if (!originalImageBytes) {
      dispatch(addToast({
        id: `toast_ai_trial_${Date.now()}`,
        kind: "error",
        title: "Image missing",
        message: "Could not find original image bytes for AI background generation."
      }));
      return;
    }

    setLoading(true);
    try {
      const resultBytes = await runAiTrial(originalImageBytes);
      const blob = new Blob([resultBytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      setAiResultUrl(url);

      // Also insert result image into Figma canvas!
      bridge.insertResultImage(resultBytes);

      // Refresh status so ai_trial_used becomes true on backend and frontend state
      dispatch(loadPlanStatus());
    } catch (err) {
      if (err instanceof ApiError && err.code === "trial_already_used") {
        setErrorDismiss(true);
      } else {
        dispatch(addToast({
          id: `toast_ai_trial_err_${Date.now()}`,
          kind: "error",
          title: "AI Generation Failed",
          message: err instanceof ApiError ? err.message : "Something went wrong generating the AI preview."
        }));
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="ai-trial-loading">
        <div className="ai-trial-loading-text">
          <Loader2 size={14} className="spin" /> Generating AI background…
        </div>
      </div>
    );
  }

  if (aiResultUrl) {
    return (
      <div className="ai-trial-result">
        <img src={aiResultUrl} alt="AI Background Trial Result" />
        <div className="ai-trial-upgrade">
          <span className="ai-trial-upgrade-text">
            Loved that? Upgrade to Starter to use AI on every image.
          </span>
          <button
            className="ai-trial-upgrade-btn"
            onClick={() => dispatch(openModal({ kind: "plan_picker" }))}
          >
            Upgrade to Starter <ArrowRight size={10} style={{ display: "inline", marginLeft: 2 }} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-trial-invite">
      <div className="ai-trial-invite-text" onClick={handleAccept}>
        <Sparkles size={13} color="var(--brand)" /> See what AI can do with this →
      </div>
      <button className="ai-trial-dismiss" onClick={() => setDismissed(true)} title="Dismiss">
        <X size={12} />
      </button>
    </div>
  );
}
