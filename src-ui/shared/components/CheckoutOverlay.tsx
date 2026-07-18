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
              background: "#fff",
              borderRadius: "20px",
              padding: "32px 28px 28px",
              width: "260px",
              boxShadow: "0 24px 60px rgba(0,0,0,0.28)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
              position: "relative",
            }}
          >
            {/* Close button (always available) */}
            <button
              onClick={() => dispatch(setCheckoutOverlay({ visible: false, type: overlay.type, stage: overlay.stage }))}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                borderRadius: "6px",
              }}
            >
              <X size={15} />
            </button>

            {/* Icon */}
            <motion.div
              key={overlay.stage}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: isConfirmed ? "rgba(22,163,74,0.1)" : "rgba(108,71,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isVerifying && (
                <Loader2
                  size={28}
                  color="var(--brand)"
                  style={{ animation: "spin 0.9s linear infinite" }}
                />
              )}
              {isConfirmed && <CheckCircle size={28} color="#16a34a" />}
            </motion.div>

            {/* Text */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a2e", marginBottom: "6px" }}>
                {isVerifying
                  ? overlay.type === "topup"
                    ? "Adding Your Credits…"
                    : "Updating Your Plan…"
                  : overlay.type === "topup"
                    ? "Credits Added! 🎉"
                    : "Plan Updated! 🎉"}
              </div>
              <div style={{ fontSize: "11.5px", color: "#6b7280", lineHeight: "1.5" }}>
                {isVerifying
                  ? overlay.type === "topup"
                    ? "Verifying your purchase. This only takes a moment."
                    : "Processing your plan change. Please wait."
                  : overlay.message ?? (overlay.type === "topup"
                    ? "Your credits are ready to use."
                    : "Your new plan is now active.")}
              </div>
            </div>

            {/* Progress bar for verifying state */}
            {isVerifying && (
              <div style={{
                width: "100%",
                height: "3px",
                background: "rgba(108,71,255,0.12)",
                borderRadius: "100px",
                overflow: "hidden",
              }}>
                <motion.div
                  style={{
                    height: "100%",
                    background: "var(--brand)",
                    borderRadius: "100px",
                  }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}

            {/* Done button for confirmed */}
            {isConfirmed && (
              <motion.button
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => dispatch(setCheckoutOverlay({ visible: false, type: overlay.type, stage: overlay.stage }))}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "var(--brand)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Done
              </motion.button>
            )}

            <div style={{ fontSize: "10px", color: "#9ca3af" }}>
              You can close this at any time
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
