import { Home, PenTool, Settings } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection } from "../../app/slices/uiSlice";
import type { SectionId } from "../types/features";

const NAV = [
  { id: "features" as SectionId, icon: Home, label: "Features" },
  { id: "toolbox" as SectionId, icon: PenTool, label: "Design System" },
];
const BOTTOM = [
  { id: "settings" as SectionId, icon: Settings, label: "Settings" },
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
