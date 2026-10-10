import { Image as ImageIcon, FileText, Info } from "lucide-react";

interface Props {
  width: number;
  height: number;
  creditsRemaining: number;
  creditsUsed: number;
}

export function ImageInfoBar({
  width,
  height,
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
            <span>PNG</span>
          </div>
          <div className="info-chip">
            <svg
              width="14"
              height="11"
              viewBox="0 0 16 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="info-chip-icon"
              style={{ flexShrink: 0 }}
            >
              <rect x="0.75" y="0.75" width="14.5" height="10.5" rx="2.5" stroke="currentColor" strokeWidth="1.25" />
              <text x="3.2" y="8.8" fill="currentColor" fontSize="7" fontWeight="800" fontFamily="sans-serif">HD</text>
            </svg>
            <span>High Quality</span>
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
