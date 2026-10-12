import { Share2, ShoppingBag, Palette, Sliders } from "lucide-react";
import type { PresetCategory } from "../types";

interface Props {
  activeCategory: PresetCategory;
  onSelectCategory: (category: PresetCategory) => void;
}

export function PresetTabs({ activeCategory, onSelectCategory }: Props) {
  const tabs: Array<{ id: PresetCategory; label: string; icon: typeof Share2 }> = [
    { id: "social", label: "Social Media", icon: Share2 },
    { id: "ecommerce", label: "E-commerce", icon: ShoppingBag },
    { id: "design", label: "Design", icon: Palette },
    { id: "custom", label: "Custom", icon: Sliders },
  ];

  return (
    <div className="re-tabs-container">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeCategory === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`re-tab-btn ${isActive ? "active" : ""}`}
            onClick={() => onSelectCategory(tab.id)}
          >
            <Icon size={13} className="re-tab-icon" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
