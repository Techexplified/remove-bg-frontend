import { useRef, useCallback } from "react";
import { Sparkles, Crop, Palette, FileOutput, Layers, Sun, Lightbulb, ZoomIn, Wand2, PenTool, Copy, Scissors, SlidersHorizontal, Settings, Upload, X } from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { FC } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection, addToast } from "../../app/slices/uiSlice";
import { setUploadedImage, setActiveImageSource, clearUploadedImage } from "../../app/slices/figmaSlice";
import { IMAGE_STUDIO_FEATURES, PLAN_LIMITS } from "../../shared/types/featureData";
import type { FeatureDef } from "../../shared/types/features";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";

export interface Props {
  onRunFeature: (f: FeatureDef, localBytes?: Uint8Array) => void;
  onManagePlan: () => void;
  onTopUp: () => void;
  watching: boolean;
  onStopWatching: () => void;
}

const ICON_MAP: Record<string, FC<LucideProps>> = {
  Sparkles, Crop, Palette, FileOutput, Layers, Sun, Lightbulb, ZoomIn, Wand2, PenTool, Copy, Scissors,
};

function FeatureIcon({ name, size = 18 }: { name: string; size?: number }) {
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

const PRO_LOCKED_FEATURES = new Set(["background_studio", "resize_export"]);

export function FeaturesScreen({ onRunFeature, onManagePlan }: Props) {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();
  const status = useAppSelector(s => s.status.data);
  const { selection, previewUrl, uploadedImage, activeImageSource } = useAppSelector(s => s.figma);
  const plan = status?.plan ?? "free";
  const isPaid = !!status && status.plan !== "free";
  const spendable = !status ? 0 : (status.credits + (plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter));
  const planLimit = PLAN_LIMITS[plan] ?? 3;
  const totalLimit = Math.max(planLimit, spendable);
  const pct = totalLimit > 0 ? Math.min(100, Math.round((spendable / totalLimit) * 100)) : 0;
  const daysLeft = status?.daysLeft ?? 0;
  // User has 0 credits left on free tier
  const isZeroCredits = !!status && !isPaid && spendable <= 0;
  const isStatusLoading = status === null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(png|jpe?g|webp)$/)) {
      return; // Only PNG/JPEG/WebP
    }
    const bytes = await readFileBytes(file);
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      dispatch(setUploadedImage({
        name: file.name,
        previewUrl: blobUrl,
        bytes,
        width: img.naturalWidth,
        height: img.naturalHeight,
        originalPreviewUrl: blobUrl,
        originalBytes: bytes,
      }));
    };
    img.onerror = () => {
      dispatch(setUploadedImage({
        name: file.name,
        previewUrl: blobUrl,
        bytes,
        originalPreviewUrl: blobUrl,
        originalBytes: bytes,
      }));
    };
    img.src = blobUrl;
  }, [dispatch]);

  // Drag events
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDragLeave() {}
  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) await handleFileSelect(f);
  }

  function handleFeatureClick(f: FeatureDef) {
    if (f.id === "remove_bg_basic" && spendable <= 0) {
      dispatch(addToast({
        id: `toast_out_of_credits_${Date.now()}`,
        kind: "warning",
        title: "Out of credits",
        message: status?.plan === "free"
          ? "You've used all 3 free images. Upgrade plan to continue."
          : "You've used all your images this month. Upgrade plan to continue.",
      }));
      onManagePlan();
      return;
    }
    if (f.id === "batch_process") {
      dispatch(setSection("batch"));
      return;
    }
    if (f.id === "background_studio") {
      dispatch(setSection("background_studio"));
      return;
    }
    if (f.id === "resize_export") {
      dispatch(setSection("resize_export"));
      return;
    }
    const bytes = activeImageSource === "upload" && uploadedImage ? uploadedImage.bytes : undefined;
    onRunFeature(f, bytes);
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
          style={{
            cursor: activeImageSource === "upload" && !uploadedImage ? "pointer" : "default",
            padding: "16px 14px",
          }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => {
            if (activeImageSource === "upload" && !uploadedImage) {
              fileInputRef.current?.click();
            }
          }}
        >
          {/* Active Image Preview or Empty Placeholder */}
          {activeImageSource === "upload" ? (
            uploadedImage ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                <img
                  src={uploadedImage.previewUrl}
                  alt={uploadedImage.name}
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    objectFit: "contain",
                    background: "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 10px 10px",
                    border: "1px solid var(--c-border)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: "var(--c-text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {uploadedImage.name}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--brand)", fontWeight: "600", marginTop: "3px" }}>
                    {uploadedImage.width && uploadedImage.height ? `${uploadedImage.width}×${uploadedImage.height} px · ` : ""}
                    Uploaded File
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    style={{
                      padding: "5px 9px",
                      fontSize: "10.5px",
                      fontWeight: "700",
                      borderRadius: "7px",
                      border: "1px solid var(--c-border)",
                      background: "var(--c-bg-2)",
                      color: "var(--c-text-2)",
                      cursor: "pointer",
                    }}
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(clearUploadedImage());
                    }}
                    style={{
                      width: "26px",
                      height: "26px",
                      borderRadius: "50%",
                      border: "none",
                      background: "rgba(0,0,0,0.06)",
                      color: "var(--c-text-3)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Remove uploaded image"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ cursor: "pointer" }} onClick={() => fileInputRef.current?.click()}>
                <Upload size={24} color="var(--brand)" style={{ margin: "0 auto 8px", display: "block" }} />
                <div className="selection-hint">
                  Drop image here
                  <small>or click to browse from computer</small>
                </div>
              </div>
            )
          ) : (
            /* Canvas Source */
            selection.hasSelection ? (
              <div style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={selection.name}
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "10px",
                      objectFit: "contain",
                      background: "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 10px 10px",
                      border: "1px solid var(--c-border)",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "10px",
                    background: "rgba(108, 71, 255, 0.08)",
                    border: "1px solid rgba(108, 71, 255, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--brand)",
                    flexShrink: 0,
                  }}>
                    <Layers size={22} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "12.5px",
                    fontWeight: "700",
                    color: "var(--c-text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>
                    {selection.name}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--brand)", fontWeight: "600", marginTop: "3px" }}>
                    {selection.width} × {selection.height} px · Canvas Selection
                  </div>
                </div>
                <span style={{
                  fontSize: "9px",
                  fontWeight: "700",
                  padding: "3px 8px",
                  borderRadius: "100px",
                  background: "rgba(22, 163, 74, 0.12)",
                  color: "#16a34a",
                  border: "1px solid rgba(22, 163, 74, 0.2)",
                  flexShrink: 0,
                }}>
                  ● Selected
                </span>
              </div>
            ) : (
              <div>
                <Layers size={24} color="var(--brand)" style={{ margin: "0 auto 8px", display: "block" }} />
                <div className="selection-hint">
                  No layer selected
                  <small>Select an image on the Figma canvas</small>
                </div>
              </div>
            )
          )}

          {/* Source toggle pills */}
          <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginTop: "14px", paddingTop: "10px", borderTop: "1px solid rgba(0,0,0,0.05)" }} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                dispatch(setActiveImageSource("canvas"));
                bridge.requestSelection();
              }}
              style={{
                padding: "4px 12px", borderRadius: "100px", fontSize: "10.5px", fontWeight: "700",
                border: activeImageSource === "canvas" ? "1.5px solid var(--brand)" : "1px solid var(--c-border)",
                background: activeImageSource === "canvas" ? "rgba(108, 71, 255, 0.12)" : "var(--c-bg-2)",
                color: activeImageSource === "canvas" ? "var(--brand)" : "var(--c-text-3)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}>
              From Canvas
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch(setActiveImageSource("upload"));
                if (!uploadedImage) {
                  fileInputRef.current?.click();
                }
              }}
              style={{
                padding: "4px 12px", borderRadius: "100px", fontSize: "10.5px", fontWeight: "700",
                border: activeImageSource === "upload" ? "1.5px solid var(--brand)" : "1px solid var(--c-border)",
                background: activeImageSource === "upload" ? "rgba(108, 71, 255, 0.12)" : "var(--c-bg-2)",
                color: activeImageSource === "upload" ? "var(--brand)" : "var(--c-text-3)",
                cursor: "pointer",
                transition: "all 0.15s ease",
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
          onChange={async e => {
            const f = e.target.files?.[0];
            if (f) await handleFileSelect(f);
            e.target.value = "";
          }}
        />

        {/* ── Remaining Credits Card ── */}
        <div className="credit-card" style={{ marginBottom: "12px" }}>
          <div className="credit-card-header">
            <span>Remaining Credits {!isStatusLoading && plan !== "free" && <span className={`badge badge-${plan}`} style={{ marginLeft: "4px" }}>{plan.toUpperCase()}</span>}</span>
            {plan !== "free" && daysLeft > 0 && <span style={{ fontSize: "10px", color: "var(--c-text-3)" }}>Resets in {daysLeft}d</span>}
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
              {plan === "free" ? "0 free images left out of 3. Upgrade plan to continue." : "0 credits left. Upgrade plan to continue."}
            </div>
          )}
        </div>

        {/* ── Upgrade Plan CTA ── */}
        <button
          className="cta-btn"
          onClick={onManagePlan}
          style={{
            marginBottom: "20px",
            background: isZeroCredits ? "linear-gradient(135deg, #6c47ff, #9333ea)" : "var(--brand)",
            boxShadow: isZeroCredits ? "0 4px 14px rgba(108, 71, 255, 0.35)" : undefined,
          }}>
          {isZeroCredits ? "★ Upgrade Plan — 0 Credits Left" : isPaid ? "Manage Plan" : "Upgrade Plan"}
        </button>

        {/* ── IMAGE STUDIO Section ── */}
        <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: "12px" }}>
          IMAGE STUDIO
        </div>
        <div className="feature-grid">
          {IMAGE_STUDIO_FEATURES.map(f => {
            const isUpgradeFeature = !isPaid && PRO_LOCKED_FEATURES.has(f.id);

            return (
              <div
                key={f.id}
                className="feature-card"
                onClick={() => handleFeatureClick(f)}
              >
                <div className="feature-card-header">
                  <div className="feature-card-icon">
                    <FeatureIcon name={f.icon} size={18} />
                  </div>
                  {isUpgradeFeature && (
                    <span className="feature-card-badge badge-get-pro" style={{ fontSize: "8.5px", padding: "2px 6px" }}>
                      UPGRADE
                    </span>
                  )}
                </div>
                <div className="feature-card-name">{f.label}</div>
                <div className="feature-card-desc">{f.description}</div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

