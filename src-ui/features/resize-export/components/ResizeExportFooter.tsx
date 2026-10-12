import { RotateCcw, Download, Layers } from "lucide-react";

interface Props {
  isProcessing: boolean;
  isApplyDisabled?: boolean;
  applyDisabledReason?: string;
  onReset: () => void;
  onDownload: () => void;
  onApplyToFigma: () => void;
}

export function ResizeExportFooter({
  isProcessing,
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

      <div className="re-footer-actions">
        <button
          type="button"
          className="re-footer-download-btn"
          onClick={onDownload}
          disabled={isProcessing}
        >
          <Download size={14} />
          <span>Download</span>
        </button>

        <button
          type="button"
          className="re-footer-apply-btn"
          onClick={onApplyToFigma}
          disabled={isProcessing || isApplyDisabled}
          title={
            isApplyDisabled
              ? applyDisabledReason || "WebP is download-only (Figma does not support WebP)"
              : "Apply to Figma canvas"
          }
        >
          <Layers size={14} />
          <span>Apply to Figma</span>
        </button>
      </div>
    </div>
  );
}
