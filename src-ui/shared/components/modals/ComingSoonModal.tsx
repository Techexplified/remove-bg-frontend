import { X, Sparkles, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch } from "../../../app/hooks";
import { closeModal } from "../../../app/slices/uiSlice";

export function ComingSoonModal() {
  const dispatch = useAppDispatch();
  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => dispatch(closeModal())}>
        <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()} style={{ maxWidth: 330, overflow: "hidden" }}>
          
          {/* Top visual banner with brand gradient */}
          <div style={{
            height: 80,
            background: "linear-gradient(135deg, #8b6dff, #6c47ff)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white"
          }}>
            <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ 
              position: "absolute", 
              top: 10, 
              right: 10, 
              color: "rgba(255, 255, 255, 0.75)",
              background: "rgba(255, 255, 255, 0.15)",
              borderRadius: "50%",
              width: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}><X size={14} /></button>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Sparkles size={20} />
            </div>
          </div>

          <div className="modal-body" style={{ padding: "20px 18px", gap: "16px", textAlign: "center" }}>
            <div>
              <div style={{ 
                fontSize: 15, 
                fontWeight: 800, 
                color: "var(--c-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6
              }}>
                <Lock size={14} style={{ color: "var(--brand)" }} /> Pro Features Coming Soon
              </div>
              <div className="modal-sub" style={{ fontSize: 11, color: "var(--c-text-3)", marginTop: 6, lineHeight: 1.5 }}>
                Advanced features, subscriptions, and top-up packs are currently in private preview. We are polishing them to guarantee peak performance.
              </div>
            </div>

            {/* List of locked items */}
            <div style={{
              background: "var(--c-bg-2)",
              border: "1.5px solid var(--c-border)",
              borderRadius: 12,
              padding: "12px 14px",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 8
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-text-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Coming Soon:</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, color: "var(--c-text-2)" }}>
                <div>🔒 Pro Plan Subscription</div>
                <div>🔒 Pro Top-Up Credit Packs</div>
                <div>🔒 AI Background & AI Shadows</div>
                <div>🔒 AI Relighting, AI Upscale, HD Export</div>
                <div>🔒 AI Image Generator & Logo Maker</div>
              </div>
            </div>

            {/* What is available now */}
            <div style={{ fontSize: 10.5, color: "var(--brand)", fontWeight: 600, background: "rgba(108, 71, 255, 0.06)", padding: "8px 12px", borderRadius: 8, lineHeight: 1.6 }}>
              ✅ Starter plan, Remove Background, Crop & Resize, Color Fill — all fully active now!
            </div>

            <button className="btn btn-primary btn-block" onClick={() => dispatch(closeModal())} style={{
              height: 38,
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700
            }}>
              Got it
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
