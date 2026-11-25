import { useState } from "react";
import { X, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal, setShowExitIntent } from "../../../app/slices/uiSlice";
import { initCheckout } from "../../../app/slices/statusSlice";

interface Props {
  onCheckoutOpen: (url: string, type: "plan") => void;
  onScheduled: (msg: string) => void;
}

function fmtDate(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PlanPickerModal({ onCheckoutOpen, onScheduled }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);
  const modalContext = useAppSelector(s => s.ui.modal.context);
  const activeSection = useAppSelector(s => s.ui.activeSection);
  const isHomeScreen = activeSection === "features";
  const isEditStudio = activeSection === "edit_studio";
  const isSettingsScreen = activeSection === "settings";
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<"starter" | "pro" | null>(null);
  const plan = status?.plan ?? "free";
  const isCancelling = !!status?.scheduledCancelAt;
  const isDowngradeScheduled = status?.scheduledPlanChange === "starter";
  const renewLabel = fmtDate(status?.subscriptionEndsAt);

  const spendable = !status
    ? 0
    : status.credits + (status.plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter);
  const isOutOfCredits = spendable === 0;
  const effectiveContext = modalContext ?? (isOutOfCredits ? "out_of_credits" : "upgrade");
  const isCase3 = effectiveContext === "apply_premium";
  const isUpgrade = effectiveContext === "upgrade";

  const overlayStyle: React.CSSProperties | undefined = isHomeScreen
    ? {
        top: 52,
        bottom: 76,
        height: "auto",
      }
    : isEditStudio
    ? {
        top: 52,
        bottom: 60,
        height: "auto",
      }
    : isSettingsScreen
    ? {
        top: 52,
        bottom: 0,
        height: "auto",
      }
    : undefined;

  const title = isCase3
    ? "Unlock Background & Resize"
    : isUpgrade
    ? "Upgrade your plan"
    : "You've used all 3 images";

  const subtitle = isCase3
    ? "Upgrade to Starter to apply custom backgrounds and resizing."
    : isUpgrade
    ? "Take your workflow further with Starter."
    : "Your cutouts are safe in History.";

  function handleDismiss() {
    dispatch(closeModal());
    dispatch(setShowExitIntent(true));
  }

  function handleApplyFreeEditsOnly() {
    dispatch(closeModal());
    window.dispatchEvent(new CustomEvent("apply-free-edits-only"));
  }

  async function handleChoose(planId: "starter" | "pro") {
    setIsLoading(true);
    setLoadingPlan(planId);
    try {
      const r = await dispatch(initCheckout(planId)).unwrap();
      if (r.kind === "redirect") {
        dispatch(closeModal());
        onCheckoutOpen(r.checkoutUrl, "plan");
      } else if (r.kind === "changed_in_place") {
        dispatch(closeModal());
        onScheduled(r.message ?? `Upgraded to ${planId === "pro" ? "Pro" : "Starter"}! Credits updated.`);
      } else if (r.kind === "scheduled") {
        dispatch(closeModal());
        onScheduled(r.message ?? `Downgrade scheduled. Pro access continues until ${renewLabel}.`);
      }
    } catch {
      // Toast handles error
    } finally {
      setIsLoading(false);
      setLoadingPlan(null);
    }
  }

  // ─── State: Downgrade scheduled (Pro → Starter scheduled)
  if (isDowngradeScheduled && !isCancelling) {
    return (
      <AnimatePresence>
        <motion.div className="modal-overlay" style={overlayStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => dispatch(closeModal())}>
          <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()} style={{ maxWidth: 330 }}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Manage Plan</div>
                <div className="modal-sub">Downgrade scheduled for next renewal</div>
              </div>
              <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ gap: "12px" }}>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px", display: "flex", gap: "8px", fontSize: "11px", color: "#1e3a8a", lineHeight: "1.5" }}>
                <Calendar size={14} style={{ flexShrink: 0, marginTop: "1px", color: "#2563eb" }} />
                <div>
                  <strong>Switching to Starter {renewLabel ? `on ${renewLabel}` : "at next renewal"}</strong>
                  <div style={{ marginTop: "4px", color: "#1e40af" }}>Pro access continues until then.</div>
                  {(status?.topupCreditsPro ?? 0) > 0 && (
                    <div style={{ marginTop: "6px", color: "#1e40af", fontSize: "10.5px" }}>
                      Your {status!.topupCreditsPro} Pro top-up credits will move to your Starter pool when the change takes effect.
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => dispatch(closeModal())} style={{ width: "100%", background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)", padding: "10px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── State: Pro user, no downgrade — show downgrade option
  if (plan === "pro" && !isCancelling) {
    return (
      <AnimatePresence>
        <motion.div className="modal-overlay" style={overlayStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => dispatch(closeModal())}>
          <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()} style={{ maxWidth: 330 }}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Manage Plan</div>
                <div className="modal-sub">You're on the Pro plan</div>
              </div>
              <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ gap: "12px" }}>
              {/* Current plan info */}
              <div style={{ background: "var(--c-bg-2)", borderRadius: "12px", border: "1px solid var(--c-border)", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", padding: "3px 9px", background: "rgba(108,71,255,.08)", borderRadius: "100px", color: "var(--brand)", textTransform: "uppercase" }}>★ Pro Plan</span>
                  <span style={{ fontSize: "11px", color: "var(--c-text-2)" }}>$39/month</span>
                </div>
                <div style={{ fontSize: "10.5px", color: "var(--c-text-3)", lineHeight: "1.5" }}>
                  Renews {renewLabel ?? "next billing date"} · 300 credits/month
                </div>
              </div>

              {/* Downgrade option */}
              <div style={{ border: "1px solid var(--c-border)", borderRadius: "12px", padding: "14px", background: "var(--c-bg)", cursor: "pointer" }}
                onClick={() => !isLoading && handleChoose("starter")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "var(--c-text)" }}>Downgrade to Starter</div>
                    <div style={{ fontSize: "10.5px", color: "var(--c-text-3)", marginTop: "3px" }}>$5/month · 50 images/month</div>
                    <div style={{ fontSize: "10px", color: "var(--c-text-3)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Calendar size={10} /> Effective at end of current billing period
                    </div>
                  </div>
                  {loadingPlan === "starter" ? (
                    <div style={{ width: "14px", height: "14px", border: "2px solid var(--c-border)", borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  ) : (
                    <ChevronRight size={14} color="var(--c-text-3)" />
                  )}
                </div>
              </div>

              <div style={{ background: "rgba(220,38,38,.05)", border: "1px solid rgba(220,38,38,.12)", color: "#f87171", padding: "10px 12px", borderRadius: "10px", display: "flex", gap: "8px", fontSize: "10.5px", lineHeight: "1.4" }}>
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "1px", color: "#dc2626" }} />
                <span>Downgrading will limit you to Basic features only. AI features require Pro.</span>
              </div>

              <button onClick={() => dispatch(closeModal())} style={{ width: "100%", background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)", padding: "10px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                Keep Pro
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── State: Starter user
  if (plan === "starter" && !isCancelling) {
    return (
      <AnimatePresence>
        <motion.div className="modal-overlay" style={overlayStyle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => dispatch(closeModal())}>
          <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()} style={{ maxWidth: 330 }}>
            <div className="modal-head">
              <div>
                <div className="modal-title">Your Plan</div>
                <div className="modal-sub">You're on the Starter plan</div>
              </div>
              <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ gap: "12px" }}>
              <div style={{ background: "var(--c-bg-2)", borderRadius: "12px", border: "1px solid var(--c-border)", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "10px", fontWeight: "700", padding: "3px 9px", background: "rgba(108,71,255,.08)", borderRadius: "100px", color: "var(--brand)", textTransform: "uppercase" }}>★ Starter Plan</span>
                  <span style={{ fontSize: "11px", color: "var(--c-text-2)" }}>$5/month</span>
                </div>
                <div style={{ fontSize: "10.5px", color: "var(--c-text-3)", lineHeight: "1.5" }}>
                  Renews {renewLabel ?? "next billing date"} · 50 images/month
                </div>
              </div>
              <button onClick={() => dispatch(closeModal())} style={{ width: "100%", background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)", padding: "10px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── State: Free user — wireframe Starter card dialog
  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        style={overlayStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleDismiss}
      >
        <motion.div
          className="modal"
          initial={{ scale: 0.94, y: 4 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.94, y: 4 }}
          onClick={e => e.stopPropagation()}
          style={{
            position: "relative",
            maxWidth: 324,
            width: "calc(100% - 32px)",
            background: "#ffffff",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            borderRadius: "16px",
            padding: "22px 18px 18px",
          }}
        >
          {/* Top-level Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              position: "absolute",
              top: "13px",
              right: "13px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#64748b",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "color 0.15s ease",
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* Centered Global Header */}
          <div style={{ textAlign: "center", marginBottom: "16px", padding: "0 14px" }}>
            <div style={{
              fontSize: "17px",
              fontWeight: "800",
              color: "#0f172a",
              fontFamily: "'Manrope', sans-serif",
              lineHeight: "1.25"
            }}>
              {title}
            </div>
            <div style={{
              marginTop: "4px",
              fontSize: "12.5px",
              fontWeight: "500",
              color: "#64748b",
              fontFamily: "'DM Sans', sans-serif"
            }}>
              {subtitle}
            </div>
          </div>

          {/* Starter Card */}
          <div style={{
            border: "1.5px solid #0f172a",
            borderRadius: "14px",
            padding: "14px 16px",
            background: "#ffffff",
          }}>
            {/* Header Row: Starter on left, $5 / mo on right */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{
                fontSize: "15.5px",
                fontWeight: "800",
                color: "#0f172a",
                fontFamily: "'Manrope', sans-serif"
              }}>
                Starter
              </span>
              <div style={{
                display: "flex",
                alignItems: "baseline",
                gap: "4px",
                fontFamily: "'Manrope', sans-serif"
              }}>
                <span style={{ fontSize: "22px", fontWeight: "800", color: "#0f172a" }}>$5</span>
                <span style={{ fontSize: "12px", fontWeight: "500", color: "#64748b" }}>/ mo</span>
              </div>
            </div>

            {/* Bullet points - Option A */}
            <div style={{
              marginTop: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontFamily: "'DM Sans', sans-serif"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
                <span style={{ fontSize: "14px", color: "#64748b", lineHeight: "1" }}>•</span>
                <span>50 images every month</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#475569" }}>
                <span style={{ fontSize: "14px", color: "#64748b", lineHeight: "1" }}>•</span>
                <span>Unlocks Background and Resize</span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleChoose("starter")}
            style={{
              marginTop: "14px",
              width: "100%",
              height: "42px",
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13.5px",
              fontWeight: "700",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.15s ease",
              boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)"
            }}
          >
            {loadingPlan === "starter" ? (
              <div style={{
                width: "16px",
                height: "16px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "#ffffff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite"
              }} />
            ) : (
              "Upgrade to Starter"
            )}
          </button>

          {/* Secondary Action for Case 3: Apply with free edits only */}
          {isCase3 && (
            <div style={{ marginTop: "12px", textAlign: "center" }}>
              <button
                type="button"
                onClick={handleApplyFreeEditsOnly}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0f172a",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                  padding: "4px 8px",
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  transition: "color 0.15s ease",
                }}
              >
                Apply with free edits only
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
