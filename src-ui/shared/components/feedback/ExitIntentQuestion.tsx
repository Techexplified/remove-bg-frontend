import { useState, useEffect } from "react";
import { X, Send } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { setShowExitIntent } from "../../../app/slices/uiSlice";
import { submitFeedback } from "../../api/client";
import type { FeatureId } from "../../types/api";

const OPTIONS: { id: FeatureId | "other"; label: string }[] = [
  { id: "ai_background", label: "AI Background" },
  { id: "ai_shadows", label: "AI Shadows" },
  { id: "hd_export", label: "HD Export" },
  { id: "other", label: "Other" },
];

export function ExitIntentQuestion() {
  const dispatch = useAppDispatch();
  const visible = useAppSelector(s => s.ui.showExitIntent);
  const status = useAppSelector(s => s.status.data);

  const [selected, setSelected] = useState<FeatureId | "other" | null>(null);
  const [otherText, setOtherText] = useState("");

  const dismiss = () => dispatch(setShowExitIntent(false));

  // Auto-dismiss after 4 seconds if no interaction
  useEffect(() => {
    if (!visible || selected !== null) return;
    const timer = setTimeout(() => {
      dismiss();
    }, 4000);
    return () => clearTimeout(timer);
  }, [visible, selected]);

  if (!visible || !status?.feedbackPromptsEnabled) return null;

  async function handleOptionTap(id: FeatureId | "other") {
    setSelected(id);
    if (id !== "other") {
      try {
        await submitFeedback({
          type: "paywall_exit_interest",
          feature: id,
        });
      } catch (err) {
        // Silently handle
      }
      setTimeout(() => dismiss(), 800);
    }
  }

  async function handleOtherSubmit() {
    try {
      await submitFeedback({
        type: "paywall_exit_interest",
        feature: "other",
        other_text: otherText.trim() || undefined,
      });
    } catch (err) {
      // Silently handle
    }
    dismiss();
  }

  return (
    <div className="exit-intent">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div className="exit-intent-title" style={{ margin: 0 }}>
          Before you go — which feature interests you most?
        </div>
        <button
          onClick={dismiss}
          style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: 2 }}
        >
          <X size={13} />
        </button>
      </div>

      <div className="exit-intent-chips">
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            className={`exit-intent-chip ${selected === opt.id ? "selected" : ""}`}
            onClick={() => handleOptionTap(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {selected === "other" && (
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <input
            type="text"
            className="exit-intent-other"
            placeholder="Tell us what feature you need…"
            value={otherText}
            onChange={e => setOtherText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleOtherSubmit()}
            autoFocus
          />
          <button
            className="exit-intent-chip selected"
            onClick={handleOtherSubmit}
            style={{ marginTop: 8, padding: "6px 10px" }}
          >
            <Send size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
