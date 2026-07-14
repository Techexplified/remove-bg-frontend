interface Props { onResize: (w: number, h: number) => void; }
const PRESETS = [
  { label: "Instagram Post", dims: "1080×1080", w: 1080, h: 1080 },
  { label: "Instagram Story", dims: "1080×1920", w: 1080, h: 1920 },
  { label: "Twitter/X Post", dims: "1200×675", w: 1200, h: 675 },
  { label: "Facebook Cover", dims: "851×315", w: 851, h: 315 },
  { label: "LinkedIn Banner", dims: "1584×396", w: 1584, h: 396 },
  { label: "YouTube Thumb", dims: "1280×720", w: 1280, h: 720 },
  { label: "A4 Portrait", dims: "2480×3508", w: 2480, h: 3508 },
  { label: "Square 500px", dims: "500×500", w: 500, h: 500 },
];
export function PresetsTool({ onResize }: Props) {
  return (
    <div className="toolbox-body">
      <div className="preset-grid">
        {PRESETS.map(p => (
          <div key={p.label} className="preset-tile" onClick={() => onResize(p.w, p.h)}>
            <div className="preset-tile-label">{p.label}</div>
            <div className="preset-tile-dims">{p.dims}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
