import { Sparkles, Image as ImageIcon, Crop, FolderDown } from "lucide-react";
import type { BatchSettings, BatchBackgroundType, BatchResizeRatio, BatchExportFormat } from "../types";
import { BatchSelect, type BatchSelectOption } from "./BatchSelect";

interface Props {
  settings: BatchSettings;
  onChangeSettings: (updater: (prev: BatchSettings) => BatchSettings) => void;
}

const BG_OPTIONS: BatchSelectOption<BatchBackgroundType>[] = [
  { value: "transparent", label: "Transparent", swatch: "transparent" },
  { value: "white", label: "White", swatch: "white" },
  { value: "black", label: "Black", swatch: "black" },
];

const RESIZE_OPTIONS: BatchSelectOption<BatchResizeRatio>[] = [
  { value: "original", label: "Original Size" },
  { value: "1:1", label: "1:1 Square" },
  { value: "4:3", label: "4:3 Landscape" },
  { value: "3:4", label: "3:4 Portrait" },
  { value: "16:9", label: "16:9 Landscape" },
  { value: "9:16", label: "9:16 Story" },
];

export function BatchSettingsPanel({ settings, onChangeSettings }: Props) {
  const isTransparent = settings.background === "transparent";

  const formatOptions: BatchSelectOption<BatchExportFormat>[] = isTransparent
    ? [{ value: "png", label: "PNG (HD)" }]
    : [
        { value: "png", label: "PNG (HD)" },
        { value: "jpg", label: "JPG" },
        { value: "webp", label: "WebP" },
      ];

  const handleToggleRemoveBg = () => {
    onChangeSettings((prev) => ({ ...prev, removeBackground: !prev.removeBackground }));
  };

  const handleChangeBg = (bg: BatchBackgroundType) => {
    onChangeSettings((prev) => ({
      ...prev,
      background: bg,
      // If transparent selected, ensure format is locked back to PNG
      exportFormat: bg === "transparent" ? "png" : prev.exportFormat,
    }));
  };

  const handleChangeResize = (resize: BatchResizeRatio) => {
    onChangeSettings((prev) => ({ ...prev, resize }));
  };

  const handleChangeFormat = (exportFormat: BatchExportFormat) => {
    onChangeSettings((prev) => ({ ...prev, exportFormat }));
  };

  return (
    <div className="batch-settings-panel">
      <div className="batch-settings-title">Apply Same Settings to All</div>

      {/* Row 1: Remove Background Toggle */}
      <div className="batch-setting-row">
        <div className="batch-setting-left">
          <Sparkles size={15} className="batch-setting-icon" />
          <span>Remove Background</span>
        </div>
        <div
          className={`batch-toggle ${settings.removeBackground ? "active" : ""}`}
          onClick={handleToggleRemoveBg}
          title={
            settings.removeBackground
              ? "Background removal enabled (1 credit/image)"
              : "Background removal disabled (0 credits)"
          }
        >
          <div className="batch-toggle-thumb" />
        </div>
      </div>

      {/* Row 2: Background Type */}
      <div className="batch-setting-row">
        <div className="batch-setting-left">
          <ImageIcon size={15} className="batch-setting-icon" />
          <span>Background</span>
        </div>
        <BatchSelect<BatchBackgroundType>
          value={settings.background}
          options={BG_OPTIONS}
          onChange={handleChangeBg}
        />
      </div>

      {/* Row 3: Resize Aspect Ratio */}
      <div className="batch-setting-row">
        <div className="batch-setting-left">
          <Crop size={15} className="batch-setting-icon" />
          <span>Resize</span>
        </div>
        <BatchSelect<BatchResizeRatio>
          value={settings.resize}
          options={RESIZE_OPTIONS}
          onChange={handleChangeResize}
        />
      </div>

      {/* Row 4: Export Format */}
      <div className="batch-setting-row">
        <div className="batch-setting-left">
          <FolderDown size={15} className="batch-setting-icon" />
          <span>Export Format</span>
        </div>
        <BatchSelect<BatchExportFormat>
          value={settings.exportFormat}
          options={formatOptions}
          disabled={isTransparent}
          onChange={handleChangeFormat}
          title={
            isTransparent
              ? "Locked to PNG (HD) to preserve transparency"
              : "Select export format"
          }
        />
      </div>
    </div>
  );
}
