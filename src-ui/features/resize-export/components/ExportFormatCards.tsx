import { Image as ImageIcon } from "lucide-react";
import type { ExportFormat } from "../types";

interface Props {
  selectedFormat: ExportFormat;
  onSelectFormat: (format: ExportFormat) => void;
}

export function ExportFormatCards({ selectedFormat, onSelectFormat }: Props) {
  const formats: Array<{
    id: ExportFormat;
    label: string;
    description: string;
    badge?: string;
  }> = [
    {
      id: "png",
      label: "PNG",
      description: "Best quality for transparent backgrounds",
    },
    {
      id: "jpg",
      label: "JPG",
      description: "Smaller file size for web use",
    },
    {
      id: "webp",
      label: "WebP",
      description: "Optimized for modern web and apps",
      badge: "Download only",
    },
  ];

  return (
    <div className="re-formats-section">
      <div className="re-section-title">Export Format</div>
      <div className="re-format-cards-grid">
        {formats.map((fmt) => {
          const isSelected = selectedFormat === fmt.id;
          return (
            <div
              key={fmt.id}
              className={`re-format-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectFormat(fmt.id)}
            >
              <div className="re-format-card-top">
                <div className="re-format-icon-wrap">
                  <ImageIcon size={16} />
                </div>
                {fmt.badge && <span className="re-format-card-badge">{fmt.badge}</span>}
              </div>
              <div className="re-format-label">{fmt.label}</div>
              <div className="re-format-desc">{fmt.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
