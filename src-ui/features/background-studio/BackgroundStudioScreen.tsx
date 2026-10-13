import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection, addToast } from "../../app/slices/uiSlice";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import { StudioHeader } from "./components/StudioHeader";
import { BackgroundControlsPanel } from "./components/BackgroundControlsPanel";
import { StudioPreviewArea } from "./components/StudioPreviewArea";
import { StudioPresetsGrid } from "./components/StudioPresetsGrid";
import { StudioFooter } from "./components/StudioFooter";
import { BACKGROUND_PRESETS } from "./data/studioPresets";
import { getRecentBackgrounds, saveRecentBackground } from "./utils/recentHistory";
import { compositeBackground } from "./utils/backgroundCompositor";
import type {
  BackgroundTab,
  GradientConfig,
  AdjustmentsState,
  StudioFilter,
  StudioShadow,
  BackgroundPreset,
  RecentBackgroundItem,
} from "./types";
import "../../shared/styles/background-studio.css";

const DEFAULT_ADJUSTMENTS: AdjustmentsState = {
  opacity: 100,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
};

const DEFAULT_SHADOW: StudioShadow = {
  enabled: true,
  color: "rgba(0, 0, 0, 0.25)",
  blur: 20,
  offsetY: 10,
};

export function BackgroundStudioScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();
  const selection = useAppSelector((s) => s.figma.selection);

  // ── Source Foreground Image State ──
  const [foregroundImg, setForegroundImg] = useState<HTMLImageElement | null>(null);
  const [foregroundUrl, setForegroundUrl] = useState<string | null>(null);
  const foregroundBlobUrlRef = useRef<string | null>(null);

  // ── Active Background Styling State ──
  const [activeTab, setActiveTab] = useState<BackgroundTab>("color");
  const [effectiveBgType, setEffectiveBgType] = useState<BackgroundTab | "preset">("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>("ecommerce");
  const [activePreset, setActivePreset] = useState<BackgroundPreset | null>(BACKGROUND_PRESETS[0]);

  const [solidColor, setSolidColor] = useState<string>("#ffffff");
  const [gradient, setGradient] = useState<GradientConfig>({
    angle: 135,
    stops: [
      { color: "#ff6b6b", offset: 0 },
      { color: "#845ec2", offset: 1 },
    ],
  });
  const [backdropImage, setBackdropImage] = useState<HTMLImageElement | null>(null);
  const [backdropFileName, setBackdropFileName] = useState<string | null>(null);

  // ── Adjustments, Filter & Shadow ──
  const [adjustments, setAdjustments] = useState<AdjustmentsState>(DEFAULT_ADJUSTMENTS);
  const [filter, setFilter] = useState<StudioFilter>("normal");
  const [shadow, setShadow] = useState<StudioShadow>(DEFAULT_SHADOW);

  // ── History State ──
  const [recentItems, setRecentItems] = useState<RecentBackgroundItem[]>([]);

  // ── Compositing Output & Status ──
  const [compositedPreviewUrl, setCompositedPreviewUrl] = useState<string | null>(null);
  const compositedBlobUrlRef = useRef<string | null>(null);
  const [isCompositing, setIsCompositing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // ── Auto-resize window for Studio layout on mount ──
  useEffect(() => {
    bridge.resizeWindow(680, 740);
    bridge.requestSelection();
    setRecentItems(getRecentBackgrounds());

    return () => {
      bridge.resizeWindow(400, 700);
      if (foregroundBlobUrlRef.current) URL.revokeObjectURL(foregroundBlobUrlRef.current);
      if (compositedBlobUrlRef.current) URL.revokeObjectURL(compositedBlobUrlRef.current);
    };
  }, [bridge]);

  // ── Load selected canvas image ──
  useEffect(() => {
    if (!selection.hasSelection) return;

    let isMounted = true;
    (async () => {
      try {
        const bytes = await bridge.exportSelectedImage();
        if (bytes && bytes.length > 0 && isMounted) {
          if (foregroundBlobUrlRef.current) URL.revokeObjectURL(foregroundBlobUrlRef.current);
          const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
          const url = URL.createObjectURL(blob);
          foregroundBlobUrlRef.current = url;
          setForegroundUrl(url);

          const img = new Image();
          img.onload = () => {
            if (isMounted) setForegroundImg(img);
          };
          img.src = url;
        }
      } catch (err) {
        console.warn("Failed to export selection for Background Studio", err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selection.hasSelection, selection.hasSelection ? `${selection.id}:${selection.width}x${selection.height}` : "", bridge]);

  // ── Re-composite on state change (Debounced) ──
  useEffect(() => {
    if (!foregroundImg) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsCompositing(true);
      try {
        const w = foregroundImg.naturalWidth || 800;
        const h = foregroundImg.naturalHeight || 800;

        const bytes = await compositeBackground({
          foregroundImage: foregroundImg,
          width: w,
          height: h,
          bgType: effectiveBgType,
          solidColor,
          gradient,
          backdropImage,
          preset: activePreset,
          adjustments,
          filter,
          shadow,
        });

        if (bytes.length > 0 && isMounted) {
          if (compositedBlobUrlRef.current) URL.revokeObjectURL(compositedBlobUrlRef.current);
          const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
          const url = URL.createObjectURL(blob);
          compositedBlobUrlRef.current = url;
          setCompositedPreviewUrl(url);
        }
      } catch (err) {
        console.error("Compositor error:", err);
      } finally {
        if (isMounted) setIsCompositing(false);
      }
    }, 80);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    foregroundImg,
    effectiveBgType,
    activePreset,
    solidColor,
    gradient,
    backdropImage,
    adjustments,
    filter,
    shadow,
  ]);

  // ── Handlers ──
  const handleBackdropUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setBackdropImage(img);
        setBackdropFileName(file.name);
        setActiveTab("image");
        setEffectiveBgType("image");
        setSelectedPresetId(null);
        setActivePreset(null);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: BackgroundPreset) => {
    setSelectedPresetId(preset.id);
    setActivePreset(preset);
    setEffectiveBgType("preset");
  };

  const handleSelectRecent = (item: RecentBackgroundItem) => {
    setSelectedPresetId(null);
    setActivePreset(null);
    if (item.type === "color") {
      setEffectiveBgType("color");
      setActiveTab("color");
      setSolidColor(item.value);
    } else if (item.type === "gradient" && item.gradient) {
      setEffectiveBgType("gradient");
      setActiveTab("gradient");
      setGradient(item.gradient);
    }
  };

  const handleReset = () => {
    setSolidColor("#ffffff");
    setGradient({
      angle: 135,
      stops: [
        { color: "#ff6b6b", offset: 0 },
        { color: "#845ec2", offset: 1 },
      ],
    });
    setAdjustments(DEFAULT_ADJUSTMENTS);
    setFilter("normal");
    setShadow(DEFAULT_SHADOW);
    setEffectiveBgType("preset");
    setSelectedPresetId("ecommerce");
    setActivePreset(BACKGROUND_PRESETS[0]);
  };

  const handleApplyToFigma = async () => {
    if (!foregroundImg) return;
    setIsApplying(true);

    try {
      const w = foregroundImg.naturalWidth || 800;
      const h = foregroundImg.naturalHeight || 800;

      const finalBytes = await compositeBackground({
        foregroundImage: foregroundImg,
        width: w,
        height: h,
        bgType: effectiveBgType,
        solidColor,
        gradient,
        backdropImage,
        preset: activePreset,
        adjustments,
        filter,
        shadow,
      });

      if (finalBytes.length > 0) {
        bridge.insertResultImage(finalBytes);

        // Record in recent history
        const recentVal =
          effectiveBgType === "preset" && activePreset?.colors
            ? `linear-gradient(${activePreset.angle ?? 135}deg, ${activePreset.colors[0]} 0%, ${activePreset.colors[1]} 100%)`
            : activeTab === "color"
            ? solidColor
            : `linear-gradient(${gradient.angle}deg, ${gradient.stops[0].color} 0%, ${gradient.stops[1].color} 100%)`;

        const updatedRecent = saveRecentBackground(
          effectiveBgType === "preset" ? "gradient" : activeTab,
          recentVal,
          effectiveBgType === "preset" && activePreset?.colors
            ? {
                angle: activePreset.angle ?? 135,
                stops: [
                  { color: activePreset.colors[0], offset: 0 },
                  { color: activePreset.colors[1], offset: 1 },
                ],
              }
            : activeTab === "gradient"
            ? gradient
            : undefined
        );
        setRecentItems(updatedRecent);

        dispatch(
          addToast({
            id: `toast_${Date.now()}`,
            kind: "success",
            title: "Applied to Figma!",
          })
        );
      }
    } catch (err) {
      console.error("Failed to apply to Figma", err);
      dispatch(
        addToast({
          id: `toast_${Date.now()}`,
          kind: "error",
          title: "Failed to apply image",
        })
      );
    } finally {
      setIsApplying(false);
    }
  };

  const status = useAppSelector((s) => s.status.data);
  const plan = status?.plan ?? "free";
  const spendable = !status
    ? 8
    : status.credits + (plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter);
  const planLimit = plan === "pro" ? 200 : plan === "starter" ? 40 : 10;
  const creditsUsed = Math.max(0, planLimit - spendable);

  return (
    <div className="studio-container">
      <StudioHeader onBack={() => dispatch(setSection("features"))} />

      <main className="studio-workspace">
        <BackgroundControlsPanel
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setEffectiveBgType(tab);
            setSelectedPresetId(null);
            setActivePreset(null);
          }}
          solidColor={solidColor}
          onSolidColorChange={(c) => {
            setSolidColor(c);
            setEffectiveBgType("color");
            setSelectedPresetId(null);
            setActivePreset(null);
          }}
          gradient={gradient}
          onGradientChange={(g) => {
            setGradient(g);
            setEffectiveBgType("gradient");
            setSelectedPresetId(null);
            setActivePreset(null);
          }}
          backdropFileName={backdropFileName}
          onBackdropUpload={handleBackdropUpload}
          recentItems={recentItems}
          onSelectRecent={handleSelectRecent}
          adjustments={adjustments}
          onAdjustmentsChange={(adj) => {
            setAdjustments(adj);
          }}
          filter={filter}
          onFilterChange={(f) => {
            setFilter(f);
          }}
        />

        <div className="studio-right-panel">
          <StudioPreviewArea
            originalCutoutUrl={foregroundUrl}
            compositedPreviewUrl={compositedPreviewUrl}
            isCompositing={isCompositing}
          />

          <StudioPresetsGrid
            presets={BACKGROUND_PRESETS}
            selectedPresetId={selectedPresetId}
            foregroundPreviewUrl={foregroundUrl}
            onSelectPreset={handleSelectPreset}
          />
        </div>
      </main>

      <StudioFooter
        isApplying={isApplying}
        canApply={!!foregroundImg}
        creditsRemaining={spendable}
        creditsUsed={creditsUsed}
        onReset={handleReset}
        onApply={handleApplyToFigma}
      />
    </div>
  );
}
