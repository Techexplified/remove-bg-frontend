import { useState, useEffect } from "react";
import { ChevronLeft, CheckCircle, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { useAppDispatch } from "../../app/hooks";
import { setSection, addToast } from "../../app/slices/uiSlice";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import "../../shared/styles/v2/playground.css";

type Stage = "verifying" | "confirmed";

export function PlaygroundScreen() {
  const dispatch = useAppDispatch();
  const bridge = usePluginBridgeContext();

  const [stage, setStage] = useState<Stage>("verifying");
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-manage window width for comfortable side-by-side comparison
  const handleToggleExpand = () => {
    if (!isExpanded) {
      bridge.resizeWindow(680, 700);
      setIsExpanded(true);
    } else {
      bridge.resizeWindow(400, 700);
      setIsExpanded(false);
    }
  };

  // Restore normal window size on exit
  const handleBackToHome = () => {
    if (isExpanded) {
      bridge.resizeWindow(400, 700);
    }
    dispatch(setSection("features"));
  };

  useEffect(() => {
    return () => {
      bridge.resizeWindow(400, 700);
    };
  }, [bridge]);

  return (
    <div className="v2-playground-screen">
      {/* ── Top Header ── */}
      <header className="v2-playground-header">
        <div className="v2-playground-header-left">
          <button
            type="button"
            className="v2-playground-back-btn"
            onClick={handleBackToHome}
            title="Back to Home"
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
          </button>
          <div>
            <h1 className="v2-playground-title">Payment Transition Playground</h1>
            <span className="v2-playground-subtitle">Free → Starter Upgrade Experience</span>
          </div>
        </div>

        <button
          type="button"
          className="v2-playground-expand-btn"
          onClick={handleToggleExpand}
          title={isExpanded ? "Collapse to 400px" : "Expand to 680px for Side-by-Side"}
        >
          {isExpanded ? (
            <>
              <Minimize2 size={13} strokeWidth={2.2} />
              <span>400px</span>
            </>
          ) : (
            <>
              <Maximize2 size={13} strokeWidth={2.2} />
              <span>Side-by-Side (680px)</span>
            </>
          )}
        </button>
      </header>

      {/* ── Top State Switcher Controls ── */}
      <div className="v2-playground-controls-bar">
        <span className="v2-playground-controls-label">Simulate State:</span>
        <div className="v2-playground-stage-pills">
          <button
            type="button"
            className={`v2-playground-pill ${stage === "verifying" ? "active" : ""}`}
            onClick={() => setStage("verifying")}
          >
            <Loader2 size={12} className={stage === "verifying" ? "v2-spin" : ""} />
            <span>1. Verifying / Processing</span>
          </button>
          <button
            type="button"
            className={`v2-playground-pill ${stage === "confirmed" ? "active" : ""}`}
            onClick={() => setStage("confirmed")}
          >
            <CheckCircle size={12} />
            <span>2. Payment Successful</span>
          </button>
        </div>
      </div>

      {/* ── 2-Column Comparison Body ── */}
      <div className="v2-playground-body">
        <div className="v2-playground-grid">
          {/* ═════════ LEFT COLUMN: Current Checkout UI (Exact from CheckoutOverlay.tsx) ═════════ */}
          <div className="v2-playground-col">
            <div className="v2-playground-col-header">
              <div className="v2-playground-col-badge v2-badge-current">Current Design</div>
              <span className="v2-playground-col-desc">Exact UI from CheckoutOverlay.tsx</span>
            </div>

            <div className="v2-playground-card-container v2-playground-overlay-backdrop">
              {/* Exact card structure from CheckoutOverlay.tsx */}
              <div className="v2-exact-checkout-card">
                {/* Header */}
                <div className="v2-exact-header">
                  Top Up
                </div>

                {/* Animated Icon */}
                <div className="v2-exact-icon-wrap">
                  {stage === "verifying" && (
                    <Loader2
                      size={28}
                      color="#6c47ff"
                      className="v2-spin"
                    />
                  )}
                  {stage === "confirmed" && (
                    <CheckCircle size={32} color="#6c47ff" />
                  )}
                </div>

                {/* Text Info */}
                <div className="v2-exact-text-wrap">
                  <div className="v2-exact-title">
                    {stage === "verifying" ? "Processing Payment…" : "Payment Successful!"}
                  </div>
                  <div className="v2-exact-subtitle">
                    {stage === "verifying" ? "Verifying transaction..." : "Added 50 credits to your account."}
                  </div>
                </div>

                {/* Balance Summary Box (Shown on Confirmed) */}
                {stage === "confirmed" && (
                  <div className="v2-exact-balance-box">
                    <div className="v2-exact-balance-row">
                      <span>Previous Balance</span>
                      <span className="v2-exact-bold">34</span>
                    </div>
                    <div className="v2-exact-balance-row">
                      <span>Credits Added</span>
                      <span className="v2-exact-brand-bold">+50</span>
                    </div>
                    <div className="v2-exact-divider" />
                    <div className="v2-exact-balance-row v2-exact-new-balance">
                      <span>New Balance</span>
                      <span className="v2-exact-big-number">84</span>
                    </div>
                  </div>
                )}

                {/* Transaction Ref */}
                {stage === "confirmed" && (
                  <div className="v2-exact-ref-text">
                    Transaction Ref: ZBG-502931-TX
                  </div>
                )}

                {/* Interactive Action Buttons */}
                {stage === "confirmed" && (
                  <div className="v2-exact-actions-row">
                    <button
                      type="button"
                      className="v2-exact-btn-primary"
                      onClick={() =>
                        dispatch(
                          addToast({
                            id: `toast_back_${Date.now()}`,
                            kind: "info",
                            title: "Action clicked",
                            message: "Back to Home button clicked.",
                          })
                        )
                      }
                    >
                      Back to Home
                    </button>
                    <button
                      type="button"
                      className="v2-exact-btn-secondary"
                      onClick={() =>
                        dispatch(
                          addToast({
                            id: `toast_receipt_${Date.now()}`,
                            kind: "info",
                            title: "Action clicked",
                            message: "View Receipt button clicked.",
                          })
                        )
                      }
                    >
                      View Receipt
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═════════ RIGHT COLUMN: New V2 Redesign Preview ═════════ */}
          <div className="v2-playground-col">
            <div className="v2-playground-col-header">
              <div className="v2-playground-col-badge v2-badge-next">New V2 Redesign</div>
              <span className="v2-playground-col-desc">Updated UI Preview</span>
            </div>

            <div className="v2-playground-card-container v2-playground-overlay-backdrop">
              <div className="v2-redesign-checkout-card">
                {/* Notice: Top Up corner header is COMPLETELY REMOVED! */}

                {/* Animated Icon */}
                {stage === "verifying" ? (
                  <div className="v2-redesign-spinner-wrap">
                    <div className="v2-redesign-spinner-ring" />
                  </div>
                ) : (
                  <div className="v2-redesign-success-icon-wrap">
                    <CheckCircle size={32} strokeWidth={2.4} className="v2-redesign-check-icon" />
                  </div>
                )}

                {/* Text Info */}
                <div className="v2-redesign-text-wrap">
                  <div className="v2-redesign-title">
                    {stage === "verifying" ? "Processing Payment…" : "Payment Successful!"}
                  </div>
                  <div className="v2-redesign-subtitle">
                    {stage === "verifying"
                      ? "Verifying transaction..."
                      : "Starter plan activated · 50 credits added to your account."}
                  </div>
                </div>

                {/* Balance Summary Box & Footer (Shown on Confirmed) */}
                {stage === "confirmed" && (
                  <>
                    <div className="v2-redesign-balance-box">
                      <div className="v2-redesign-balance-row">
                        <span>Previous Balance</span>
                        <span className="v2-redesign-num-muted">0</span>
                      </div>
                      <div className="v2-redesign-balance-row">
                        <span>Credits Added</span>
                        <span className="v2-redesign-num-highlight">+50</span>
                      </div>
                      <div className="v2-redesign-divider" />
                      <div className="v2-redesign-balance-row v2-redesign-new-balance">
                        <span className="v2-redesign-total-label">New Balance</span>
                        <span className="v2-redesign-big-number">50</span>
                      </div>
                    </div>

                    <div className="v2-redesign-ref-text">
                      Transaction Ref: <span className="v2-mono-ref">ZBG-502931-TX</span>
                    </div>

                    {/* Interactive Action Buttons (Pure preview with visual states, no disruptive navigation) */}
                    <div className="v2-redesign-actions-row">
                      <button
                        type="button"
                        className="v2-redesign-btn-primary"
                        onClick={(e) => e.preventDefault()}
                      >
                        Back to Home
                      </button>
                      <button
                        type="button"
                        className="v2-redesign-btn-secondary"
                        onClick={(e) => e.preventDefault()}
                      >
                        View Receipt
                      </button>
                    </div>

                    {/* Footer Info Notice */}
                    <div className="v2-redesign-footer-note">
                      Receipt sent to your billing email · View invoices in Account
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
