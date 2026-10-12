import { ArrowLeft, HelpCircle, Zap } from "lucide-react";

interface Props {
  onBack: () => void;
  onHowItWorks?: () => void;
  creditsRemaining?: number;
}

export function BatchHeader({ onBack, onHowItWorks, creditsRemaining }: Props) {
  return (
    <div className="batch-header">
      <div className="batch-header-left">
        <button className="batch-back-btn" onClick={onBack} title="Back to Features">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="batch-title">Batch Process</h2>
          <p className="batch-subtitle">Process multiple images at once</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {typeof creditsRemaining === "number" && (
          <div className="batch-credits-badge">
            <Zap size={11} color="var(--brand)" />
            <span><strong>{creditsRemaining}</strong> credits</span>
          </div>
        )}
        {onHowItWorks && (
          <button className="batch-how-btn" onClick={onHowItWorks}>
            <HelpCircle size={12} />
            <span>How it works</span>
          </button>
        )}
      </div>
    </div>
  );
}
