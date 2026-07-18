import { useState } from "react";
import { Loader2 } from "lucide-react";
import { STARTER_FEATURES, PRIMARY_FEATURE } from "../../../shared/types/featureData";
import type { FeatureDef } from "../../../shared/types/features";
import type { SelectionNodeRef } from "../../../shared/types/messages";

interface Props {
  credits: number;
  listSelection: () => Promise<SelectionNodeRef[]>;
  exportNode: (id: string) => Promise<Uint8Array>;
  insertResultImage: (bytes: Uint8Array) => void;
  notify: (msg: string) => void;
}

const BATCH_FEATURES = [PRIMARY_FEATURE, ...STARTER_FEATURES.filter(f => !f.needsColor && !f.needsOutputSize)];

export function BatchTool({ credits, listSelection, exportNode, insertResultImage, notify }: Props) {
  const [selected, setSelected] = useState<FeatureDef>(BATCH_FEATURES[0]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  async function handleRun() {
    const nodes = await listSelection();
    if (!nodes.length) { notify("Select at least 2 layers."); return; }
    const needed = nodes.length * selected.credits;
    if (credits < needed) { notify(`Need ${needed} credits for ${nodes.length} layers. You have ${credits}.`); return; }
    setRunning(true); setProgress({ done: 0, total: nodes.length });
    for (let i = 0; i < nodes.length; i++) {
      try {
        const bytes = await exportNode(nodes[i].id);
        insertResultImage(bytes);
        setProgress({ done: i + 1, total: nodes.length });
      } catch { notify(`Failed on "${nodes[i].name}".`); }
    }
    setRunning(false); notify(`Batch complete: ${nodes.length} layers processed.`);
  }

  return (
    <div className="toolbox-body">
      <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>Choose a feature to apply to all selected layers:</div>
      <div className="batch-chips">
        {BATCH_FEATURES.map(f => (
          <div key={f.id} className={`batch-chip ${selected.id === f.id ? "chip-active" : ""}`}
            onClick={() => !running && setSelected(f)}>{f.label}</div>
        ))}
      </div>
      {running && (
        <div>
          <div className="batch-bar"><div className="batch-bar-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
          <div style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: 5 }}>{progress.done} of {progress.total} layers</div>
        </div>
      )}
      <button className="btn btn-primary btn-block" disabled={running} onClick={handleRun}>
        {running ? <><Loader2 size={12} className="spin" />Processing…</> : `Run ${selected.label} on all layers`}
      </button>
    </div>
  );
}
