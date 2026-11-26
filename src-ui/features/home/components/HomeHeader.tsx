import { Zap, Clock, User } from "lucide-react";
import logoIcon from "../../../assets/icon-small-transparent.png";

interface Props {
  creditsRemaining: number;
  onHistoryClick?: () => void;
  onProfileClick?: () => void;
}

export function HomeHeader({ creditsRemaining, onHistoryClick, onProfileClick }: Props) {
  return (
    <header className="home-v2-header">
      {/* Brand Logo */}
      <div className="home-v2-brand">
        <img src={logoIcon} alt="RemoveBG" className="home-v2-brand-icon" />
        <span className="home-v2-brand-name">RemoveBG</span>
      </div>

      {/* Right controls */}
      <div className="home-v2-header-actions">
        {/* Credits Pill */}
        <div className="home-v2-credits-pill" title={`${creditsRemaining} credits available`}>
          <Zap size={13} className="home-v2-credits-icon" />
          <span className="home-v2-credits-count">{creditsRemaining}</span>
        </div>

        {/* History Icon Button */}
        <button
          type="button"
          className="home-v2-icon-btn"
          title="History"
          onClick={onHistoryClick}
        >
          <Clock size={16} />
        </button>

        {/* Account / Profile Icon Button */}
        <button
          type="button"
          className="home-v2-icon-btn"
          title="Account & Settings"
          onClick={onProfileClick}
        >
          <User size={16} />
        </button>
      </div>
    </header>
  );
}
