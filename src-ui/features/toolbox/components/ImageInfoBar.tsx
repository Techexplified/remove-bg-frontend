import { Image as ImageIcon, FileText, Info } from "lucide-react";

interface Props {
  width: number;
  height: number;
  format?: string;
  creditsRemaining: number;
  creditsUsed: number;
}

export function ImageInfoBar({
  width,
  height,
  format = "PNG",
  creditsRemaining,
  creditsUsed,
}: Props) {
  const displayW = width > 0 ? width : 1024;
  const displayH = height > 0 ? height : 1024;

  return (
    <div className="image-info-bar-container">
      {/* ── Left Column: Image Info ── */}
      <div className="image-info-col">
        <span className="info-bar-section-title">Image Info</span>
        <div className="image-info-chips">
          <div className="info-chip">
            <ImageIcon size={12} className="info-chip-icon" />
            <span>{displayW} × {displayH}</span>
          </div>
          <div className="info-chip">
            <FileText size={12} className="info-chip-icon" />
            <span>{format}</span>
          </div>
        </div>
      </div>

      {/* ── Vertical Divider Line (Matches Wireframe) ── */}
      <div className="image-info-divider" />

      {/* ── Right Column: Credits Used ── */}
      <div className="credits-info-col">
        <div className="credits-title-row">
          <Info size={12} className="credits-info-icon" />
          <span className="info-bar-section-title">Credits Used</span>
        </div>
        <div className="credits-text-line">
          <span>{creditsUsed} used this month</span>
        </div>
        <div className="credits-text-line credits-remaining-highlight">
          <strong>{creditsRemaining}</strong> credits left
        </div>
      </div>
    </div>
  );
}
