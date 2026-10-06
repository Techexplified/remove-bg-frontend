import { useRef, useState, useCallback } from "react";
import { ChevronRight, Sparkles, Crop, Palette, FileOutput, Layers, Sun, Lightbulb, ZoomIn, Wand2, PenTool, Upload, X, Image, Settings, SlidersHorizontal } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { FC } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { openModal, setAIFeature, setSection } from "../../app/slices/uiSlice";
import { PRIMARY_FEATURE, STARTER_FEATURES, PRO_FEATURES, isFeatureUnlocked, PLAN_RANK, PLAN_LIMITS } from "../../shared/types/featureData";
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

const TARGET_PRO_FEATURE_IDS = new Set(["remove_bg_basic", "color_background_fill", "crop_resize"]);

export function FeaturesScreen({ onRunFeature, onManagePlan, onTopUp, watching, onStopWatching }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);
  const selection = useAppSelector(s => s.figma.selection);
  const isBusy = useAppSelector(s => s.ui.processing.stage !== "idle" && s.ui.processing.stage !== "success" && s.ui.processing.stage !== "error");
  const isStatusLoading = status === null;
  const plan = status?.plan ?? "free";
  const proLocked = status?.featuresLocked === true;
  const spendable = !status ? 0 : (status.credits + (plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter));
  const planLimit = PLAN_LIMITS[plan] ?? 10;
  const totalLimit = Math.max(planLimit, spendable);
  const pct = totalLimit > 0 ? Math.min(100, Math.round((spendable / totalLimit) * 100)) : 0;
  const daysLeft = status?.daysLeft ?? 0;
  // User has 0 credits left out of 10 and has not converted into Pro yet
  const isZeroCredits = !!status && plan !== "pro" && spendable <= 0;
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
    // When 0 credits left out of 10, direct user to get Pro for all 3 starter/free features
    if (isZeroCredits && TARGET_PRO_FEATURE_IDS.has(f.id)) {
      onManagePlan();
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
      <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--c-text)", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--brand)" }} />
            RemoveBG
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => dispatch(setSection("toolbox"))}
            style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            title="Design System / Toolbox">
            <SlidersHorizontal size={15} />
          </button>
          <button
            onClick={() => dispatch(setSection("settings"))}
            style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            title="Settings">
            <Settings size={15} />
          </button>
        </div>
      </div>

      <div className="pane-body">
        {/* ── Image Dropzone Container ── */}
        <div
          className="selection-box"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={24} color="var(--brand)" style={{ margin: "0 auto 8px", display: "block" }} />
          <div className="selection-hint">
            {localFile ? localFile.name : selection.hasSelection ? selection.name : "Drop image here"}
            <small>or click to browse</small>
          </div>
          {/* Source toggle pills */}
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "12px" }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setImageSource("canvas")}
              style={{
                padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: "700",
                border: imageSource === "canvas" ? "1px solid var(--brand)" : "1px solid var(--c-border)",
                background: imageSource === "canvas" ? "rgba(0,245,155,.15)" : "var(--c-bg-2)",
                color: imageSource === "canvas" ? "var(--brand)" : "var(--c-text-3)",
                cursor: "pointer",
              }}>
              From Canvas
            </button>
            <button
              onClick={() => { setImageSource("local"); if (!localFile) fileInputRef.current?.click(); }}
              style={{
                padding: "4px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: "700",
                border: imageSource === "local" ? "1px solid var(--brand)" : "1px solid var(--c-border)",
                background: imageSource === "local" ? "rgba(0,245,155,.15)" : "var(--c-bg-2)",
                color: imageSource === "local" ? "var(--brand)" : "var(--c-text-3)",
                cursor: "pointer",
              }}>
              Upload File
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={async e => { const f = e.target.files?.[0]; if (f) await handleFileSelect(f); e.target.value = ""; }}
        />

        {/* ── Remaining Credits Card ── */}
        <div className="credit-card" style={{ marginBottom: "12px" }}>
          <div className="credit-card-header">
            <span>Remaining Credits {!isStatusLoading && plan !== "free" && <span className={`badge badge-${plan}`} style={{ marginLeft: "4px" }}>{plan.toUpperCase()}</span>}</span>
            {daysLeft > 0 && <span style={{ fontSize: "10px", color: "var(--c-text-3)" }}>Resets in {daysLeft}d</span>}
          </div>
          <div className="credit-card-numbers">
            {isStatusLoading ? (
              <div className="credit-card-main" style={{ fontSize: "12px", opacity: 0.7, display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ display: "inline-block", width: "10px", height: "10px", border: "2px solid var(--brand)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Syncing credits…
              </div>
            ) : (
              <>
                <div className="credit-card-main">
                  {spendable} <span>/ {totalLimit}</span>
                </div>
                <div className="credit-card-pct">{pct}%</div>
              </>
            )}
          </div>
          <div className="progress-bar-track">
            <div className={`progress-bar-fill ${isStatusLoading ? "proc-bar-indeterminate" : ""}`} style={{ width: isStatusLoading ? "100%" : `${pct}%` }} />
          </div>
          {isZeroCredits && (
            <div style={{ marginTop: "10px", fontSize: "11px", color: "#f87171", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
              0 credits left out of 10. Get Pro to continue.
            </div>
          )}
        </div>

        {/* ── Upgrade to Pro CTA ── */}
        <button
          className="cta-btn"
          onClick={onManagePlan}
          style={{
            marginBottom: "20px",
            background: isZeroCredits ? "linear-gradient(135deg, #6c47ff, #9333ea)" : "var(--brand)",
            boxShadow: isZeroCredits ? "0 4px 14px rgba(108, 71, 255, 0.35)" : undefined,
          }}>
          {isZeroCredits ? "★ Get Pro — 0 Credits Left" : plan === "pro" ? "Manage Pro Plan" : "Upgrade to Pro"}
        </button>

        {/* ── CREATIVE TOOLBOX Section ── */}
        <div style={{ fontSize: "10.5px", fontWeight: "800", color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: "10px" }}>
          Creative Toolbox
        </div>
        <div className="feature-grid">
          {[PRIMARY_FEATURE, ...STARTER_FEATURES, ...PRO_FEATURES].map(f => {
            const isAI = AI_FEATURE_IDS.has(f.id);
            const isComingSoon = proLocked && isAI;
            const isTargetFeature = TARGET_PRO_FEATURE_IDS.has(f.id);
            const isGetPro = isZeroCredits && isTargetFeature;

            // When user has 0 credits left out of 10, show GET PRO for all 3 starter/free features until converted into Pro.
            const creditLabel = f.credits === 0 ? "FREE" : `${f.credits} CR`;
            const badgeText = isGetPro ? "GET PRO" : isComingSoon ? "SOON" : creditLabel;
            const isActive = f.id === "remove_bg_basic";

            return (
              <div
                key={f.id}
                className={`feature-card ${isActive && !isGetPro ? "active-card" : ""} ${isGetPro ? "get-pro-card" : ""}`}
                onClick={() => {
                  if (isGetPro) {
                    onManagePlan();
                    return;
                  }
                  if (!isComingSoon) handleFeatureClick(f);
                }}
              >
                <div className="feature-card-header">
                  <div className="feature-card-icon" style={isGetPro ? { background: "rgba(108,71,255,.15)", color: "var(--brand)" } : undefined}>
                    <FeatureIcon name={f.icon} size={15} />
                  </div>
                  <span className={`feature-card-badge ${isGetPro ? "badge-get-pro" : badgeText.includes("CR") ? "badge-cr" : ""}`}>
                    {badgeText}
                  </span>
                </div>
                <div className="feature-card-name">{f.label}</div>
                {isGetPro && (
                  <div style={{ fontSize: "9.5px", color: "var(--brand)", fontWeight: "700", marginTop: "1px" }}>
                    Get Pro to unlock →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

