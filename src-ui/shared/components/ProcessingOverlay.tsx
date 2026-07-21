import { Loader2, Check, X, Upload, Wand2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setProcessing, setSection } from "../../app/slices/uiSlice";
import { QuickRating } from "./feedback/QuickRating";
import { AiTrialInvite } from "./feedback/AiTrialInvite";
import type { FeatureId } from "../types/api";

export function ProcessingOverlay({ onRetry, originalBytes }: { onRetry: () => void; originalBytes?: Uint8Array | null }) {
  const dispatch = useAppDispatch();
  const processing = useAppSelector(s => s.ui.processing);
  const lastRunFeatureId = useAppSelector(s => s.ui.lastRunFeatureId);
  const { stage, progress, featureLabel, errorMessage, refunded, originalSize, targetSize, originalSub, targetSub, extraBullets } = processing;

  if (stage === "idle") return null;

  const isLoading = stage === "exporting" || stage === "uploading" || stage === "processing";
  const isSuccess = stage === "success";
  const isError = stage === "error";

  // Dynamic titles and descriptions matching screenshots exactly
  let title = "Processing...";
  let desc = "Hang tight — your request is being handled.";
  let icon = <Wand2 size={22} />;

  if (stage === "exporting") {
    title = "Exporting layer…";
    desc = "Preparing your layer for upload";
    icon = <Upload size={22} />;
  } else if (stage === "uploading") {
    title = "Uploading image...";
    desc = "Please wait while your image is sent for processing";
    icon = <Upload size={22} />;
  } else if (stage === "processing") {
    if (featureLabel === "Remove Background") {
      title = "Removing background...";
      desc = "AI is analyzing your image. This usually takes 5–15 seconds.";
    } else {
      title = "Processing...";
      desc = "Hang tight — your request is being handled.";
    }
    icon = <Wand2 size={22} />;
  } else if (isSuccess) {
    if (featureLabel === "Crop and Resize") {
      title = "Image resized!";
      desc = "Your resized image is ready. It has been placed on the canvas.";
    } else if (featureLabel === "HD Export") {
      title = "Image exported in HD!";
      desc = "Your high-resolution export is ready and placed on the canvas.";
    } else {
      title = "Background removed!";
      desc = "Your result is ready. It has been placed on the canvas.";
    }
    icon = <Check size={22} />;
  } else if (isError) {
    title = "Processing failed";
    desc = errorMessage ?? "Something went wrong. Your credits have not been deducted.";
    icon = <X size={22} />;
  }

  const currentFeatureId: FeatureId = lastRunFeatureId ?? "remove_bg_basic";

  return (
    <AnimatePresence>
      <motion.div className="processing-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className={`processing-card${isSuccess ? " card-success" : ""}`} initial={{ scale: .92, y: 8 }} animate={{ scale: 1, y: 0 }}>
          <div className={`proc-icon ${isLoading ? "proc-icon-loading" : isSuccess ? "proc-icon-success" : "proc-icon-error"}`}>
            {isLoading ? <Loader2 size={22} className="spin" /> : icon}
          </div>
          <div className="proc-title">{title}</div>
          <div className="proc-desc">{desc}</div>

          {isSuccess && originalSize && targetSize && (
            <>
              <div className="crop-preview-box">
                <div className="crop-box-card">
                  <div className="crop-box-title">
                    {featureLabel === "HD Export" ? "Input" : "Original"}
                  </div>
                  <div className="crop-box-dims">{originalSize}</div>
                  {originalSub && <div className="crop-box-sub">{originalSub}</div>}
                </div>
                
                <div className="crop-arrow">→</div>
                
                <div className="crop-box-card resized">
                  <div className="crop-box-title">
                    {featureLabel === "HD Export" ? "HD Export" : "Resized"}
                  </div>
                  <div className="crop-box-dims">{targetSize}</div>
                  {targetSub && <div className="crop-box-sub">{targetSub}</div>}
                </div>
              </div>

              {extraBullets && extraBullets.length > 0 && (
                <div className="crop-bullets">
                  {extraBullets.map((bullet, idx) => (
                    <div key={idx} className="crop-bullet-item">
                      <Check size={10} /> {bullet}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          
          {stage === "processing" && (
            <div className="proc-ai-tag"><Wand2 size={11} />AI Processing</div>
          )}

          {isLoading && (
            <>
              <div className="proc-bar proc-bar-indeterminate">
                <div className="proc-bar-fill" style={{ width: stage === "uploading" ? `${progress ?? 65}%` : undefined }} />
              </div>
              {stage === "uploading" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-3)", marginTop: "4px" }}>
                  <span>Uploading...</span>
                  <span>{progress ?? 65}%</span>
                </div>
              )}
            </>
          )}

          {isError && refunded && (
            <div className="proc-refund-note">Credits have not been deducted.</div>
          )}

          <div className="proc-actions">
            {isSuccess && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                  <button className="proc-btn proc-btn-success" style={{ flex: 1 }} onClick={() => dispatch(setProcessing({ stage: "idle" }))}>
                    <Check size={13} />Done
                  </button>
                  <button className="proc-btn proc-btn-success-outline" style={{ flex: 1 }} onClick={() => { dispatch(setSection("toolbox")); dispatch(setProcessing({ stage: "idle" })); }}>
                    <Wand2 size={13} />Edit Result
                  </button>
                </div>

                {/* Free AI Trial invite (only after remove_bg_basic) */}
                {currentFeatureId === "remove_bg_basic" && (
                  <AiTrialInvite originalImageBytes={originalBytes ?? null} />
                )}

                {/* Quick Rating widget */}
                <QuickRating featureId={currentFeatureId} onRetry={onRetry} />
              </div>
            )}
            {isError && (
              <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                <button className="proc-btn proc-btn-danger" style={{ flex: 1 }} onClick={onRetry}>
                  <RefreshCw size={13} />Try Again
                </button>
                <button className="proc-btn proc-btn-secondary" style={{ flex: 1 }} onClick={() => dispatch(setProcessing({ stage: "idle" }))}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
