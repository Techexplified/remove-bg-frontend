import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setCheckoutOverlay, setSection } from "../../app/slices/uiSlice";

export function CheckoutOverlay() {
  const dispatch = useAppDispatch();
  const overlay = useAppSelector(s => s.ui.checkoutOverlay);
  const status = useAppSelector(s => s.status.data);

  if (!overlay.visible) return null;

  const isVerifying = overlay.stage === "verifying";
  const isConfirmed = overlay.stage === "confirmed";

  // Dynamic balance calculations based on user status and purchase type
  const currentCredits = status?.credits ?? 50;
  const addedCredits = overlay.type === "plan" ? (status?.plan === "pro" ? 250 : 50) : 50;
  const previousCredits = Math.max(0, currentCredits - addedCredits);

  const handleBackToHome = () => {
    dispatch(setCheckoutOverlay({ visible: false, type: overlay.type, stage: overlay.stage }));
    dispatch(setSection("features"));
  };

  const handleViewReceipt = () => {
    dispatch(setCheckoutOverlay({ visible: false, type: overlay.type, stage: overlay.stage }));
    dispatch(setSection("account"));
  };

  return (
    <AnimatePresence>
      {overlay.visible && (
        <motion.div
          key="checkout-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
          }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="checkout-overlay-card"
          >
            {/* Animated Icon */}
            {isVerifying ? (
              <div className="checkout-spinner-wrap">
                <div className="checkout-spinner-ring" />
              </div>
            ) : (
              <motion.div
                key="confirmed-icon"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="checkout-success-icon-wrap"
              >
                <CheckCircle size={32} strokeWidth={2.4} className="checkout-check-icon" />
              </motion.div>
            )}

            {/* Text Information */}
            <div className="checkout-text-wrap">
              <div className="checkout-title">
                {isVerifying ? "Processing Payment…" : "Payment Successful!"}
              </div>
              <div className="checkout-subtitle">
                {isVerifying
                  ? "Verifying transaction..."
                  : overlay.type === "plan"
                  ? `${status?.plan === "pro" ? "Pro" : "Starter"} plan activated · ${addedCredits} credits added to your account.`
                  : `Added ${addedCredits} credits to your account.`}
              </div>
            </div>

            {/* Balance Summary Box & Actions (Shown on Confirmed) */}
            {isConfirmed && (
              <>
                <div className="checkout-balance-box">
                  <div className="checkout-balance-row">
                    <span>Previous Balance</span>
                    <span className="checkout-num-muted">{previousCredits}</span>
                  </div>
                  <div className="checkout-balance-row">
                    <span>Credits Added</span>
                    <span className="checkout-num-highlight">+{addedCredits}</span>
                  </div>
                  <div className="checkout-divider" />
                  <div className="checkout-balance-row">
                    <span className="checkout-total-label">New Balance</span>
                    <span className="checkout-big-number">{currentCredits}</span>
                  </div>
                </div>

                {/* Transaction Ref */}
                <div className="checkout-ref-text">
                  Transaction Ref: <span className="checkout-mono-ref">ZBG-502931-TX</span>
                </div>

                {/* Action Buttons */}
                <div className="checkout-actions-row">
                  <button
                    type="button"
                    className="checkout-btn-primary"
                    onClick={handleBackToHome}
                  >
                    Back to Home
                  </button>
                  <button
                    type="button"
                    className="checkout-btn-secondary"
                    onClick={handleViewReceipt}
                  >
                    View Receipt
                  </button>
                </div>

                {/* Footer Notice */}
                <div className="checkout-footer-note">
                  Receipt sent to your billing email · View invoices in Account
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
