import { RotateCcw, Layers, Loader2, Download, Sparkles } from "lucide-react";

interface Props {
  selectedCount: number;
  creditCost: number;
  isProcessing: boolean;
  progressText?: string;
  hasCompletedResults: boolean;
  creditStatus?: "ok" | "zero_credits" | "insufficient_credits";
  onReset: () => void;
  onProcess: () => void;
  onUpgrade?: () => void;
  onDownloadZip: () => void;
  onPlaceOnCanvas: () => void;
}

export function BatchFooter({
  selectedCount,
  creditCost,
  isProcessing,
  progressText,
  hasCompletedResults,
  creditStatus = "ok",
  onReset,
  onProcess,
  onUpgrade,
  onDownloadZip,
  onPlaceOnCanvas,
}: Props) {
  return (
    <div className="batch-footer">
      <button className="batch-reset-btn" onClick={onReset} disabled={isProcessing} title="Clear all images">
        <RotateCcw size={14} />
        <span>Reset</span>
      </button>

      {hasCompletedResults ? (
        <div style={{ display: "flex", gap: "8px", flex: 1 }}>
          <button
            className="batch-process-btn"
            style={{ background: "var(--c-bg-2)", color: "var(--c-text)", border: "1px solid var(--c-border)" }}
            onClick={onPlaceOnCanvas}
          >
            <Layers size={14} />
            <span>Place in Figma</span>
          </button>
          <button className="batch-process-btn" onClick={onDownloadZip}>
            <Download size={14} />
            <span>Download All (.zip)</span>
          </button>
        </div>
      ) : creditStatus === "zero_credits" ? (
        <button
          className="batch-process-btn"
          style={{ background: "linear-gradient(135deg, #6c47ff, #8b5cf6)", color: "#ffffff", boxShadow: "0 2px 10px rgba(108, 71, 255, 0.3)" }}
          onClick={onUpgrade || onProcess}
        >
          <Sparkles size={15} />
          <span>Out of credits — Upgrade Plan</span>
        </button>
      ) : creditStatus === "insufficient_credits" ? (
        <button
          className="batch-process-btn"
          style={{ background: "linear-gradient(135deg, #6c47ff, #8b5cf6)", color: "#ffffff", boxShadow: "0 2px 10px rgba(108, 71, 255, 0.3)" }}
          onClick={onUpgrade || onProcess}
        >
          <Sparkles size={15} />
          <span>Insufficient credits</span>
        </button>
      ) : (
        <button
          className="batch-process-btn"
          disabled={selectedCount === 0 || isProcessing}
          onClick={onProcess}
        >
          {isProcessing ? (
            <>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
              <span>{progressText ?? "Processing batch…"}</span>
            </>
          ) : (
            <>
              <Layers size={15} />
              <span>
                Process {selectedCount} Image{selectedCount === 1 ? "" : "s"} ({creditCost} credit{creditCost === 1 ? "" : "s"})
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
