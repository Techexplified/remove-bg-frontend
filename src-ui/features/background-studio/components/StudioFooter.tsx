import { RotateCcw, Figma } from "lucide-react";

interface Props {
  isApplying: boolean;
  canApply: boolean;
  creditsRemaining?: number;
  creditsUsed?: number;
  onReset: () => void;
  onApply: () => void;
}

export function StudioFooter({
  isApplying,
  canApply,
  creditsRemaining = 8,
  creditsUsed = 2,
  onReset,
  onApply,
}: Props) {
  return (
    <footer className="studio-footer">
      <div className="studio-footer-left">
        <button className="studio-reset-btn" onClick={onReset} title="Reset to defaults">
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>

      <div className="studio-credits-status">
        <span className="status-dot-purple" />
        <span>
          {creditsUsed} credits used this month · {creditsRemaining} credits remaining
        </span>
      </div>

      <button
        className="studio-apply-btn"
        disabled={!canApply || isApplying}
        onClick={onApply}
      >
        <Figma size={14} />
        <span>{isApplying ? "Applying…" : "Apply to Figma"}</span>
      </button>
    </footer>
  );
}
