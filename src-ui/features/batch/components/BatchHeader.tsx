import { ArrowLeft, HelpCircle } from "lucide-react";

interface Props {
  onBack: () => void;
  onHowItWorks?: () => void;
}

export function BatchHeader({ onBack, onHowItWorks }: Props) {
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
      {onHowItWorks && (
        <button className="batch-how-btn" onClick={onHowItWorks}>
          <HelpCircle size={12} />
          <span>How it works</span>
        </button>
      )}
    </div>
  );
}
