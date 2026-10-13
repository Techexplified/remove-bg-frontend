export type ToolboxTabId = "background" | "adjust" | "size" | "info";

interface Props {
  activeTab: ToolboxTabId;
  onChangeTab: (tab: ToolboxTabId) => void;
}

const TABS: { id: ToolboxTabId; label: string }[] = [
  { id: "background", label: "Background" },
  { id: "adjust", label: "Adjust" },
  { id: "size", label: "Size" },
  { id: "info", label: "Info" },
];

export function ToolboxNavTabs({ activeTab, onChangeTab }: Props) {
  return (
    <div className="toolbox-nav-tabs">
      {TABS.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`toolbox-nav-tab ${isActive ? "active" : ""}`}
            onClick={() => onChangeTab(tab.id)}
          >
            <span>{tab.label}</span>
            {isActive && <div className="toolbox-tab-indicator" />}
          </button>
        );
      })}
    </div>
  );
}
