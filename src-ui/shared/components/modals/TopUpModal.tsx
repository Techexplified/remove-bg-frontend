import { useState } from "react";
import { Sparkles, Shield, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { closeModal } from "../../../app/slices/uiSlice";
import { initTopUp } from "../../../app/slices/statusSlice";
import { TOPUP_PACKS } from "../../types/featureData";
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

  return (
    <AnimatePresence>
      <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => dispatch(closeModal())}>
        <motion.div className="modal" initial={{ scale: .93, y: 8 }} animate={{ scale: 1, y: 0 }}
          onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
          <div className="modal-head">
            <div>
              <div className="modal-title">Top Up Credits</div>
              <div className="modal-sub">One-time purchase, instant delivery</div>
            </div>
            <button className="modal-close" onClick={() => dispatch(closeModal())} style={{ color: "var(--c-text-3)" }}><X size={16} /></button>
          </div>
          <div className="modal-body" style={{ gap: "12px" }}>
            {isFree && <div className="banner banner-warning">You need a Starter or Pro plan to buy top-up credits.</div>}
            {!isFree && !canBuy && <div className="banner banner-warning">Top-ups aren't available on your account right now.</div>}
            {/* When proLocked and user is on Pro, hide Pro packs and show informational message */}
            {!isFree && canBuy && plan === "pro" && proLocked && (
              <div style={{
                background: "var(--c-bg-2)",
                border: "1px solid var(--c-border)",
                borderRadius: "14px",
                padding: "20px 16px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}>
                <div style={{ fontSize: 28 }}>🚀</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--c-text)" }}>Pro Top-Up Credits — Coming Soon</div>
                <div style={{ fontSize: "11px", color: "var(--c-text-3)", lineHeight: 1.5 }}>
                  Additional Pro credit packs are being finalised and will be available shortly. Your existing credits remain active.
                </div>
              </div>
            )}
            {!isFree && canBuy && !(plan === "pro" && proLocked) && TOPUP_PACKS.map((pack, i) => {
              const credits = plan === "pro" ? pack.proCredits : pack.starterCredits;
              const price = plan === "pro" ? pack.proPrice : pack.starterPrice;
              const isMainPack = i === 1;

              return (
                <div key={pack.id} style={{
                  position: "relative",
                  background: isMainPack
                    ? "linear-gradient(145deg, #0f0a1e 0%, #1a1035 50%, #0f0a1e 100%)"
                    : "linear-gradient(145deg, #fafafa 0%, #ffffff 100%)",
                  border: isMainPack ? "1px solid rgba(108,71,255,.35)" : "1px solid #e8e8ee",
                  borderRadius: "16px",
                  padding: "18px",
                  marginBottom: "10px",
                  boxShadow: isMainPack
                    ? "0 8px 32px rgba(108,71,255,.15), 0 2px 8px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.05)"
                    : "0 2px 8px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)",
                  overflow: "hidden",
                }}>
                  {/* Subtle gradient glow for main pack */}
                  {isMainPack && (
                    <div style={{
                      position: "absolute", top: 0, left: 0, right: 0, height: "1px",
                      background: "linear-gradient(90deg, transparent, rgba(108,71,255,.6), rgba(139,92,246,.4), transparent)",
                    }} />
                  )}

                  {/* Top row: label + badge | price */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        fontSize: "13.5px",
                        fontWeight: "700",
                        color: isMainPack ? "#ffffff" : "#1a1a2e",
                        letterSpacing: "-0.01em",
                      }}>
                        {pack.label}
                      </span>
                      <span style={{
                        fontSize: "8.5px",
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        padding: "3px 8px",
                        borderRadius: "100px",
                        background: isMainPack
                          ? "linear-gradient(135deg, rgba(108,71,255,.25), rgba(139,92,246,.2))"
                          : "rgba(108,71,255,.07)",
                        color: isMainPack ? "#c4b5fd" : "var(--brand)",
                        border: isMainPack
                          ? "1px solid rgba(139,92,246,.3)"
                          : "1px solid rgba(108,71,255,.15)",
                      }}>
                        {pack.badge}
                      </span>
                    </div>
                    <span style={{
                      fontSize: "9.5px",
                      color: isMainPack ? "rgba(255,255,255,.4)" : "#9ca3af",
                      fontWeight: "500",
                    }}>
                      one-time
                    </span>
                  </div>

                  {/* Credits + Price hero row */}
                  <div style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: "14px",
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: isMainPack
                      ? "rgba(108,71,255,.08)"
                      : "rgba(108,71,255,.03)",
                    border: isMainPack
                      ? "1px solid rgba(108,71,255,.12)"
                      : "1px solid rgba(108,71,255,.06)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Sparkles size={14} style={{ color: isMainPack ? "#a78bfa" : "var(--brand)" }} />
                      <span style={{
                        fontSize: "22px",
                        fontWeight: "800",
                        color: isMainPack ? "#ffffff" : "#1a1a2e",
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                      }}>
                        +{credits}
                      </span>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: isMainPack ? "rgba(255,255,255,.5)" : "#8b8ba0",
                        marginTop: "2px",
                      }}>
                        credits
                      </span>
                    </div>
                    <span style={{
                      fontSize: "20px",
                      fontWeight: "800",
                      color: isMainPack ? "#ffffff" : "#1a1a2e",
                      letterSpacing: "-0.02em",
                    }}>
                      {price}
                    </span>
                  </div>

                  {/* CTA button */}
                  <button disabled={isLoading} onClick={() => handlePack(pack.id)} style={{
                    width: "100%",
                    height: "42px",
                    borderRadius: "11px",
                    border: "none",
                    fontWeight: "700",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "7px",
                    cursor: isLoading ? "wait" : "pointer",
                    transition: "all .15s ease",
                    background: isMainPack
                      ? "linear-gradient(135deg, #7c3aed, #6c47ff, #8b5cf6)"
                      : "linear-gradient(135deg, #1a1a2e, #2d2b55)",
                    color: "#ffffff",
                    boxShadow: isMainPack
                      ? "0 4px 14px rgba(108,71,255,.35), inset 0 1px 0 rgba(255,255,255,.15)"
                      : "0 2px 8px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.05)",
                    opacity: isLoading ? 0.7 : 1,
                    letterSpacing: "-0.01em",
                  }}>
                    <Sparkles size={13} /> Add {credits} Credits — {price}
                  </button>
                </div>
              );
            })}

            <div className="pack-secure" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", fontSize: "10.5px", color: "var(--c-text-4)", marginTop: "4px", textAlign: "center", lineHeight: "1.5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><Shield size={11} /> Secure payment · subscription required</div>
              <div>Credits are tied to your current plan and cannot be transferred or refunded after use.</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
