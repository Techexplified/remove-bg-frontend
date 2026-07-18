import { useState } from "react";
import { RotateCcw } from "lucide-react";

interface Props { onApply: (b: number, c: number, s: number) => void; }
const DEFAULTS = { brightness: 100, contrast: 100, saturation: 100 };

export function FiltersTool({ onApply }: Props) {
  const [vals, setVals] = useState(DEFAULTS);
  const set = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) => setVals(v => ({ ...v, [k]: +e.target.value }));
  return (
    <div className="toolbox-body">
      {(["brightness", "contrast", "saturation"] as const).map(k => (
        <div key={k} className="slider-row">
          <div className="slider-top"><span className="slider-label" style={{ textTransform: "capitalize" }}>{k}</span><span className="slider-val">{vals[k]}</span></div>
          <input type="range" className="slider-input" min={0} max={200} value={vals[k]} onChange={set(k)} />
        </div>
      ))}
      <div className="toolbox-actions">
        <button className="btn btn-ghost" onClick={() => setVals(DEFAULTS)}><RotateCcw size={12} />Reset</button>
        <button className="btn btn-primary" onClick={() => onApply(vals.brightness, vals.contrast, vals.saturation)}>Apply</button>
      </div>
    </div>
  );
}
