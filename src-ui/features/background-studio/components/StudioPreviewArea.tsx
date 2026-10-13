import { useState } from "react";
import { Eye, Image as ImageIcon } from "lucide-react";

interface Props {
  originalCutoutUrl: string | null;
  compositedPreviewUrl: string | null;
  isCompositing: boolean;
}

export function StudioPreviewArea({
  originalCutoutUrl,
  compositedPreviewUrl,
  isCompositing,
}: Props) {
  const [showBefore, setShowBefore] = useState(false);

  const displayUrl = showBefore ? originalCutoutUrl : (compositedPreviewUrl || originalCutoutUrl);

  return (
    <div className="preview-canvas-container">
      {/* Top Left Floating Before / After Toggle */}
      {originalCutoutUrl && (
        <div className="canvas-toggle-overlay">
          <button
            className={`before-after-pill-btn ${showBefore ? "active" : ""}`}
            onClick={() => setShowBefore(true)}
          >
            <Eye size={12} />
            <span>Before</span>
          </button>
          <button
            className={`before-after-pill-btn ${!showBefore ? "active" : ""}`}
            onClick={() => setShowBefore(false)}
          >
            <span>After</span>
          </button>
        </div>
      )}

      {/* Top Right HD Badge */}
      <div className="canvas-hd-badge">HD</div>

      {/* Main Image Display */}
      {displayUrl ? (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            src={displayUrl}
            alt="Preview"
            className="preview-rendered-img"
          />
          {isCompositing && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255, 255, 255, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6c47ff",
                fontSize: "12px",
                fontWeight: 600,
                backdropFilter: "blur(2px)",
              }}
            >
              Updating preview…
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            color: "#64748b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ImageIcon size={32} opacity={0.4} />
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
            No image selected
          </div>
          <div style={{ fontSize: "11px", maxWidth: "200px" }}>
            Select an image with removed background on Figma canvas.
          </div>
        </div>
      )}
    </div>
  );
}
