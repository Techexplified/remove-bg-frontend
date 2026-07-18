import { useState } from "react";
import { Check, X, ExternalLink, AlertTriangle, Calendar, ChevronRight, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal } from "../../../app/slices/uiSlice";
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
                <div className="modal-sub">Unlock everything in ZeroBG</div>
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
        onClick={() => dispatch(closeModal())}>
        <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()} style={{ maxWidth: 350 }}>
          <div className="modal-head" style={{ borderBottom: "none" }}>
            <div>
              <div className="modal-title" style={{ fontSize: "16px" }}>Choose a Plan</div>
              <div className="modal-sub">Unlock features and monthly credits</div>
            </div>
            <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
          </div>
          <div className="modal-body" style={{ gap: "10px", paddingTop: 0 }}>

            {/* Pro card (featured) — greyed out when proLocked */}
            <div style={{
              background: "var(--c-bg-2)",
              borderRadius: "14px",
              border: proLocked ? "1px solid var(--c-border)" : "1.5px solid var(--brand-border)",
              padding: "16px",
              opacity: proLocked ? 0.55 : 1,
              transition: "opacity 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <span style={{ fontSize: "9px", fontWeight: "700", padding: "3px 8px", background: proLocked ? "var(--c-text-3)" : "var(--brand)", borderRadius: "100px", color: "white", textTransform: "uppercase" }}>★ Pro Plan</span>
                {proLocked
                  ? <span style={{ fontSize: "9px", fontWeight: "700", padding: "3px 8px", background: "rgba(108,71,255,.08)", borderRadius: "100px", color: "var(--c-text-3)" }}>🔒 Coming Soon</span>
                  : <span style={{ fontSize: "9px", fontWeight: "700", padding: "3px 8px", background: "#fbbf24", borderRadius: "100px", color: "#000" }}>Most Popular</span>
                }
              </div>
              <div style={{ display: "flex", alignItems: "baseline", marginBottom: "4px" }}>
                <span style={{ fontSize: "32px", fontWeight: "800", color: proLocked ? "var(--c-text-3)" : "var(--c-text)", lineHeight: 1 }}>$39</span>
                <span style={{ fontSize: "11px", color: "var(--c-text-3)", marginLeft: "4px" }}>/month</span>
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--c-text-3)", marginBottom: "10px" }}>300 credits/month · All 10 features</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                {PRO_FEATURES.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", color: "var(--c-text-2)", marginBottom: "5px" }}>
                    <Check size={10} color={proLocked ? "var(--c-text-3)" : "var(--brand)"} strokeWidth={3} />{f}
                  </li>
                ))}
              </ul>
              <button
                className="cta-btn"
                style={{
                  marginBottom: 0, height: "40px", display: "flex", gap: "6px",
                  background: proLocked ? "var(--c-border)" : "var(--brand)",
                  color: proLocked ? "var(--c-text-3)" : "white",
                  cursor: proLocked ? "not-allowed" : "pointer",
                }}
                disabled={isLoading || proLocked}
                title={proLocked ? "Pro plan coming soon" : undefined}
                onClick={() => !proLocked && handleChoose("pro")}
              >
                <ArrowRight size={14} />
                {proLocked ? "Coming Soon" : loadingPlan === "pro" ? "Processing…" : "Get Pro — $39/mo"}
              </button>
            </div>

            {/* Starter card — always fully functional, never affected by proLocked */}
            <div style={{
              background: "var(--c-bg-2)",
              borderRadius: "14px",
              border: "1.5px solid var(--brand-border)",
              padding: "16px",
              boxShadow: "0 4px 16px rgba(108,71,255,.08)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                <span style={{ fontSize: "9px", fontWeight: "700", padding: "3px 8px", background: "var(--brand)", borderRadius: "100px", color: "white", textTransform: "uppercase" }}>★ Starter Plan</span>
                <span style={{ fontSize: "9px", fontWeight: "700", padding: "3px 8px", background: "#34d399", borderRadius: "100px", color: "#064e3b", textTransform: "uppercase" }}>Available Now</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", marginBottom: "4px" }}>
                <span style={{ fontSize: "32px", fontWeight: "800", color: "var(--c-text)", lineHeight: 1 }}>$12</span>
                <span style={{ fontSize: "11px", color: "var(--c-text-3)", marginLeft: "4px" }}>/month</span>
              </div>
              <div style={{ fontSize: "10.5px", color: "var(--c-text-3)", marginBottom: "10px" }}>40 credits/month · Basic features</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px" }}>
                {STARTER_FEATURES.map(f => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", color: "var(--c-text-2)", marginBottom: "5px" }}>
                    <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: "rgba(108,71,255,.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", flexShrink: 0 }}>
                      <Check size={10} strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="cta-btn"
                style={{
                  marginBottom: 0,
                  height: "40px",
                  display: "flex",
                  gap: "6px",
                  background: "var(--brand)",
                  color: "white",
                  cursor: "pointer",
                }}
                disabled={isLoading}
                onClick={() => handleChoose("starter")}
              >
                <ArrowRight size={14} />
                {loadingPlan === "starter" ? "Processing…" : "Get Starter — $12/mo"}
              </button>
            </div>

            <button onClick={() => dispatch(closeModal())} style={{ width: "100%", background: "transparent", border: "none", color: "var(--c-text-3)", padding: "8px", fontSize: "11px", cursor: "pointer" }}>
              Maybe Later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
