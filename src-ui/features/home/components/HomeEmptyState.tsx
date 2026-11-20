import { useState } from "react";
import { Upload, Layers } from "lucide-react";

interface Props {
  onUploadClick: () => void;
  onInsertFromCanvas: () => void;
  onDropFiles: (files: FileList) => void;
}

export function HomeEmptyState({
  onUploadClick,
  onInsertFromCanvas,
  onDropFiles,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDropFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`home-v2-dropzone ${isDragOver ? "drag-active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onUploadClick}
    >
      {/* Decorative General Sample Illustration */}
      <div className="home-v2-illustration-wrap">
        {/* Left Card: Original Photo */}
        <div className="home-v2-card-preview card-left">
          <svg viewBox="0 0 84 84" className="home-v2-card-svg">
            <defs>
              <linearGradient id="photoSky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="40%" stopColor="#fdba74" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>
            <rect width="84" height="84" fill="url(#photoSky)" />
            <circle cx="58" cy="26" r="9" fill="#ffffff" opacity="0.85" />
            <polygon points="12,84 38,42 64,84" fill="#881337" opacity="0.35" />
            <polygon points="36,84 56,48 76,84" fill="#4c0519" opacity="0.45" />
            <g transform="translate(24, 28)">
              <rect x="4" y="8" width="28" height="20" rx="4" fill="#1e293b" />
              <circle cx="18" cy="18" r="6" fill="#38bdf8" />
              <circle cx="18" cy="18" r="3" fill="#0f172a" />
              <rect x="8" y="4" width="8" height="4" rx="1.5" fill="#1e293b" />
              <circle cx="27" cy="12" r="1.5" fill="#ef4444" />
            </g>
          </svg>
        </div>

        {/* Right Card: Clean Cutout on Transparent Checkerboard */}
        <div className="home-v2-card-preview card-right">
          <div className="home-v2-card-inner card-bg-checkerboard">
            <svg viewBox="0 0 84 84" className="home-v2-card-svg">
              <g transform="translate(24, 28)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.18))">
                <rect x="4" y="8" width="28" height="20" rx="4" fill="#0f172a" />
                <circle cx="18" cy="18" r="6" fill="#38bdf8" />
                <circle cx="18" cy="18" r="3" fill="#0f172a" />
                <rect x="8" y="4" width="8" height="4" rx="1.5" fill="#0f172a" />
                <circle cx="27" cy="12" r="1.5" fill="#ef4444" />
              </g>
              <path d="M16 22 L17.5 16 L23.5 17.5 L17.5 19 Z" fill="#8b5cf6" />
              <path d="M66 52 L67.5 46 L73.5 47.5 L67.5 49 Z" fill="#f59e0b" />
            </svg>
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className="home-v2-dropzone-text">
        <h3 className="home-v2-dropzone-title">Select one or more images</h3>
        <p className="home-v2-dropzone-subtitle">on your canvas, or drop them here</p>
      </div>

      {/* Action Buttons: Insert from canvas & Upload */}
      <div className="home-v2-dropzone-actions">
        <button
          type="button"
          className="home-v2-canvas-insert-btn"
          onClick={(e) => {
            e.stopPropagation();
            onInsertFromCanvas();
          }}
          title="Insert currently selected layers from Figma canvas"
        >
          <Layers size={14} />
          <span>Insert from canvas</span>
        </button>

        <button
          type="button"
          className="home-v2-upload-btn"
          onClick={(e) => {
            e.stopPropagation();
            onUploadClick();
          }}
          title="Upload image files from computer"
        >
          <Upload size={14} />
          <span>Upload</span>
        </button>
      </div>
    </div>
  );
}
