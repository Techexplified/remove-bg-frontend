import { useState } from "react";
import {
  ChevronLeft,
  Zap,
  ThumbsUp,
  ThumbsDown,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection, addToast } from "../../app/slices/uiSlice";
import { setEditingImage } from "../../app/slices/figmaSlice";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import { CommunityReviewModal } from "./components/CommunityReviewModal";
import "../../shared/styles/v2/preview.css";

const FIGMA_COMMUNITY_REVIEW_URL =
  "https://www.figma.com/community/plugin/1643987146382893434/removebg-background-remover-and-ai-image-editor";

export function PreviewScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();

  const status = useAppSelector((s) => s.status.data);
  const { selection, previewUrl, originalUrl, uploadedImage } = useAppSelector(
    (s) => s.figma
  );

  // Spendable credits calculation
  const plan = status?.plan ?? "free";
  const spendable = !status
    ? 3
    : status.credits + (plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter);

  // Interactive View States
  const [viewMode, setViewMode] = useState<"after" | "before">("after");
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

  const handleToggleLike = () => {
    if (feedback === "like") {
      setFeedback(null);
    } else {
      setFeedback("like");
      setShowCommunityModal(true);
    }
  };

  const handleToggleDislike = () => {
    if (feedback === "dislike") {
      setFeedback(null);
    } else {
      setFeedback("dislike");
    }
  };

  // ── Lock Preview Item on Mount ──
  // Prevents canvas selection clicks in Figma from hijacking or replacing this preview
  const [lockedItem] = useState(() => {
    const cutout = uploadedImage?.previewUrl || previewUrl || "";
    const before =
      uploadedImage?.originalPreviewUrl ||
      originalUrl ||
      uploadedImage?.previewUrl ||
      previewUrl ||
      "";
    const isCanvas =
      uploadedImage?.source === "canvas" ||
      !!uploadedImage?.nodeId ||
      (uploadedImage?.source !== "upload" && selection.hasSelection);
    const nodeId =
      uploadedImage?.nodeId || (selection.hasSelection && selection.id ? selection.id : undefined);

    return {
      cutoutUrl: cutout,
      beforeUrl: before,
      isCanvasSelection: isCanvas,
      targetNodeId: nodeId,
      name: uploadedImage?.name || (selection.hasSelection ? selection.name : "cutout"),
      bytes: uploadedImage?.bytes,
      width: uploadedImage?.width || 800,
      height: uploadedImage?.height || 800,
    };
  });

  const isCanvasSelection = lockedItem.isCanvasSelection;
  const targetNodeId = lockedItem.targetNodeId;

  const [applyMode, setApplyMode] = useState<"new" | "replace">(
    isCanvasSelection ? "replace" : "new"
  );

  // Resolved URLs pinned from lockedItem
  const cutoutUrl = lockedItem.cutoutUrl;
  const beforeUrl = lockedItem.beforeUrl;
  const activeImageSrc = viewMode === "after" ? cutoutUrl : beforeUrl;

  const previewReturnSection = useAppSelector((s) => s.ui.previewReturnSection);

  // ── Back to Home or Batch Results ──
  const handleBackToHome = () => {
    dispatch(setSection(previewReturnSection || "features"));
  };

  // ── Open in Edit Studio ──
  const handleOpenEdit = () => {
    const name = lockedItem.name || "cutout";
    const width = lockedItem.width || 800;
    const height = lockedItem.height || 800;
    const bytes = lockedItem.bytes;

    dispatch(
      setEditingImage({
        id: `edit_${Date.now()}`,
        name,
        previewUrl: cutoutUrl,
        bytes,
        width,
        height,
      })
    );
    dispatch(setSection("edit_studio"));
  };

  // ── Add to Figma Canvas ──
  const handleAddToFigma = async () => {
    if (isInserting) return;
    setIsInserting(true);

    try {
      let bytesToInsert: Uint8Array | null = null;

      if (lockedItem.bytes && lockedItem.bytes.length > 0) {
        bytesToInsert = lockedItem.bytes;
      } else if (cutoutUrl) {
        // Fetch blob from object URL or data URL
        const resp = await fetch(cutoutUrl);
        const arrayBuf = await resp.arrayBuffer();
        bytesToInsert = new Uint8Array(arrayBuf);
      }

      if (bytesToInsert && bytesToInsert.length > 0) {
        bridge.insertResultImage({
          bytes: bytesToInsert,
          mode: applyMode,
          nodeId: targetNodeId,
        });

        dispatch(
          addToast({
            id: `toast_add_figma_${Date.now()}`,
            kind: "success",
            title: applyMode === "replace" ? "Layer replaced" : "Added to canvas",
            message:
              applyMode === "replace"
                ? "Replaced selected layer with background-removed result."
                : "Your cutout was placed on the Figma canvas.",
          })
        );
      } else {
        throw new Error("No image data available to insert");
      }
    } catch (err) {
      console.error("Failed to insert result image", err);
      dispatch(
        addToast({
          id: `toast_add_err_${Date.now()}`,
          kind: "error",
          title: "Couldn't place image",
          message: "An error occurred while inserting onto Figma canvas.",
        })
      );
    } finally {
      setIsInserting(false);
    }
  };

  return (
    <div className="v2-preview-screen">
      {/* ── Top Header ── */}
      <header className="v2-preview-header">
        <div className="v2-preview-header-left">
          <button
            type="button"
            className="v2-back-icon-btn"
            onClick={handleBackToHome}
            title="Back to home"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>
          <h1 className="v2-preview-title">Preview</h1>
        </div>

        <div className="v2-preview-credits-pill" title={`${spendable} credits available`}>
          <Zap size={13} className="v2-preview-credits-icon" />
          <span>{spendable}</span>
        </div>
      </header>

      {/* ── Main Body ── */}
      <div className="v2-preview-body">
        {/* Canvas Display Card */}
        <div className="v2-preview-canvas-card">
          {/* Floating Before / After Pill Toggle */}
          <div className="v2-preview-toggle-wrap">
            <button
              type="button"
              className={`v2-preview-toggle-btn ${viewMode === "before" ? "active" : ""}`}
              onClick={() => setViewMode("before")}
            >
              Before
            </button>
            <button
              type="button"
              className={`v2-preview-toggle-btn ${viewMode === "after" ? "active" : ""}`}
              onClick={() => setViewMode("after")}
            >
              After
            </button>
          </div>

          {/* Render Active Image */}
          {activeImageSrc ? (
            <img
              src={activeImageSrc}
              alt={viewMode === "after" ? "Cutout preview" : "Original preview"}
              className="v2-preview-image"
            />
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 12 }}>No preview available</div>
          )}
        </div>

        {/* Informative Notice Banner */}
        <div className="v2-preview-notice-banner">
          <Check size={14} className="v2-preview-notice-icon" />
          <span>Nothing changes on your canvas until you apply.</span>
        </div>
      </div>

      {/* ── Bottom Action Footer ── */}
      <footer className="v2-preview-action-footer">
        {/* Row 1: Like / Dislike Feedback (left) & [New layer | Replace] (right, flex-end) */}
        <div className="v2-preview-controls-row">
          <div className="v2-preview-feedback-group">
            <button
              type="button"
              className={`v2-preview-feedback-btn like-btn ${feedback === "like" ? "active" : ""}`}
              title="Good cutout"
              onClick={handleToggleLike}
            >
              <ThumbsUp size={15} fill={feedback === "like" ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              className={`v2-preview-feedback-btn dislike-btn ${
                feedback === "dislike" ? "active" : ""
              }`}
              title="Needs improvement"
              onClick={handleToggleDislike}
            >
              <ThumbsDown size={15} fill={feedback === "dislike" ? "currentColor" : "none"} />
            </button>
          </div>

          <div className="v2-preview-layer-mode-toggle">
            <button
              type="button"
              className={`v2-layer-mode-btn ${applyMode === "new" ? "active" : ""}`}
              onClick={() => setApplyMode("new")}
            >
              New layer
            </button>
            <button
              type="button"
              className={`v2-layer-mode-btn ${applyMode === "replace" ? "active" : ""}`}
              disabled={!isCanvasSelection}
              title={
                isCanvasSelection
                  ? "Replace original layer on canvas"
                  : "Replace is only available for layers selected from canvas"
              }
              onClick={() => isCanvasSelection && setApplyMode("replace")}
            >
              Replace
            </button>
          </div>
        </div>

        {/* Row 2: Edit Button (left) & Apply Button (right) */}
        <div className="v2-preview-buttons-row">
          <button
            type="button"
            className="v2-preview-edit-btn"
            onClick={handleOpenEdit}
          >
            <SlidersHorizontal size={14} />
            <span>Edit</span>
          </button>

          <button
            type="button"
            className="v2-preview-apply-btn"
            disabled={isInserting || !cutoutUrl}
            onClick={handleAddToFigma}
          >
            <Check size={15} strokeWidth={2.4} />
            <span>{isInserting ? "Applying…" : "Apply"}</span>
          </button>
        </div>
      </footer>

      {/* ── Community Review Bottom Sheet Modal (RemoveBG-15b) ── */}
      <CommunityReviewModal
        isOpen={showCommunityModal}
        onClose={() => setShowCommunityModal(false)}
        onLikeOnFigma={() => {
          setShowCommunityModal(false);
          bridge.openExternal(FIGMA_COMMUNITY_REVIEW_URL);
        }}
      />
    </div>
  );
}
