interface Props {
  isOpen: boolean;
  previewThumbUrl?: string | null;
  statusText?: string;
  subtitleText?: string;
}

export function ProcessingModal({
  isOpen,
  statusText = "Removing background…",
  subtitleText = "AI is analyzing your image. This usually takes 5 to 15 seconds.",
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="v2-proc-overlay" role="dialog" aria-modal="true">
      <div className="v2-proc-card">
        {/* Modal Info */}
        <h2 className="v2-proc-title">{statusText}</h2>
        <p className="v2-proc-sub">{subtitleText}</p>

        {/* Smooth Indeterminate Progress Bar */}
        <div className="v2-proc-progress-track">
          <div className="v2-proc-progress-bar" />
        </div>
      </div>
    </div>
  );
}
