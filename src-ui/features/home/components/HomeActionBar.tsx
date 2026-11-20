import { Scissors, SlidersHorizontal } from "lucide-react";

interface Props {
  count: number;
  onRemoveBgClick?: () => void;
  onEditClick?: () => void;
}

export function HomeActionBar({ count, onRemoveBgClick, onEditClick }: Props) {
  const isRemoveEnabled = count > 0;
  const isMultiple = count > 1;
  const isEditDisabled = isMultiple; // Edit is disabled when multiple images are chosen

  // Dynamic label based on selection count
  const primaryLabel = !isRemoveEnabled
    ? "Remove background"
    : isMultiple
    ? `Remove backgrounds · ${count} credits`
    : "Remove background · 1 credit";

  return (
    <div className="home-v2-action-bar">
      {/* Primary Remove Background Button */}
      <button
        type="button"
        className={`home-v2-primary-btn ${!isRemoveEnabled ? "disabled" : ""}`}
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
        {count === 0
          ? "Pick one or more images to start"
          : isMultiple
          ? "Edit is available for 1 image at a time"
          : "You'll see a preview first. 1 credit used on removal."}
      </p>
    </div>
  );
}
