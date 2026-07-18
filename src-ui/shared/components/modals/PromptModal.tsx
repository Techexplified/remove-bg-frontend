import { useState } from "react";
import { X, Wand2, PenTool } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal } from "../../../app/slices/uiSlice";
import type { FeatureId } from "../../types/features";

interface Props { onSubmit: (featureId: FeatureId, prompt: string) => void; }

export function PromptModal({ onSubmit }: Props) {
  const dispatch = useAppDispatch();
  const modal = useAppSelector(s => s.ui.modal);
  const [prompt, setPrompt] = useState("");
  const isLogoMaker = modal.featureId === "ai_logo_maker";
  const placeholder = isLogoMaker 
    ? "e.g. minimalist mountain logo, blue and white" 
    : "e.g. a cup of coffee on a wooden table, soft morning light";

  function handleSubmit() {
    if (!prompt.trim() || !modal.featureId) return;
    onSubmit(modal.featureId, prompt.trim());
    dispatch(closeModal());
  }

  const charLimit = 1000;

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => dispatch(closeModal())}>
        <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()} style={{ maxWidth: 330 }}>
          <div className="modal-head" style={{ alignItems: "center", padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isLogoMaker ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #a855f7, #6c47ff)",
                color: "white",
                marginRight: 10,
                flexShrink: 0
              }}>
                {isLogoMaker ? <PenTool size={16} /> : <Wand2 size={16} />}
              </div>
              <div>
                <div className="modal-title" style={{ fontSize: 13.5 }}>
                  {isLogoMaker ? "AI Logo Maker" : "AI Image Generator"}
                </div>
                <div className="modal-sub">
                  Describe what you want to generate
                </div>
              </div>
            </div>
            <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
          </div>
          <div className="modal-body" style={{ gap: "12px", padding: "16px 18px" }}>
            <textarea 
              className="prompt-area" 
              placeholder={placeholder} 
              value={prompt}
              onChange={e => setPrompt(e.target.value.slice(0, charLimit))} 
              rows={4} 
              autoFocus
              style={{ minHeight: 96 }}
            />
            <div className="prompt-charcount">
              {prompt.length} / {charLimit}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--c-border)", paddingTop: "12px", marginTop: "2px" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(108, 71, 255, 0.08)",
                color: "var(--brand)",
                padding: "4.5px 10px",
                borderRadius: 100,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.3
              }}>
                ★ 5 credits
              </div>
              <button 
                className="btn btn-primary" 
                disabled={!prompt.trim()} 
                onClick={handleSubmit}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  boxShadow: !prompt.trim() ? "none" : "0 4px 12px rgba(108, 71, 255, 0.2)"
                }}
              >
                Generate
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
