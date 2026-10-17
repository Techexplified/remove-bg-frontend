import { Maximize2, HardDrive, FileText, Zap, Clock } from "lucide-react";

interface Props {
  width: number;
  height: number;
  fileSize: string;
  format: string;
  creditsRemaining: number;
  creditsUsed: number;
  plan?: string;
}

export function InfoTab({
  width,
  height,
  fileSize,
  format,
  creditsRemaining,
  creditsUsed,
  plan = "free",
}: Props) {
  const displayW = width > 0 ? width : 1024;
  const displayH = height > 0 ? height : 1024;

  return (
    <div className="info-tab-container">
      {/* ── Section 1: Image Details ── */}
      <div className="info-tab-section">
        <span className="info-tab-section-title">Image Details</span>
        <div className="info-tab-items-list">
          {/* Dimensions */}
          <div className="info-tab-row">
            <div className="info-tab-row-left">
              <div className="info-tab-icon-wrap">
                <Maximize2 size={13} />
              </div>
              <span className="info-tab-label">Dimensions</span>
            </div>
            <span className="info-tab-value">{displayW} × {displayH} px</span>
          </div>

          {/* File Size */}
          <div className="info-tab-row">
            <div className="info-tab-row-left">
              <div className="info-tab-icon-wrap">
                <HardDrive size={13} />
              </div>
              <span className="info-tab-label">File Size</span>
            </div>
            <span className="info-tab-value">{fileSize}</span>
          </div>

          {/* Format */}
          <div className="info-tab-row">
            <div className="info-tab-row-left">
              <div className="info-tab-icon-wrap">
                <FileText size={13} />
              </div>
              <span className="info-tab-label">Format</span>
            </div>
            <span className="info-tab-value info-tab-badge">{format}</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Credits & Usage ── */}
      <div className="info-tab-section">
        <span className="info-tab-section-title">Credits & Usage</span>
        <div className="info-tab-items-list">
          {/* Credits Remaining */}
          <div className="info-tab-row">
            <div className="info-tab-row-left">
              <div className="info-tab-icon-wrap info-tab-icon-purple">
                <Zap size={13} />
              </div>
              <span className="info-tab-label">Credits Remaining</span>
            </div>
            <span className="info-tab-value info-tab-value-highlight">
              {creditsRemaining} credits left
            </span>
          </div>

          {/* Usage */}
          <div className="info-tab-row">
            <div className="info-tab-row-left">
              <div className="info-tab-icon-wrap">
                <Clock size={13} />
              </div>
              <span className="info-tab-label">{plan === "free" ? "Credits Used" : "Monthly Usage"}</span>
            </div>
            <span className="info-tab-value">{creditsUsed} {plan === "free" ? "used" : "used this month"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
