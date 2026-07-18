import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal } from "../../../app/slices/uiSlice";
import {
  NAMED_COLORS, CROP_PRESETS, ALL_FEATURES,
  BG_PRESETS, SHADOW_DIRECTIONS, SHADOW_MODES, RELIGHTING_MODES,
} from "../../types/featureData";
import type { FeatureId } from "../../types/features";

interface Props {
  onSubmit: (featureId: FeatureId, opts: Record<string, string | undefined>) => void;
}

export function FeatureOptionsModal({ onSubmit }: Props) {
  const dispatch = useAppDispatch();
  const modal = useAppSelector(s => s.ui.modal);

  // ── Color Background ──
  const [color, setColor] = useState<string | null>(null);

  // ── Crop & Resize ──
  const [selectedId, setSelectedId] = useState<string>("instagram_post");
  const [customWidth, setCustomWidth] = useState<string>("1080");
  const [customHeight, setCustomHeight] = useState<string>("1080");

  // ── HD Export ──
  const [hdQuality, setHdQuality] = useState<"hd" | "full">("hd");

  // ── AI Background ──
  const [bgPrompt, setBgPrompt] = useState<string>("");

  // ── AI Shadows ──
  const [shadowMode, setShadowMode] = useState<string>("soft");
  const [shadowDir, setShadowDir] = useState<string | null>(null);
  const [shadowIntensity, setShadowIntensity] = useState<number>(0.7);
  const [shadowSpread, setShadowSpread] = useState<string | null>(null);

  // ── AI Relighting ──
  const [relightMode, setRelightMode] = useState<string>("auto");

  const fid = modal.featureId;
  const isColor = fid === "color_background_fill";
  const isHD = fid === "hd_export";
  const isCrop = fid === "crop_resize";
  const isBG = fid === "ai_background";
  const isShadow = fid === "ai_shadows";
  const isRelight = fid === "ai_relighting";

  const feature = ALL_FEATURES.find(f => f.id === fid);
  const credits = feature?.credits ?? 1;

  // ── Submit ──
  function handleSubmit(auto?: boolean) {
    if (!fid) return;

    if (isColor) {
      if (!color) return;
      onSubmit(fid, { color });
    } else if (isHD) {
      onSubmit(fid, { outputSize: hdQuality });
    } else if (isCrop) {
      let finalSize = "1080x1080";
      if (selectedId === "custom") {
        const w = parseInt(customWidth, 10) || 1080;
        const h = parseInt(customHeight, 10) || 1080;
        finalSize = `${w}x${h}`;
      } else {
        const preset = CROP_PRESETS.find(p => p.id === selectedId);
        if (preset) finalSize = `${preset.width}x${preset.height}`;
      }
      onSubmit(fid, { outputSize: finalSize });
    } else if (isBG) {
      const finalPrompt = bgPrompt.trim();
      onSubmit(fid, (auto || !finalPrompt) ? {} : { prompt: finalPrompt });
    } else if (isShadow) {
      if (auto) {
        onSubmit(fid, {});
      } else {
        const opts: Record<string, string | undefined> = {};
        const hasOverride = !!shadowDir || !!shadowSpread;
        if (hasOverride) {
          if (shadowDir) {
            opts.shadowDirection = shadowDir;
            opts.shadowIntensity = shadowIntensity.toString();
          }
          if (shadowSpread) {
            opts.shadowSpread = shadowSpread;
          }
        } else {
          opts.shadowMode = shadowMode;
        }
        onSubmit(fid, opts);
      }
    } else if (isRelight) {
      onSubmit(fid, { lightingMode: relightMode });
    }
    dispatch(closeModal());
  }

  // ── Validation ──
  const isCustomInvalid = isCrop && selectedId === "custom" && (
    !customWidth || !customHeight ||
    !/^\d+$/.test(customWidth) || !/^\d+$/.test(customHeight) ||
    Number(customWidth) <= 0 || Number(customHeight) <= 0 ||
    Number(customWidth) > 6000 || Number(customHeight) > 6000
  );

  const isSubmitDisabled =
    isColor ? !color :
    isCrop ? isCustomInvalid :
    isBG ? false :
    isShadow ? false :
    isRelight ? false :
    false;

  // ── Header text ──
  const modalTitle =
    isColor ? "Color Background" :
    isHD ? "HD Export" :
    isCrop ? "Choose output size" :
    isBG ? "AI Background" :
    isShadow ? "AI Shadows" :
    isRelight ? "AI Relighting" :
    "Feature Options";

  const modalSub =
    isColor ? "Choose a background color" :
    isHD ? "Choose export quality" :
    isCrop ? "Select a format preset" :
    isBG ? "Describe a scene or choose a preset" :
    isShadow ? "Customise shadow style and direction" :
    isRelight ? "Choose a lighting mode" :
    "";

  const modalMaxW =
    isColor ? 300 :
    isBG ? 360 :
    isShadow ? 350 :
    isRelight ? 350 :
    340;

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => dispatch(closeModal())}>
        <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()} style={{ maxWidth: modalMaxW }}>
          <div className="modal-head">
            <div>
              <div className="modal-title">{modalTitle}</div>
              <div className="modal-sub">{modalSub}</div>
            </div>
            <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
          </div>
          <div className="modal-body" style={{ gap: "14px" }}>

            {/* ━━━ Color Background ━━━ */}
            {isColor && (
              <>
                <div className="swatch-grid">
                  {NAMED_COLORS.map(c => (
                    <div key={c.name} className={`swatch ${color === c.name ? "swatch-active" : ""}`}
                      style={{ background: c.hex, border: c.name === "white" ? "2px solid var(--c-border)" : undefined }}
                      onClick={() => setColor(c.name)} title={c.name} />
                  ))}
                </div>
                {color && <div style={{ fontSize: 11, color: "var(--c-text-3)", textAlign: "center" }}>Selected: <strong style={{ color: "var(--c-text)" }}>{color}</strong></div>}
              </>
            )}

            {/* ━━━ HD Export ━━━ */}
            {isHD && (
              <div className="hd-quality-list">
                <div className={`hd-option-card ${hdQuality === "hd" ? "active" : ""}`}
                  onClick={() => setHdQuality("hd")}>
                  <div className="hd-option-header">
                    <div className="hd-radio-circle">
                      {hdQuality === "hd" && <div className="hd-radio-dot" />}
                    </div>
                    <span>HD</span>
                    <span className="hd-option-dims">~2000×2000 (4 MP)</span>
                  </div>
                  <div className="hd-option-sub">Best for: presentations, web</div>
                </div>

                <div className={`hd-option-card ${hdQuality === "full" ? "active" : ""}`}
                  onClick={() => setHdQuality("full")}>
                  <div className="hd-option-header">
                    <div className="hd-radio-circle">
                      {hdQuality === "full" && <div className="hd-radio-dot" />}
                    </div>
                    <span>Full</span>
                    <span className="hd-option-dims">~6000×6000 (36 MP)</span>
                  </div>
                  <div className="hd-option-sub">Best for: print, billboards, catalog</div>
                </div>
              </div>
            )}

            {/* ━━━ Crop & Resize ━━━ */}
            {isCrop && (
              <>
                <div className="format-list">
                  {CROP_PRESETS.map(p => (
                    <div key={p.id} className={`format-row ${selectedId === p.id ? "format-row-active" : ""}`}
                      onClick={() => setSelectedId(p.id)}>
                      <span>{p.label}</span>
                      <span className="format-dims">{p.width} × {p.height}</span>
                    </div>
                  ))}

                  <div className={`format-row ${selectedId === "custom" ? "format-row-active" : ""}`}
                    onClick={() => setSelectedId("custom")}>
                    <span>Custom size</span>
                    {selectedId !== "custom" && <span className="format-dims">Enter W × H</span>}
                  </div>

                  {selectedId === "custom" && (
                    <div className="custom-dims-container">
                      <div className="custom-dims-row">
                        <input type="number" className="custom-dim-input" placeholder="W"
                          value={customWidth} onChange={e => setCustomWidth(e.target.value.slice(0, 5))} />
                        <span className="custom-dim-x">×</span>
                        <input type="number" className="custom-dim-input" placeholder="H"
                          value={customHeight} onChange={e => setCustomHeight(e.target.value.slice(0, 5))} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ━━━ AI Background ━━━ */}
            {isBG && (
              <>
                <textarea
                  className="aibg-prompt"
                  placeholder="e.g. on a tropical beach at sunset, warm light"
                  value={bgPrompt}
                  onChange={e => setBgPrompt(e.target.value.slice(0, 1000))}
                  rows={3}
                  autoFocus
                />
                <div className="aibg-charcount">{bgPrompt.length} / 1000</div>

                <div className="aibg-chips">
                  {BG_PRESETS.map(q => (
                    <button key={q.label} className={`aibg-chip ${bgPrompt === q.prompt ? "aibg-chip-active" : ""}`}
                       onClick={() => setBgPrompt(q.prompt)}>
                      {q.label}
                    </button>
                  ))}
                </div>

                <div className="aibg-actions">
                  <button className="btn btn-ghost" onClick={() => handleSubmit(true)}>
                    Auto — Studio Look
                  </button>
                  <button className="btn btn-primary" onClick={() => handleSubmit(false)}>
                    Generate — {credits} cr
                  </button>
                </div>
              </>
            )}

            {/* ━━━ AI Shadows ━━━ */}
            {isShadow && (
              <>
                {/* Style toggle */}
                <div className="shd-section-label">Shadow style</div>
                <div className="shd-style-row">
                  {SHADOW_MODES.map(m => (
                    <button key={m.id}
                      className={`shd-style-btn ${shadowMode === m.id ? "shd-style-btn-active" : ""}`}
                      onClick={() => setShadowMode(m.id)}>
                      <span className="shd-style-name">{m.label}</span>
                      <span className="shd-style-desc">{m.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Direction picker */}
                <div className="shd-section-label">Direction</div>
                <div className="shd-dir-row">
                  {SHADOW_DIRECTIONS.map(d => (
                    <button key={d.value}
                      className={`shd-dir-btn ${shadowDir === d.value ? "shd-dir-btn-active" : ""}`}
                      onClick={() => setShadowDir(shadowDir === d.value ? null : d.value)}>
                      <span className="shd-dir-icon">{d.label}</span>
                      <span className="shd-dir-label">{d.sublabel}</span>
                    </button>
                  ))}
                </div>

                {/* Intensity slider — only visible when a direction is selected */}
                {shadowDir && (
                  <div className="shd-intensity-container">
                    <div className="shd-section-label">Intensity <span className="shd-intensity-val">{Math.round(shadowIntensity * 100)}%</span></div>
                    <input type="range" min="0" max="1" step="0.01"
                      className="shd-slider"
                      value={shadowIntensity}
                      onChange={e => setShadowIntensity(parseFloat(e.target.value))}
                    />
                  </div>
                )}

                {/* Spread picker */}
                <div className="shd-section-label">Spread</div>
                <div className="shd-spread-row" style={{ display: "flex", gap: "8px" }}>
                  {["small", "medium", "large"].map(s => (
                    <button key={s}
                      type="button"
                      className={`shd-spread-btn ${shadowSpread === s ? "shd-spread-btn-active" : ""}`}
                      onClick={() => setShadowSpread(shadowSpread === s ? null : s)}>
                      {s}
                    </button>
                  ))}
                </div>

                <div className="aibg-actions">
                  <button className="btn btn-ghost" onClick={() => handleSubmit(true)}>
                    Auto — AI Decides
                  </button>
                  <button className="btn btn-primary" onClick={() => handleSubmit(false)}>
                    Apply Shadow — {credits} cr
                  </button>
                </div>
              </>
            )}

            {/* ━━━ AI Relighting ━━━ */}
            {isRelight && (
              <>
                <div className="rlt-list">
                  {RELIGHTING_MODES.map(m => (
                    <div key={m.id}
                      className={`rlt-card ${relightMode === m.id ? "rlt-card-active" : ""}`}
                      onClick={() => setRelightMode(m.id)}>
                      <div className="rlt-card-header">
                        <div className="hd-radio-circle">
                          {relightMode === m.id && <div className="hd-radio-dot" />}
                        </div>
                        <span className="rlt-card-name">{m.label}</span>
                      </div>
                      <div className="rlt-card-desc">{m.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="rlt-warning">
                  ⚠ Max input size: 3500×3500 pixels
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" onClick={() => handleSubmit(false)}>
                    Relight Image — {credits} cr
                  </button>
                </div>
              </>
            )}

            {/* ━━━ Footer for Color / HD / Crop ━━━ */}
            {(isColor || isHD || isCrop) && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--c-border)", paddingTop: "12px", marginTop: "2px" }}>
                  <span style={{ fontSize: 11, color: "var(--c-text-3)", fontWeight: "600" }}>
                    {isHD ? "HD Quality Option" : `Cost: ${credits} credit${credits > 1 ? "s" : ""}`}
                  </span>
                  <button className="btn btn-primary" disabled={isSubmitDisabled} onClick={() => handleSubmit()} style={{ padding: "8px 18px", borderRadius: "8px" }}>
                    {isHD ? `Export ${hdQuality.toUpperCase()} — ${credits} credits` : isCrop ? "Crop & Resize" : "Apply"}
                  </button>
                </div>

                {isCrop && (
                  <div className="format-tooltip">
                    AI detects your subject and reframes it perfectly for any size — no manual repositioning needed.
                  </div>
                )}

                {isHD && (
                  <div className="format-tooltip">
                    Maximum quality export for print materials, large-format ads, and high-DPI screens. Other features output at medium quality — HD Export gives you the full resolution.
                  </div>
                )}
              </>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
