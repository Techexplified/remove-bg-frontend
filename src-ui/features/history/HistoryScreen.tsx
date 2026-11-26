import { useState } from "react";
import { ChevronLeft, X, Lock, Plus, Edit2, Clock, Loader2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setSection, addToast } from "../../app/slices/uiSlice";
import { setEditingImage } from "../../app/slices/figmaSlice";
import type { HistoryMetaItem } from "../../shared/types/messages";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import "../../shared/styles/v2/history.css";

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HistoryScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();

  const items = useAppSelector((s) => s.figma.historyItems);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"figma" | "edit" | null>(null);

  const handleBackToHome = () => {
    dispatch(setSection("features"));
  };

  // ── Action 1: Add to Figma Canvas ──
  const handleAddToFigma = async (item: HistoryMetaItem) => {
    if (actionInProgressId) return;
    setActionInProgressId(item.id);
    setActionType("figma");

    try {
      const bytes = await bridge.getHistoryItemBytes(item.id, item.thumbnailDataUrl);
      if (!bytes || bytes.length === 0) {
        throw new Error("Could not load cutout bytes");
      }

      bridge.insertResultImage({ bytes, mode: "new" });
      dispatch(
        addToast({
          id: `toast_hist_add_${Date.now()}`,
          kind: "success",
          title: "Added to Figma",
          message: `Placed "${item.name}" on canvas.`,
        })
      );
    } catch (err) {
      console.warn("Failed to insert history image to Figma canvas:", err);
      dispatch(
        addToast({
          id: `toast_hist_err_${Date.now()}`,
          kind: "error",
          title: "Insert failed",
          message: "Failed to place cutout on canvas.",
        })
      );
    } finally {
      setActionInProgressId(null);
      setActionType(null);
    }
  };

  // ── Action 2: Open in Plugin (Edit Studio) ──
  const handleOpenInPlugin = async (item: HistoryMetaItem) => {
    if (actionInProgressId) return;
    setActionInProgressId(item.id);
    setActionType("edit");

    try {
      const bytes = await bridge.getHistoryItemBytes(item.id, item.thumbnailDataUrl);
      if (!bytes || bytes.length === 0) {
        throw new Error("Could not load cutout bytes");
      }

      const blob = new Blob([bytes as unknown as BlobPart], { type: "image/png" });
      const dedicatedUrl = URL.createObjectURL(blob);

      dispatch(
        setEditingImage({
          id: item.id,
          name: item.name,
          previewUrl: dedicatedUrl,
          bytes,
          width: item.width,
          height: item.height,
        })
      );

      dispatch(setSection("edit_studio"));
    } catch (err) {
      console.warn("Failed to open history item in Edit Studio:", err);
      dispatch(
        addToast({
          id: `toast_hist_edit_err_${Date.now()}`,
          kind: "error",
          title: "Open failed",
          message: "Could not open cutout in Edit Studio.",
        })
      );
    } finally {
      setActionInProgressId(null);
      setActionType(null);
    }
  };

  // ── Delete single item (✕) ──
  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    bridge.deleteHistoryItem(id);
  };

  // ── Global Clear All ──
  const handleConfirmClearAll = () => {
    setShowClearConfirm(false);
    bridge.clearAllHistory();
    dispatch(
      addToast({
        id: `toast_clear_hist_${Date.now()}`,
        kind: "info",
        title: "History cleared",
        message: "All saved cutouts were deleted.",
      })
    );
  };

  return (
    <div className="v2-history-screen">
      {/* ── Top Header ── */}
      <header className="v2-history-header">
        <div className="v2-history-header-left">
          <button
            type="button"
            className="v2-history-back-btn"
            onClick={handleBackToHome}
            title="Back to Home"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
          <div className="v2-history-title-wrap">
            <h1 className="v2-history-title">History</h1>
          </div>
        </div>

        <button
          type="button"
          className="v2-history-clear-btn"
          disabled={items.length === 0}
          onClick={() => setShowClearConfirm(true)}
        >
          Clear all
        </button>
      </header>

      {/* ── Scrollable Body Area ── */}
      <div className="v2-history-body">
        {items.length === 0 ? (
          /* Minimalist Empty State (Text in the middle with icon, no button) */
          <div className="v2-history-empty">
            <div className="v2-history-empty-icon">
              <Clock size={24} strokeWidth={2} />
            </div>
            <h3 className="v2-history-empty-title">No history yet</h3>
            <p className="v2-history-empty-desc">
              Cutouts you remove will automatically appear here for easy reuse and editing.
            </p>
          </div>
        ) : (
          /* 2-Column Responsive Card Grid */
          <div className="v2-history-grid">
            {items.map((item) => {
              const isWorking = actionInProgressId === item.id;
              const timeAgo = formatRelativeTime(item.timestamp);

              return (
                <div key={item.id} className="v2-history-card">
                  {/* Thumbnail Box */}
                  <div className="v2-history-thumb-box">
                    <img
                      src={item.thumbnailDataUrl}
                      alt={item.name}
                      className="v2-history-thumb-img"
                    />

                    {/* Top-Right Delete Icon (✕) */}
                    <button
                      type="button"
                      className="v2-history-delete-btn"
                      title="Delete this cutout"
                      disabled={isWorking}
                      onClick={(e) => handleDeleteItem(item.id, e)}
                    >
                      <X size={12} strokeWidth={2.6} />
                    </button>

                    {/* Lazy-Loading Visual Overlay */}
                    {isWorking && (
                      <div className="v2-history-thumb-loading-overlay">
                        <Loader2 size={20} className="v2-spin" />
                        <span className="v2-history-loading-text">Loading...</span>
                      </div>
                    )}
                  </div>

                  {/* Card Metadata */}
                  <div className="v2-history-meta">
                    <span className="v2-history-item-name" title={item.name}>
                      {item.name}
                    </span>
                    <span className="v2-history-item-sub">
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                      {timeAgo}
                    </span>
                  </div>

                  {/* 2 Action Buttons Row Below Image */}
                  <div className="v2-history-actions-row">
                    <button
                      type="button"
                      className="v2-history-btn-figma"
                      disabled={isWorking}
                      onClick={() => handleAddToFigma(item)}
                      title="Add cutout directly onto Figma canvas"
                    >
                      {isWorking && actionType === "figma" ? (
                        <>
                          <Loader2 size={11} className="v2-spin" />
                          <span>Adding...</span>
                        </>
                      ) : (
                        <>
                          <Plus size={11} strokeWidth={2.8} />
                          <span>Figma</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="v2-history-btn-edit"
                      disabled={isWorking}
                      onClick={() => handleOpenInPlugin(item)}
                      title="Open cutout in Edit Studio"
                    >
                      {isWorking && actionType === "edit" ? (
                        <>
                          <Loader2 size={11} className="v2-spin" />
                          <span>Opening...</span>
                        </>
                      ) : (
                        <>
                          <Edit2 size={11} strokeWidth={2.4} />
                          <span>Edit</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sticky Privacy Footer ── */}
      <footer className="v2-history-footer">
        <Lock size={12} className="v2-history-footer-lock" />
        <span className="v2-history-footer-text">
          Stored locally on this device · Never uploaded to servers
        </span>
      </footer>

      {/* ── Global Clear Confirmation Modal ── */}
      {showClearConfirm && (
        <div
          className="v2-history-modal-overlay"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="v2-history-confirm-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="v2-history-confirm-title">Clear all history?</h3>
            <p className="v2-history-confirm-desc">
              This will permanently delete all {items.length} saved cutouts from this device.
            </p>
            <div className="v2-history-confirm-actions">
              <button
                type="button"
                className="v2-history-btn-cancel"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="v2-history-btn-confirm-delete"
                onClick={handleConfirmClearAll}
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
