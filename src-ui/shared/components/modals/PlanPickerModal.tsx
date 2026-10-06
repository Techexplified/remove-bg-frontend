import { useState } from "react";
import { Check, X, ExternalLink, AlertTriangle, Calendar, ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal, setShowExitIntent } from "../../../app/slices/uiSlice";
import { initCheckout } from "../../../app/slices/statusSlice";

interface Props {
  onCheckoutOpen: (url: string, type: "plan") => void;
  onScheduled: (msg: string) => void;
}

const STARTER_FEATURES = [
  "40 credits/month",
  "Remove Background (Basic)",
  "Crop & Resize Image",
  "Color Background Fill",
  "HD Export",
];

const PRO_FEATURES = [
  "AI Background Generator",
  "AI Shadows & Relighting",
  "AI Upscale (4x resolution)",
  "AI Image Generator",
  "AI Logo Maker",
  "HD Export (5 credits)",
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
  const proLocked = status?.featuresLocked === true;

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
                    <div style={{ fontSize: "10.5px", color: "var(--c-text-3)", marginTop: "3px" }}>$12/month · 40 credits/month</div>
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

  // ─── State: Starter user — upgrade to Pro
  if (plan === "starter") {
    // When proLocked, show a Coming Soon notice instead of the checkout CTA
    if (proLocked) {
      return (
        <AnimatePresence>
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => dispatch(closeModal())}>
            <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
              onClick={e => e.stopPropagation()} style={{ maxWidth: 330 }}>
              <div className="modal-head">
                <div>
                  <div className="modal-title">Upgrade to Pro</div>
                  <div className="modal-sub">Pro plan coming soon</div>
                </div>
                <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
              </div>
              <div className="modal-body" style={{ gap: "12px" }}>
                <div style={{ background: "var(--c-bg-2)", borderRadius: "14px", border: "1px solid var(--c-border)", padding: "20px 16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 32 }}>🚀</div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--c-text)" }}>Pro Plan — Coming Soon</div>
                  <div style={{ fontSize: "11px", color: "var(--c-text-3)", lineHeight: 1.5 }}>
                    AI features and the Pro subscription are currently being finalised. Your Starter plan and basic features are fully available right now.
                  </div>
                </div>
                <button onClick={() => dispatch(closeModal())} style={{ width: "100%", background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)", padding: "10px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                  Got It
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      );
    }

    return (
      <AnimatePresence>
        <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => dispatch(closeModal())}>
          <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
            onClick={e => e.stopPropagation()} style={{ maxWidth: 330 }}>
            <div className="modal-head" style={{ borderBottom: "none", paddingBottom: "10px" }}>
              <div>
                <div className="modal-title" style={{ fontSize: "16px", fontWeight: "700" }}>Upgrade to Pro</div>
                <div className="modal-sub">Unlock everything in RemoveBG</div>
              </div>
              <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ gap: "12px", paddingTop: "0px" }}>
              <div style={{ background: "var(--c-bg-2)", borderRadius: "14px", border: "1.5px solid var(--brand-border)", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span style={{ fontSize: "9px", fontWeight: "700", padding: "3px 8px", background: "var(--brand)", borderRadius: "100px", color: "white", textTransform: "uppercase" }}>★ Pro Plan</span>
                    <span style={{ fontSize: "9px", fontWeight: "700", padding: "3px 8px", background: "#fbbf24", borderRadius: "100px", color: "#000", textTransform: "uppercase" }}>Most Popular</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", margin: "4px 0" }}>
                  <span style={{ fontSize: "38px", fontWeight: "800", color: "var(--c-text)", lineHeight: 1 }}>$39</span>
                  <span style={{ fontSize: "11px", color: "var(--c-text-3)", marginLeft: "4px" }}>/month</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--c-text-3)", marginBottom: "12px" }}>300 credits included per month</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                  {PRO_FEATURES.map(f => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11.5px", color: "var(--c-text-2)", marginBottom: "6px" }}>
                      <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(108,71,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", flexShrink: 0 }}>
                        <Check size={10} strokeWidth={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button className="cta-btn" style={{ marginBottom: 0, height: "42px", display: "flex", gap: "6px", background: "var(--brand)" }} disabled={isLoading} onClick={() => handleChoose("pro")}>
                  <ExternalLink size={14} /> {isLoading ? "Processing…" : "Continue to Checkout"}
                </button>
                <div style={{ fontSize: "10px", textAlign: "center", color: "var(--c-text-3)", marginTop: "8px" }}>
                  You'll be charged today · SSL encrypted
                </div>
              </div>
              <button onClick={() => dispatch(closeModal())} style={{ width: "100%", background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)", padding: "10px", borderRadius: "10px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>
                Maybe Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── State: Free user — show both Starter & Pro
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
            <div style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: "14px", padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--c-text)" }}>FREE</span>
                  <span style={{ fontSize: "10px", color: "var(--c-text-3)" }}>10 credits/mo</span>
                </div>
                <span style={{ fontSize: "8.5px", fontWeight: "700", padding: "2px 7px", background: "rgba(0, 0, 0, 0.05)", borderRadius: "100px", color: "var(--c-text-3)" }}>CURRENT PLAN</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {["Remove BG (Standard)", "Basic Crop and Resize", "Community support"].map(item => (
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
                  <span style={{ fontSize: "10px", color: "var(--c-text-3)" }}>40 credits/mo</span>
                </div>
                <span style={{ fontSize: "8.5px", fontWeight: "800", padding: "2px 7px", background: "rgba(108, 71, 255, 0.12)", borderRadius: "100px", color: "var(--brand)", border: "1px solid rgba(108, 71, 255, 0.25)" }}>POPULAR</span>
              </div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--c-text)", marginBottom: "8px" }}>
                $12 <span style={{ fontSize: "11px", color: "var(--c-text-3)", fontWeight: "400" }}>/ month</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
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
                {loadingPlan === "starter" ? "Processing…" : "Upgrade to Starter"}
              </button>
            </div>

            {/* PRO Card */}
            <div style={{ background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: "14px", padding: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "var(--brand)" }}>PRO</span>
                  <span style={{ fontSize: "10px", color: "var(--c-text-3)" }}>300 credits/mo</span>
                </div>
                {proLocked ? (
                  <span style={{ fontSize: "8.5px", fontWeight: "800", padding: "2px 7px", background: "rgba(251, 191, 36, 0.15)", borderRadius: "100px", color: "#d97706", border: "1px solid rgba(251, 191, 36, 0.3)" }}>
                    COMING SOON
                  </span>
                ) : (
                  <span style={{ fontSize: "8.5px", fontWeight: "800", padding: "2px 7px", background: "var(--brand)", borderRadius: "100px", color: "#ffffff" }}>
                    RECOMMENDED
                  </span>
                )}
              </div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--c-text)", marginBottom: "8px" }}>
                $39 <span style={{ fontSize: "11px", color: "var(--c-text-3)", fontWeight: "400" }}>/ month</span>
              </div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--brand)", marginBottom: "8px" }}>
                300 credits included per month
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                {PRO_FEATURES.map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10.5px", color: "var(--c-text-2)" }}>
                    <Check size={11} color="var(--brand)" /> {item}
                  </div>
                ))}
              </div>
              {proLocked ? (
                <button
                  className="cta-btn"
                  style={{ height: "40px", marginBottom: 0, opacity: 0.6, cursor: "not-allowed", background: "var(--c-bg-2)", color: "var(--c-text-3)", border: "1px solid var(--c-border)" }}
                  disabled={true}
                >
                  Coming Soon
                </button>
              ) : (
                <button
                  className="cta-btn"
                  style={{ height: "40px", marginBottom: 0 }}
                  disabled={isLoading}
                  onClick={() => handleChoose("pro")}
                >
                  {loadingPlan === "pro" ? "Processing…" : "Upgrade to Pro"}
                </button>
              )}
            </div>

            <div style={{ fontSize: "9.5px", color: "var(--c-text-3)", textAlign: "center", marginTop: "4px" }}>
              Can switch plans anytime. <span style={{ color: "var(--c-text)", fontWeight: "700", textDecoration: "underline", cursor: "pointer" }}>View full comparison</span>
              <div style={{ marginTop: "2px", color: "var(--c-text-4)" }}>Billing is handled securely through Figma.</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
