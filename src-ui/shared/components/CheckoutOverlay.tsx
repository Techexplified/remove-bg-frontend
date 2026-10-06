import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { setCheckoutOverlay } from "../../app/slices/uiSlice";

export function CheckoutOverlay() {
  const dispatch = useAppDispatch();
  const overlay = useAppSelector(s => s.ui.checkoutOverlay);

  if (!overlay.visible) return null;

  const isVerifying = overlay.stage === "verifying";
  const isConfirmed = overlay.stage === "confirmed";

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
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--c-border-2)",
              borderRadius: "20px",
              padding: "24px 20px",
              width: "280px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "14px",
              position: "relative",
            }}
          >
            {/* Header */}
            <div style={{ width: "100%", textAlign: "left", fontSize: "14px", fontWeight: "800", color: "var(--c-text)" }}>
              Top Up
            </div>

            {/* Icon */}
            <motion.div
              key={overlay.stage}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                background: "rgba(108, 71, 255, 0.12)",
                border: "2px solid var(--brand)",
                boxShadow: "0 0 20px rgba(108, 71, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "4px 0",
              }}
            >
              {isVerifying && (
                <Loader2
                  size={28}
                  color="var(--brand)"
                  style={{ animation: "spin 0.9s linear infinite" }}
                />
              )}
              {isConfirmed && <CheckCircle size={32} color="var(--brand)" />}
            </motion.div>

            {/* Text */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--c-text)", marginBottom: "4px" }}>
                {isVerifying ? "Processing Payment…" : "Payment Successful!"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--c-text-3)" }}>
                {isVerifying ? "Verifying transaction..." : "Added 50 credits to your account."}
              </div>
            </div>

            {/* Balance Summary Box */}
            {isConfirmed && (
              <div style={{ width: "100%", background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: "12px", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--c-text-3)" }}>
                  <span>Previous Balance</span>
                  <span style={{ fontWeight: "700", color: "var(--c-text)" }}>34</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--c-text-3)" }}>
                  <span>Credits Added</span>
                  <span style={{ fontWeight: "700", color: "var(--brand)" }}>+50</span>
                </div>
                <div style={{ height: "1px", background: "var(--c-border)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--c-text)" }}>New Balance</span>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--brand)" }}>84</span>
                </div>
              </div>
            )}

            {/* Transaction Ref */}
            {isConfirmed && (
              <div style={{ fontSize: "9.5px", color: "var(--c-text-4)", fontFamily: "monospace" }}>
                Transaction Ref: ZBG-502931-TX
              </div>
            )}

            {/* Buttons for confirmed */}
            {isConfirmed && (
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  className="cta-btn"
                  style={{ height: "40px", marginBottom: 0 }}
                  onClick={() => dispatch(setCheckoutOverlay({ visible: false, type: overlay.type, stage: overlay.stage }))}
                >
                  Back to Home
                </button>
                <button
                  className="btn btn-block"
                  style={{ height: "38px", borderRadius: "12px", background: "var(--c-bg-2)", border: "1px solid var(--brand)", color: "var(--brand)", fontWeight: "700" }}
                  onClick={() => dispatch(setCheckoutOverlay({ visible: false, type: overlay.type, stage: overlay.stage }))}
                >
                  View Receipt
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
