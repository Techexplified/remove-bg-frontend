import { useState } from "react";
import { Sparkles, Shield, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal } from "../../../app/slices/uiSlice";
import { initTopUp } from "../../../app/slices/statusSlice";
import { TOPUP_PACKS, PLAN_LIMITS } from "../../types/featureData";
import type { PackId } from "../../types/api";

interface Props {
  onCheckoutOpen: (url: string, type: "topup") => void;
}

export function TopUpModal({ onCheckoutOpen }: Props) {
  const dispatch = useAppDispatch();
  const planStatus = useAppSelector(s => s.status.data);
  const [isLoading, setIsLoading] = useState(false);
  const plan = planStatus?.plan ?? "free";
  const isFree = plan === "free";
  const canBuy = planStatus?.canBuyTopup ?? false;
  const proLocked = planStatus?.featuresLocked === true;
  const spendable = !planStatus ? 0 : (planStatus.credits + (plan === "pro" ? planStatus.topupCreditsPro : planStatus.topupCreditsStarter));
  const planLimit = PLAN_LIMITS[plan] ?? 10;
  const totalLimit = Math.max(planLimit, spendable);
  const pct = totalLimit > 0 ? Math.min(100, Math.round((spendable / totalLimit) * 100)) : 0;

  async function handlePack(packId: PackId) {
    setIsLoading(true);
    try {
      const r = await dispatch(initTopUp(packId)).unwrap();
      dispatch(closeModal());
      onCheckoutOpen(r.checkoutUrl, "topup");
    } catch {
      // Handled by toast
    } finally {
      setIsLoading(false);
    }
  }

  const [selectedPackId, setSelectedPackId] = useState<PackId>("small");

  const isPro = plan === "pro";
  const packs = TOPUP_PACKS.map(tp => ({
    id: tp.id as PackId,
    credits: isPro ? tp.proCredits : tp.starterCredits,
    price: isPro ? tp.proPrice : tp.starterPrice,
    unitPrice: isPro
      ? `${(parseFloat(tp.proPrice.replace("$", "")) / tp.proCredits).toFixed(2)} / credit`
      : `${(parseFloat(tp.starterPrice.replace("$", "")) / tp.starterCredits).toFixed(2)} / credit`,
    badge: tp.badge,
  }));

  const selectedPack = packs.find(p => p.id === selectedPackId) || packs[0];

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => dispatch(closeModal())}>
        <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()} style={{ maxWidth: 360, width: "calc(100% - 24px)", background: "var(--surface-1)", border: "1px solid var(--c-border-2)", borderRadius: "18px", padding: "18px" }}>
          
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={() => dispatch(closeModal())} style={{ background: "none", border: "none", color: "var(--c-text)", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>
                ←
              </button>
              <div style={{ fontSize: "15px", fontWeight: "800", color: "var(--c-text)" }}>Top Up Credits</div>
            </div>
            <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)", background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
          </div>

          <div className="modal-body" style={{ gap: "14px", padding: 0 }}>
            {/* Remaining Credits Bar */}
            <div className="credit-card" style={{ padding: "12px 14px", marginBottom: 0 }}>
              <div className="credit-card-header" style={{ marginBottom: "6px" }}>
                <span>Remaining Credits <span className={`badge badge-${plan}`} style={{ marginLeft: "4px" }}>{plan.toUpperCase()}</span></span>
                <span style={{ fontWeight: "800", color: "var(--c-text)" }}>{spendable} <span style={{ color: "var(--c-text-3)", fontWeight: "400" }}>/ {totalLimit}</span></span>
              </div>
              <div className="progress-bar-track" style={{ height: "4px" }}>
                <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Select Credit Pack List */}
            <div>
              <div className="card-label" style={{ marginBottom: "8px" }}>Select Credit Pack</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {packs.map(p => {
                  const isSelected = selectedPackId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPackId(p.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px", borderRadius: "12px",
                        background: isSelected ? "rgba(108, 71, 255, 0.06)" : "var(--c-card)",
                        border: isSelected ? "1.5px solid var(--brand)" : "1px solid var(--c-border)",
                        boxShadow: isSelected ? "0 0 16px rgba(108, 71, 255, 0.12)" : "none",
                        cursor: "pointer", transition: "all 0.15s"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "16px", height: "16px", borderRadius: "50%",
                          border: isSelected ? "5px solid var(--brand)" : "1.5px solid var(--c-text-3)",
                          background: "#ffffff", transition: "all 0.12s"
                        }} />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--c-text)" }}>{p.credits} Credits</span>
                            {p.badge && (
                              <span style={{ fontSize: "8.5px", fontWeight: "800", padding: "2px 6px", borderRadius: "100px", background: "rgba(108, 71, 255, 0.12)", color: "var(--brand)", border: "1px solid rgba(108, 71, 255, 0.25)" }}>
                                {p.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--c-text-3)", marginTop: "2px" }}>{p.unitPrice}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "800", color: "var(--c-text)" }}>{p.price}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <div className="card-label" style={{ marginBottom: "8px" }}>Payment Method</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--c-card)", border: "1px solid var(--c-border)", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "600", color: "var(--c-text)" }}>
                  <span>💳</span> •••• 4242
                </div>
                <button style={{ background: "none", border: "none", color: "var(--brand)", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>
                  Change
                </button>
              </div>
              <div style={{ fontSize: "9.5px", color: "var(--c-text-3)", textAlign: "center", marginTop: "10px" }}>
                Credits never expire and roll over each billing cycle.
              </div>
            </div>

            {/* Action CTA */}
            <button
              className="cta-btn"
              style={{ height: "44px", marginTop: "4px", marginBottom: 0 }}
              disabled={isLoading}
              onClick={() => handlePack(selectedPack.id)}
            >
              {isLoading ? "Processing…" : `Buy ${selectedPack.credits} Credits — ${selectedPack.price}`}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
