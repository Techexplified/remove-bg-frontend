import { RotateCcw, Layers, Loader2, Download } from "lucide-react";

interface Props {
  selectedCount: number;
  creditCost: number;
  isProcessing: boolean;
  progressText?: string;
  hasCompletedResults: boolean;
  onReset: () => void;
  onProcess: () => void;
  onDownloadZip: () => void;
  onPlaceOnCanvas: () => void;
}

export function BatchFooter({
  selectedCount,
  creditCost,
  isProcessing,
  progressText,
  hasCompletedResults,
  onReset,
  onProcess,
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
