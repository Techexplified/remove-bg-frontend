import { Sparkles, Layers, User, HelpCircle, Shield } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection } from "../../app/slices/uiSlice";
import type { SectionId } from "../types/features";

const NAV = [
  { id: "features" as SectionId, icon: Sparkles, label: "Features" },
  { id: "toolbox" as SectionId, icon: Layers, label: "Toolbox" },
  { id: "account" as SectionId, icon: User, label: "Account" },
];
const BOTTOM = [
  { id: "help" as SectionId, icon: HelpCircle, label: "Help" },
  { id: "legal" as SectionId, icon: Shield, label: "Legal" },
];

export function Sidebar() {
  const dispatch = useAppDispatch();
  const active = useAppSelector(s => s.ui.activeSection);
  return (
    <div className="sidebar">
      <nav className="sidebar-nav">
        {NAV.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`sidebar-btn ${active === id ? "active" : ""}`}
            onClick={() => dispatch(setSection(id))} title={label}>
            <Icon size={18} />
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        {BOTTOM.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`sidebar-btn ${active === id ? "active" : ""}`}
            onClick={() => dispatch(setSection(id))} title={label}>
            <Icon size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}
