import { RotateCcw, Figma, Lock } from "lucide-react";

interface Props {
  isApplying: boolean;
  canApply: boolean;
  isLocked?: boolean;
  creditsRemaining?: number;
  creditsUsed?: number;
  onReset: () => void;
  onApply: () => void;
}

export function StudioFooter({
  isApplying,
  canApply,
  isLocked = false,
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
          {isLocked
            ? "Free preview · Upgrade plan to apply"
            : `${creditsUsed} credits used this month · ${creditsRemaining} credits remaining`}
        </span>
      </div>

      <div style={{ position: "relative", display: "inline-flex" }}>
        <button
          className="studio-apply-btn"
          disabled={isLocked || !canApply || isApplying}
          onClick={isLocked ? undefined : onApply}
          tabIndex={isLocked ? -1 : 0}
        >
          <Figma size={14} />
          <span>{isApplying ? "Applying…" : "Apply to Figma"}</span>
        </button>

        {isLocked && (
          <div
            className="studio-actions-lock-overlay"
            title="Upgrade plan to apply to Figma canvas"
          >
            <div className="studio-actions-lock-pill">
              <Lock size={12} />
              <span>Upgrade Plan</span>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
