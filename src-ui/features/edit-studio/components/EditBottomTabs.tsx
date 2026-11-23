import { Edit3, Wand2, Layers, SlidersHorizontal, Crop, Lock, type LucideIcon } from "lucide-react";
import type { EditTab } from "../types";

interface Props {
  activeTab: EditTab;
  onTabChange: (tab: EditTab) => void;
  isFreePlan: boolean;
}

interface TabDef {
  id: EditTab;
  label: string;
  icon: LucideIcon;
  isPaid: boolean;
}

const TABS: TabDef[] = [
  { id: "refine", label: "Refine", icon: Edit3, isPaid: false },
  { id: "remove", label: "Remove", icon: Wand2, isPaid: false },
  { id: "background", label: "Background", icon: Layers, isPaid: true },
  { id: "filters", label: "Filters", icon: SlidersHorizontal, isPaid: false },
  { id: "resize", label: "Resize", icon: Crop, isPaid: true },
];

export function EditBottomTabs({ activeTab, onTabChange, isFreePlan }: Props) {
  return (
    <nav className="edit-studio-bottom-nav" aria-label="Editor tools">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const showLock = tab.isPaid && isFreePlan;

        return (
          <button
            key={tab.id}
            type="button"
            className={`edit-studio-tab-item ${isActive ? "active" : ""}`}
            onClick={() => onTabChange(tab.id)}
          >
            <div className="edit-studio-tab-icon-wrapper">
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              {showLock && (
                <span className="edit-studio-tab-lock-badge" title="Starter plan feature">
                  <Lock size={9} strokeWidth={2.4} />
                </span>
              )}
            </div>
            <span className="edit-studio-tab-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
