import {
  Instagram,
  Youtube,
  Facebook,
  Twitter,
  Pin,
  Linkedin,
  ShoppingBag,
  Store,
  Package,
  Monitor,
  Tv,
  Palette,
  Frame,
  Maximize2,
  Presentation,
  Image,
} from "lucide-react";
import type { SizePreset } from "../types";

interface Props {
  presets: SizePreset[];
  selectedPresetId: string | null;
  onSelectPreset: (preset: SizePreset) => void;
}

function getPlatformIcon(iconName: string) {
  switch (iconName) {
    case "Instagram":
      return <Instagram size={15} color="#E1306C" />;
    case "Youtube":
      return <Youtube size={15} color="#FF0000" />;
    case "Facebook":
      return <Facebook size={15} color="#1877F2" />;
    case "Twitter":
      return <Twitter size={15} color="#1DA1F2" />;
    case "Pin":
      return <Pin size={15} color="#E60023" />;
    case "Linkedin":
      return <Linkedin size={15} color="#0A66C2" />;
    case "ShoppingBag":
      return <ShoppingBag size={15} color="#FF9900" />;
    case "Store":
      return <Store size={15} color="#6C47FF" />;
    case "Package":
      return <Package size={15} color="#0064D2" />;
    case "Monitor":
      return <Monitor size={15} color="#3B82F6" />;
    case "Tv":
      return <Tv size={15} color="#8B5CF6" />;
    case "Palette":
      return <Palette size={15} color="#EA4C89" />;
    case "Frame":
      return <Frame size={15} color="#10B981" />;
    case "Maximize2":
      return <Maximize2 size={15} color="#6366F1" />;
    case "Presentation":
      return <Presentation size={15} color="#F59E0B" />;
    default:
      return <Image size={15} color="#6C47FF" />;
  }
}

export function PresetList({ presets, selectedPresetId, onSelectPreset }: Props) {
  return (
    <div className="re-presets-list">
      {presets.map((preset) => {
        const isSelected = selectedPresetId === preset.id;
        return (
          <div
            key={preset.id}
            className={`re-preset-card ${isSelected ? "selected" : ""}`}
            onClick={() => onSelectPreset(preset)}
          >
            <div className="re-preset-left">
              <div className="re-preset-icon-wrap">
                {getPlatformIcon(preset.iconName)}
              </div>
              <div className="re-preset-info">
                <span className="re-preset-name">{preset.label}</span>
                <span className="re-preset-dims">
                  {preset.width} × {preset.height}
                </span>
              </div>
            </div>
            <div className={`re-radio-circle ${isSelected ? "active" : ""}`}>
              {isSelected && <div className="re-radio-dot" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
