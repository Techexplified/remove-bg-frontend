import { RotateCcw, Download, Layers, Lock } from "lucide-react";

interface Props {
  isProcessing: boolean;
  isLocked?: boolean;
  isApplyDisabled?: boolean;
  applyDisabledReason?: string;
  onReset: () => void;
  onDownload: () => void;
  onApplyToFigma: () => void;
}

export function ResizeExportFooter({
  isProcessing,
  isLocked = false,
  isApplyDisabled = false,
  applyDisabledReason,
  onReset,
  onDownload,
  onApplyToFigma,
}: Props) {
  return (
    <div className="re-footer">
      <button
        type="button"
        className="re-footer-reset-btn"
        onClick={onReset}
        disabled={isProcessing}
        title="Reset all settings to default"
      >
        <RotateCcw size={13} />
        <span>Reset</span>
      </button>

      {isLocked && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--c-text-3, #94a3b8)",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginLeft: "8px",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--brand, #6c47ff)",
              display: "inline-block",
            }}
          />
          <span>Free preview · Upgrade plan to export</span>
        </div>
      )}

      <div className="re-footer-actions" style={{ position: "relative" }}>
        <button
          type="button"
          className="re-footer-download-btn"
          onClick={isLocked ? undefined : onDownload}
          disabled={isLocked || isProcessing}
          tabIndex={isLocked ? -1 : 0}
        >
          <Download size={14} />
          <span>Download</span>
        </button>

        <button
          type="button"
          className="re-footer-apply-btn"
          onClick={isLocked ? undefined : onApplyToFigma}
          disabled={isLocked || isProcessing || isApplyDisabled}
          tabIndex={isLocked ? -1 : 0}
          title={
            isApplyDisabled
              ? applyDisabledReason || "WebP is download-only (Figma does not support WebP)"
              : "Apply to Figma canvas"
          }
        >
          <Layers size={14} />
          <span>Apply to Figma</span>
        </button>

        {isLocked && (
          <div
            className="re-actions-lock-overlay"
            title="Upgrade plan to download or apply to Figma"
          >
            <div className="re-actions-lock-pill">
              <Lock size={12} />
              <span>Upgrade Plan</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
