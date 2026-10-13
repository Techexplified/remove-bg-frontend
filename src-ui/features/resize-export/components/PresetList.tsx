import {
  Facebook,
  Monitor,
  Tv,
  Palette,
  Frame,
  Maximize2,
  Presentation,
  Image,
} from "lucide-react";
import type { SizePreset } from "../types";
import instagramLogo from "../assests/Instagram-logo.svg";
import youtubeLogo from "../assests/Youtube-Logo.svg";
import twitterXLogo from "../assests/twitter-X-logo.svg";
import pinterestLogo from "../assests/Pinintrest-Logo.svg";
import linkedinLogo from "../assests/Linkedin-logo.svg";
import amazonLogo from "../assests/Amazon-Logo.svg";
import shopifyLogo from "../assests/Shopify-Logo.svg";
import ebayLogo from "../assests/Ebay-logo.svg";
import wooLogo from "../assests/woocommerce-logo.svg";

interface Props {
  presets: SizePreset[];
  selectedPresetId: string | null;
  onSelectPreset: (preset: SizePreset) => void;
}

function getPlatformIcon(iconName: string) {
  switch (iconName) {
    case "Instagram":
      return <img src={instagramLogo} alt="Instagram" className="re-preset-brand-icon" />;
    case "Youtube":
      return <img src={youtubeLogo} alt="YouTube" className="re-preset-brand-icon" />;
    case "Facebook":
      return <Facebook size={15} color="#1877F2" />;
    case "Twitter":
      return <img src={twitterXLogo} alt="X (Twitter)" className="re-preset-brand-icon" />;
    case "Pin":
      return <img src={pinterestLogo} alt="Pinterest" className="re-preset-brand-icon" />;
    case "Linkedin":
      return <img src={linkedinLogo} alt="LinkedIn" className="re-preset-brand-icon" />;
    case "Amazon":
      return <img src={amazonLogo} alt="Amazon" className="re-preset-brand-icon" />;
    case "Shopify":
      return <img src={shopifyLogo} alt="Shopify" className="re-preset-brand-icon" />;
    case "Ebay":
      return <img src={ebayLogo} alt="eBay" className="re-preset-brand-icon" />;
    case "WooCommerce":
      return <img src={wooLogo} alt="WooCommerce" className="re-preset-brand-icon" />;
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
