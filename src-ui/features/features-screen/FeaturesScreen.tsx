import { useRef, useState, useCallback } from "react";
import { ChevronRight, Sparkles, Crop, Palette, FileOutput, Layers, Sun, Lightbulb, ZoomIn, Wand2, PenTool, Upload, X, Image } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { FC } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { openModal, setAIFeature } from "../../app/slices/uiSlice";
import { HeroCard } from "./HeroCard";
import { PRIMARY_FEATURE, STARTER_FEATURES, PRO_FEATURES, isFeatureUnlocked, PLAN_RANK } from "../../shared/types/featureData";
import type { FeatureDef } from "../../shared/types/features";

// Feature IDs that are AI/Pro-only and subject to the features lock
const AI_FEATURE_IDS = new Set([
  "ai_background", "ai_shadows", "ai_relighting",
  "hd_export", "ai_upscale", "ai_image_gen", "ai_logo_maker",
]);

export interface Props {
  onRunFeature: (f: FeatureDef, localBytes?: Uint8Array) => void;
  onManagePlan: () => void;
  onTopUp: () => void;
  watching: boolean;
  onStopWatching: () => void;
}

const ICON_MAP: Record<string, FC<LucideProps>> = {
  Sparkles, Crop, Palette, FileOutput, Layers, Sun, Lightbulb, ZoomIn, Wand2, PenTool,
};

function FeatureIcon({ name, size = 15 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name];
  return Icon ? <Icon size={size} /> : <Sparkles size={size} />;
}

/** Read a File as a Uint8Array */
function readFileBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

type ImageSource = "canvas" | "local";

