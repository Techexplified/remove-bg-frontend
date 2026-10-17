import { useState } from "react";
import { Check, X, AlertTriangle, Calendar, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal, setShowExitIntent } from "../../../app/slices/uiSlice";
import { initCheckout } from "../../../app/slices/statusSlice";

interface Props {
  onCheckoutOpen: (url: string, type: "plan") => void;
  onScheduled: (msg: string) => void;
}

const FREE_FEATURES = [
  "3 free images",
  "Remove Background",
  "Batch Process",
];

const STARTER_FEATURES = [
  "50 images/month",
  "Remove Background",
  "Batch Process",
  "Background Studio",
  "Resize & Export",
];

function fmtDate(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function PlanPickerModal({ onCheckoutOpen, onScheduled }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<"starter" | "pro" | null>(null);
  const plan = status?.plan ?? "free";
  const isCancelling = !!status?.scheduledCancelAt;
  const isDowngradeScheduled = status?.scheduledPlanChange === "starter";
  const renewLabel = fmtDate(status?.subscriptionEndsAt);

  function handleDismiss() {
    dispatch(closeModal());
    dispatch(setShowExitIntent(true));
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
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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

  // ─── State: Free user — show 2 plans (Free & Starter)
  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={handleDismiss}>
        <motion.div className="modal" initial={{ scale: .94, y: 4 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()} style={{ maxWidth: 360, width: "calc(100% - 24px)", background: "var(--surface-1)", border: "1px solid var(--c-border-2)", borderRadius: "18px", padding: "18px" }}>
          
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={handleDismiss} style={{ background: "none", border: "none", color: "var(--c-text)", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>
                ←
              </button>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "var(--c-text)" }}>Choose Plan</div>
            </div>
            <button className="modal-close" onClick={handleDismiss} style={{ color: "var(--c-text-3)", background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
          </div>

          <div className="modal-body" style={{ gap: "10px", padding: 0 }}>
            {/* FREE Card */}
            <div style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: "14px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--c-text)" }}>FREE</span>
                  <span style={{ fontSize: "10px", color: "var(--c-text-3)" }}>3 free images</span>
                </div>
                <span style={{ fontSize: "8.5px", fontWeight: "700", padding: "2px 7px", background: "rgba(0, 0, 0, 0.05)", borderRadius: "100px", color: "var(--c-text-3)" }}>CURRENT PLAN</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "8px" }}>
                {FREE_FEATURES.map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10.5px", color: "var(--c-text-2)" }}>
                    <Check size={11} color="var(--brand)" /> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* STARTER Card */}
            <div style={{ background: "rgba(108, 71, 255, 0.04)", border: "1.5px solid var(--brand)", borderRadius: "14px", padding: "14px", boxShadow: "0 0 16px rgba(108, 71, 255, 0.12)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--brand)" }} />
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--c-text)" }}>STARTER</span>
                  <span style={{ fontSize: "10px", color: "var(--c-text-3)" }}>50 images/mo</span>
                </div>
                <span style={{ fontSize: "8.5px", fontWeight: "800", padding: "2px 7px", background: "rgba(108, 71, 255, 0.12)", borderRadius: "100px", color: "var(--brand)", border: "1px solid rgba(108, 71, 255, 0.25)" }}>POPULAR</span>
              </div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--c-text)", marginBottom: "8px" }}>
                $5 <span style={{ fontSize: "11px", color: "var(--c-text-3)", fontWeight: "400" }}>/ month</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginBottom: "12px" }}>
                {STARTER_FEATURES.map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10.5px", color: "var(--c-text-2)" }}>
                    <Check size={11} color="var(--brand)" /> {item}
                  </div>
                ))}
              </div>
              <button
                className="cta-btn"
                style={{ height: "40px", marginBottom: 0, background: "var(--brand)" }}
                disabled={isLoading}
                onClick={() => handleChoose("starter")}
              >
                {loadingPlan === "starter" ? "Processing…" : "Upgrade Plan"}
              </button>
            </div>

            <div style={{ fontSize: "9.5px", color: "var(--c-text-3)", textAlign: "center", marginTop: "4px" }}>
              Billing is handled securely through Figma.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
