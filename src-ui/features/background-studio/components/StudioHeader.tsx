import { ArrowLeft, Sparkles, MoreHorizontal } from "lucide-react";

interface Props {
  onBack: () => void;
}

export function StudioHeader({ onBack }: Props) {
  return (
    <header className="studio-topbar">
      <div className="studio-topbar-left">
        <button className="studio-back-btn" onClick={onBack} title="Back to Features">
          <ArrowLeft size={16} />
        </button>

        <div className="studio-logo-badge">
          <Sparkles size={16} />
        </div>

        <div className="studio-header-titles">
          <span className="studio-title">Background Studio</span>
          <span className="studio-subtitle">Replace background with colors, gradients or images</span>
        </div>
      </div>

      <div>
        <button className="studio-more-btn" title="Options">
          <MoreHorizontal size={18} />
        </button>
      </div>
    </header>
  );
}
