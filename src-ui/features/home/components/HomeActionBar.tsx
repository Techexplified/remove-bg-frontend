import { Scissors, SlidersHorizontal } from "lucide-react";

interface Props {
  count: number;
  isOutOfCredits?: boolean;
  onRemoveBgClick?: () => void;
  onEditClick?: () => void;
}

export function HomeActionBar({ count, isOutOfCredits = false, onRemoveBgClick, onEditClick }: Props) {
  const isMultiple = count > 1;
  const isEditDisabled = isMultiple; // Edit is disabled when multiple images are chosen

  // When out of credits, button is clickable so user can open upgrade modal
  const isRemoveEnabled = isOutOfCredits || count > 0;

  // Dynamic label based on credits & selection count
  const primaryLabel = isOutOfCredits
    ? "Out of credits"
    : count === 0
    ? "Remove background"
    : isMultiple
    ? `Remove backgrounds · ${count} credits`
    : "Remove background · 1 credit";

  return (
    <div className="home-v2-action-bar">
      {/* Primary Remove Background Button */}
      <button
        type="button"
        className={`home-v2-primary-btn ${!isRemoveEnabled ? "disabled" : ""} ${isOutOfCredits ? "is-out-of-credits" : ""}`}
        disabled={!isRemoveEnabled}
        onClick={onRemoveBgClick}
      >
        <Scissors size={15} />
        <span>{primaryLabel}</span>
      </button>

      {/* Secondary Edit Button (Always visible! Enabled for 0 or 1 image, disabled for 2+) */}
      <button
        type="button"
        className={`home-v2-secondary-btn ${isEditDisabled ? "disabled" : ""}`}
        disabled={isEditDisabled}
        onClick={onEditClick}
        title={isEditDisabled ? "Edit is available for 1 image at a time" : "Open Edit Studio"}
      >
        <SlidersHorizontal size={14} />
        <span>Edit</span>
      </button>

      {/* Dynamic Micro-caption */}
      <p className="home-v2-action-caption">
        {isOutOfCredits
          ? "You've used all your free credits. Upgrade to continue."
          : count === 0
          ? "Pick one or more images to start"
          : isMultiple
          ? "Edit is available for 1 image at a time"
          : "You'll see a preview first. 1 credit used on removal."}
      </p>
    </div>
  );
}
