import { Lock } from "lucide-react";

interface Props {
  onUpgradeClick: () => void;
}

export function FreemiumBanner({ onUpgradeClick }: Props) {
  return (
    <div className="edit-studio-freemium-banner">
      <div className="edit-studio-freemium-text">
        <Lock size={12} strokeWidth={2.2} />
        <span>Preview it here. Starter unlocks Apply.</span>
      </div>
      <button
        type="button"
        className="edit-studio-freemium-btn"
        onClick={onUpgradeClick}
      >
        Upgrade
      </button>
    </div>
  );
}
