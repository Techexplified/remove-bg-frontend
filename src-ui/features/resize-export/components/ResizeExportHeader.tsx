import { ArrowLeft, Scissors, HelpCircle } from "lucide-react";

interface Props {
  onBack: () => void;
  onHelp?: () => void;
}

export function ResizeExportHeader({ onBack, onHelp }: Props) {
  return (
    <div className="re-header">
      <div className="re-header-left">
        <button
          type="button"
          className="re-back-btn"
          onClick={onBack}
          title="Back to Features"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="re-header-icon-wrap">
          <Scissors size={15} />
        </div>
        <div>
          <h2 className="re-header-title">Resize & Export</h2>
          <p className="re-header-subtitle">
            Choose size, format and export your image
          </p>
        </div>
      </div>

      {onHelp && (
        <button
          type="button"
          className="re-help-btn"
          onClick={onHelp}
          title="How it works"
        >
          <HelpCircle size={14} />
        </button>
      )}
    </div>
  );
}
