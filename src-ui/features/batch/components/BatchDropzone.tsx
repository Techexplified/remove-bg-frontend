import { useRef, useState } from "react";
import { UploadCloud, Image as ImageIcon, Layers } from "lucide-react";

interface Props {
  onFilesSelected: (files: File[]) => void;
  onSelectFromCanvas: () => void;
}

export function BatchDropzone({ onFilesSelected, onSelectFromCanvas }: Props) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) onFilesSelected(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = "";
    }
  };

  return (
    <div
      className={`batch-dropzone ${isDragActive ? "drag-active" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div className="batch-dropzone-icon">
        <UploadCloud size={24} />
      </div>
      <div className="batch-dropzone-title">Drop multiple images here</div>
      <div className="batch-dropzone-sub">or select from canvas</div>
      <div className="batch-dropzone-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="batch-action-btn batch-action-btn-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon size={14} />
          <span>Add Images</span>
        </button>
        <button
          type="button"
          className="batch-action-btn batch-action-btn-secondary"
          onClick={onSelectFromCanvas}
          title="Import selected layers from Figma canvas"
        >
          <Layers size={14} />
          <span>From Canvas</span>
        </button>
      </div>
      <div className="batch-dropzone-hint">
        Supports JPG, PNG, WebP • Max 50 images
      </div>
    </div>
  );
}
