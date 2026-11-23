import { ChevronLeft, Undo2, Redo2, Download } from "lucide-react";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  isApplying?: boolean;
  onBack: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  onApply: () => void;
}

export function EditHeader({
  canUndo,
  canRedo,
  isApplying = false,
  onBack,
  onUndo,
  onRedo,
  onDownload,
  onApply,
}: Props) {
  return (
    <header className="edit-studio-header">
      {/* Left: Back to Edit / Home */}
      <button
        type="button"
        className="edit-studio-back-btn"
        onClick={onBack}
        title="Back to home"
      >
        <ChevronLeft size={16} strokeWidth={2.4} />
        <span>Edit</span>
      </button>

      {/* Center: Dual Stack Undo / Redo */}
      <div className="edit-studio-history-group">
        <button
          type="button"
          className="edit-studio-icon-btn"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className="edit-studio-icon-btn"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} strokeWidth={2.2} />
        </button>
      </div>

      {/* Right: Download + Add to Figma */}
      <div className="edit-studio-actions-group">
        <button
          type="button"
          className="edit-studio-icon-btn"
          onClick={onDownload}
          title="Download file"
        >
          <Download size={16} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className={`edit-studio-apply-btn ${isApplying ? "loading" : ""}`}
          disabled={isApplying}
          onClick={onApply}
        >
          <span>{isApplying ? "Adding…" : "Add to Figma"}</span>
        </button>
      </div>
    </header>
  );
}