export function FeaturesScreen({ onRunFeature, onManagePlan, onTopUp, watching, onStopWatching }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);
  const selection = useAppSelector(s => s.figma.selection);
  const processing = useAppSelector(s => s.ui.processing);
  const plan = status?.plan ?? "free";
  const proLocked = status?.featuresLocked === true;
  const spendable = !status ? 0 : (status.credits + (plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter));
  const isBusy = processing.stage !== "idle" && processing.stage !== "success" && processing.stage !== "error";
  const multiSel = selection.hasSelection && selection.count > 1;
  const hasSel = selection.hasSelection;

  // ── Local image upload state ──
  const [imageSource, setImageSource] = useState<ImageSource>("canvas");
  const [localFile, setLocalFile] = useState<{ name: string; previewUrl: string; bytes: Uint8Array } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(png|jpe?g|webp)$/)) {
      return; // Only PNG/JPEG/WebP
    }
    const bytes = await readFileBytes(file);
    const previewUrl = URL.createObjectURL(file);
    // Revoke old preview
    if (localFile) URL.revokeObjectURL(localFile.previewUrl);
    setLocalFile({ name: file.name, previewUrl, bytes });
    setImageSource("local");
  }, [localFile]);

  function clearLocalFile() {
    if (localFile) URL.revokeObjectURL(localFile.previewUrl);
    setLocalFile(null);
    setImageSource("canvas");
  }

  // Drag events
  function onDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true); }
  function onDragLeave() { setIsDragging(false); }
  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) await handleFileSelect(f);
  }

  const effectiveHasSel = imageSource === "local" ? !!localFile : hasSel;
  const primaryDisabled = isBusy || !status || (imageSource === "canvas" && (multiSel || !hasSel));

  function handleFeatureClick(f: FeatureDef) {
    // When proLocked, AI features show Coming Soon — block interaction silently
    if (proLocked && AI_FEATURE_IDS.has(f.id)) {
      dispatch(openModal({ kind: "coming_soon" }));
      return;
    }
    if (!isFeatureUnlocked(f, plan)) {
      dispatch(openModal({ kind: "plan_picker" }));
      return;
    }
    if (f.hasSubScreen) {
      dispatch(setAIFeature(f.id));
      return;
    }
    if (f.needsPrompt) {
      dispatch(openModal({ kind: "prompt", featureId: f.id }));
      return;
    }
    if (f.needsColor || f.needsOutputSize) {
      dispatch(openModal({ kind: "options", featureId: f.id }));
      return;
    }
    const bytes = imageSource === "local" && localFile ? localFile.bytes : undefined;
    onRunFeature(f, bytes);
  }

  function handlePrimaryRun() {
    const bytes = imageSource === "local" && localFile ? localFile.bytes : undefined;
    onRunFeature(PRIMARY_FEATURE, bytes);
  }

  return (
    <>
      <div className="pane-header">
        <h2>ZeroBG</h2>
        <p>Background Remover and AI Image Editor</p>
      </div>
      <div className="pane-body">
        <HeroCard onManagePlan={onManagePlan} onTopUp={onTopUp} watching={watching} onStopWatching={onStopWatching} />

        {/* ── Image source toggle ── */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
          <button
            onClick={() => setImageSource("canvas")}
            style={{
              flex: 1, padding: "7px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "600",
              border: imageSource === "canvas" ? "1.5px solid var(--brand)" : "1px solid var(--c-border)",
              background: imageSource === "canvas" ? "rgba(108,71,255,.08)" : "var(--c-bg-2)",
              color: imageSource === "canvas" ? "var(--brand)" : "var(--c-text-3)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            }}>
            <Image size={12} /> Canvas Selection
          </button>
          <button
            onClick={() => { setImageSource("local"); if (!localFile) fileInputRef.current?.click(); }}
            style={{
              flex: 1, padding: "7px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: "600",
              border: imageSource === "local" ? "1.5px solid var(--brand)" : "1px solid var(--c-border)",
              background: imageSource === "local" ? "rgba(108,71,255,.08)" : "var(--c-bg-2)",
              color: imageSource === "local" ? "var(--brand)" : "var(--c-text-3)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
            }}>
            <Upload size={12} /> Upload Image
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={async e => { const f = e.target.files?.[0]; if (f) await handleFileSelect(f); e.target.value = ""; }}
        />

        {/* ── Canvas selection view ── */}
        {imageSource === "canvas" && (
          !hasSel ? (
            <div className="selection-box" style={{ background: "rgba(108,71,255,.03)", border: "1.5px dashed rgba(108,71,255,.2)" }}>
              <Sparkles size={24} color="var(--brand)" style={{ margin: "0 auto 8px", display: "block" }} />
              <div className="selection-hint" style={{ fontWeight: 600, color: "var(--c-text)" }}>
                Select an image or layer
                <small style={{ fontWeight: 400, color: "var(--c-text-3)", marginTop: 4 }}>
                  Click a layer on the canvas to get started
                </small>
              </div>
            </div>
          ) : (
            <div className="selection-box selection-active" style={{ background: "rgba(108,71,255,.05)", borderColor: "var(--brand-border)" }}>
              <div>
                <div className="selection-name" style={{ color: "var(--c-text)", fontWeight: "600" }}>{selection.name}</div>
                <div className="selection-dims" style={{ color: "var(--brand)", fontSize: "10px", marginTop: "2px" }}>
                  {selection.width} × {selection.height}px
                </div>
              </div>
            </div>
          )
        )}

        {/* ── Local upload drop zone / preview ── */}
        {imageSource === "local" && (
          !localFile ? (
            <div
              className="selection-box"
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: isDragging ? "rgba(108,71,255,.08)" : "rgba(108,71,255,.03)",
                border: isDragging ? "2px dashed var(--brand)" : "1.5px dashed rgba(108,71,255,.25)",
                cursor: "pointer", transition: "all 0.15s",
              }}>
              <Upload size={24} color="var(--brand)" style={{ margin: "0 auto 8px", display: "block" }} />
              <div className="selection-hint" style={{ fontWeight: 600, color: "var(--c-text)" }}>
                Drop an image here
                <small style={{ fontWeight: 400, color: "var(--c-text-3)", marginTop: 4 }}>
                  or click to browse · PNG, JPEG, WebP
                </small>
              </div>
            </div>
          ) : (
            <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", marginBottom: "6px", border: "1.5px solid var(--brand-border)", background: "rgba(108,71,255,.04)" }}>
              <img
                src={localFile.previewUrl}
                alt="Local upload"
                style={{ width: "100%", height: "100px", objectFit: "cover", display: "block" }}
              />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "6px 10px", background: "rgba(0,0,0,.55)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "10.5px", color: "#fff", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                  {localFile.name}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); clearLocalFile(); }}
                  style={{ background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
                  <X size={11} />
                </button>
              </div>
              {/* Change image button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,.5)", border: "none", borderRadius: "6px", padding: "3px 7px", fontSize: "9.5px", color: "#fff", cursor: "pointer", fontWeight: "600" }}>
                Change
              </button>
            </div>
          )
        )}

        <button
          className="cta-btn"
          disabled={primaryDisabled || (imageSource === "local" && !localFile)}
          onClick={handlePrimaryRun}
          style={{ background: "var(--brand)", display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={15} />
          {imageSource === "local" && !localFile
            ? "Upload an image first"
            : !effectiveHasSel
              ? "Select an image first"
              : multiSel && imageSource === "canvas"
                ? "Use Batch mode for multiple"
                : spendable < 1
                  ? "Out of credits. Get Pro for HD image"
                  : "Remove Background"}
        </button>

        <FeatureGroup
          label="STARTER"
          dotColor="#16a34a"
          plan={plan}
          proLocked={false}
          features={[PRIMARY_FEATURE, ...STARTER_FEATURES]}
          spendable={spendable}
          isBusy={isBusy}
          onFeatureClick={handleFeatureClick}
          FeatureIcon={FeatureIcon}
        />
        <FeatureGroup
          label="PRO"
          dotColor="var(--brand)"
          plan={plan}
          proLocked={proLocked}
          features={PRO_FEATURES}
          spendable={spendable}
          isBusy={isBusy}
          onFeatureClick={handleFeatureClick}
          FeatureIcon={FeatureIcon}
        />
      </div>
    </>
  );
}

function FeatureGroup({ label, dotColor, plan, proLocked, features, spendable, isBusy, onFeatureClick, FeatureIcon }: {
  label: string;
  dotColor: string;
  plan: string;
  proLocked: boolean;
  features: FeatureDef[];
  spendable: number;
  isBusy: boolean;
  onFeatureClick: (f: FeatureDef) => void;
  FeatureIcon: (p: { name: string; size?: number }) => JSX.Element | null;
}) {
  const included = PLAN_RANK[plan] >= PLAN_RANK[label.toLowerCase()];

  return (
    <div className="feature-group">
      <div className="feature-group-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span className="feature-group-label" style={{ display: "flex", alignItems: "center", gap: "6px", color: proLocked ? "var(--c-text-3)" : dotColor, fontWeight: "700", fontSize: "10.5px" }}>
          <span className="feature-group-dot" style={{ background: proLocked ? "var(--c-text-3)" : dotColor, width: "6px", height: "6px", borderRadius: "50%" }} />
          {label}
        </span>
        <span className="feature-group-note" style={{ fontSize: "10px", color: "var(--c-text-3)" }}>
          {proLocked ? "Coming soon" : included ? "Included in your plan" : "Upgrade to unlock"}
        </span>
      </div>
      {features.map(f => {
        const isAI = AI_FEATURE_IDS.has(f.id);
        const isComingSoon = proLocked && isAI;
        const unlocked = !isComingSoon && isFeatureUnlocked(f, plan);
        const disabled = (!isComingSoon && unlocked && (isBusy || (spendable < f.credits && f.id !== "remove_bg_basic"))) || isComingSoon;

        let desc = f.credits === 0 ? "Free · unlimited" : `${f.credits} credit${f.credits > 1 ? "s" : ""} per ${f.id.includes("gen") || f.id.includes("logo") ? "generation" : f.id.includes("export") ? "export" : "use"}`;

        let iconBg = isComingSoon ? "rgba(108,71,255,.04)" : unlocked ? "rgba(108,71,255,.1)" : "rgba(108,71,255,.05)";
        let iconColor = isComingSoon ? "var(--c-text-4)" : unlocked ? "var(--brand)" : "var(--c-text-3)";
        if (!isComingSoon) {
          if (f.id === "remove_bg_basic") { iconBg = "rgba(22,163,74,.1)"; iconColor = "#16a34a"; }
          else if (f.id === "crop_resize") { iconBg = "rgba(245,158,11,.1)"; iconColor = "#d97706"; }
          else if (f.id === "color_background_fill") { iconBg = "rgba(245,158,11,.1)"; iconColor = "#d97706"; }
          else if (f.id === "hd_export") { iconBg = "rgba(59,130,246,.1)"; iconColor = "#2563eb"; }
        }

        return (
          <div
            key={f.id}
            className={`feature-row ${(!unlocked && !isComingSoon) ? "locked" : ""} ${disabled ? "locked" : ""}`}
            style={isComingSoon ? { opacity: 0.5, cursor: "default" } : undefined}
            onClick={() => !disabled && onFeatureClick(f)}
          >
            <div className="feature-row-icon" style={{ background: iconBg, color: iconColor }}>
              <FeatureIcon name={f.icon} size={15} />
            </div>
            <div className="feature-row-info">
              <div className="feature-row-name" style={{ fontSize: "12px", color: isComingSoon ? "var(--c-text-3)" : "var(--c-text)", fontWeight: "600" }}>
                {f.label}
                {!isComingSoon && f.badge && f.id !== "remove_bg_basic" && (
                  <span className={`badge badge-${f.badge.toLowerCase()}`} style={{ marginLeft: "6px" }}>
                    {f.badge}
                  </span>
                )}
              </div>
              <div className="feature-row-desc" style={{ fontSize: "10px", color: "var(--c-text-3)", marginTop: "2px" }}>
                {isComingSoon ? "Coming soon" : desc}
              </div>
            </div>
            <div className="feature-row-right">
              {isComingSoon ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", background: "rgba(108,71,255,.08)", color: "var(--c-text-3)", padding: "3.5px 8px", borderRadius: "100px", fontSize: "8.5px", fontWeight: "700" }}>
                  🔒 SOON
                </span>
              ) : f.id === "remove_bg_basic" ? (
                <span className="badge badge-free">Free</span>
              ) : !unlocked ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", background: "var(--brand)", color: "white", padding: "3.5px 8px", borderRadius: "100px", fontSize: "8.5px", fontWeight: "700" }}>
                  ★ PRO
                </span>
              ) : (
                <ChevronRight size={14} color="var(--c-text-3)" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
