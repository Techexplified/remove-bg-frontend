import { RefreshCw, Zap } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { loadPlanStatus } from "../../app/slices/statusSlice";
import { useAnimatedNumber } from "../../shared/hooks/useAnimatedNumber";
import { PLAN_LIMITS } from "../../shared/types/featureData";

interface Props {
  onManagePlan: () => void;
  onTopUp: () => void;
  watching: boolean;
  onStopWatching: () => void;
}

export function HeroCard({ onManagePlan, onTopUp, watching, onStopWatching }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);
  const isLoading = useAppSelector(s => s.status.loading);
  const error = useAppSelector(s => s.status.error);
  const refetch = () => dispatch(loadPlanStatus());

  const spendableTopup = !status ? 0 : status.plan === "pro" ? status.topupCreditsPro : status.plan === "starter" ? status.topupCreditsStarter : 0;
  const lockedTopup = !status ? 0 : status.plan === "pro" ? status.topupCreditsStarter : status.plan === "starter" ? status.topupCreditsPro : 0;
  const monthlyCredits = status?.credits ?? 0;
  const animatedMonthly = useAnimatedNumber(monthlyCredits);
  const limit = status ? (PLAN_LIMITS[status.plan] ?? monthlyCredits) : 0;
  
  // Calculate percentage used
  const usedCredits = Math.max(0, limit - monthlyCredits);
  const pct = limit > 0 ? Math.min(100, Math.max(0, (usedCredits / limit) * 100)) : 0;
  const isCancelling = !!status?.scheduledCancelAt;
  const isDowngradeScheduled = status?.scheduledPlanChange === "starter";
  const daysLeft = status?.daysLeft ?? 0;

  if (isLoading && !status) {
    return (
      <div className="hero">
        <div className="skeleton" style={{ width: 90, height: 20, borderRadius: 100, marginBottom: 16 }} />
        <div className="skeleton" style={{ width: 70, height: 38, marginBottom: 8 }} />
        <div className="skeleton" style={{ width: "100%", height: 5 }} />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="hero">
        <div style={{ fontSize: 12, color: "#f87171", marginBottom: 4 }}>Couldn't load your plan</div>
        <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 14 }}>Check your connection and try again.</div>
        <div className="hero-actions">
          <button className="btn-hero-ghost" style={{ flex: "none", padding: "0 20px" }} onClick={() => refetch()}>↻ Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="hero">
      {watching && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, padding: "8px 10px", marginBottom: 12, fontSize: 10.5, color: "rgba(255,255,255,.7)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#93c5fd", flexShrink: 0, animation: "proc-pulse 1.4s ease-in-out infinite", display: "inline-block" }} />
          <span>Waiting for payment…</span>
          <button onClick={onStopWatching} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,.4)", fontSize: 14, cursor: "pointer" }}>×</button>
        </div>
      )}
      
      {/* Top section with pills and refresh */}
      <div className="hero-top">
        <div className="hero-top-left" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span className={`plan-pill plan-pill-${status.plan}`}>{status.plan}</span>
          {status.isActive && !isCancelling && (
            <span className="badge badge-active" style={{ fontSize: "8.5px", background: "rgba(74,222,128,.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,.2)", textTransform: "capitalize", padding: "2px 6px" }}>
              ● Active
            </span>
          )}
          {daysLeft > 0 && (
            <span className="badge" style={{ background: "#fbbf24", color: "#000", border: "none", fontSize: "9px", textTransform: "none", padding: "2px 7px" }}>
              {daysLeft} days left
            </span>
          )}
        </div>
        <button className="hero-refresh" onClick={() => refetch()} title="Refresh">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Main credits layout */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, marginTop: 4 }}>
        <div>
          <div className="hero-credits-num" style={{ fontSize: "38px", color: "#fff", fontWeight: "700" }}>{animatedMonthly}</div>
          <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,.4)", marginTop: "2px" }}>credits remaining</div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
          {daysLeft > 0 && (
            <div style={{ fontSize: "10.5px", color: "rgba(255,255,255,.4)" }}>
              Resets in {daysLeft} days
            </div>
          )}
          <div style={{ fontSize: "9.5px", fontWeight: "700", padding: "3px 8px", borderRadius: "100px", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.7)" }}>
            {usedCredits}/{limit} used
          </div>
        </div>
      </div>

      {/* Top-up credits — separate pool */}
      {spendableTopup > 0 && (
        <div className="hero-topup-credits" style={{ marginTop: "-4px" }}>
          <span className="hero-topup-num"><Zap size={11} style={{ display: "inline", marginRight: 3 }} />+{spendableTopup}</span>
          <span className="hero-topup-label">top-up (auto-used when monthly runs out)</span>
        </div>
      )}

      {status.plan !== "free" && (
        <>
          <div className={`hero-bar ${pct >= 90 ? "hero-bar-danger" : ""}`} style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,.08)", overflow: "hidden" }}>
            <div className="hero-bar-fill" style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, #8b6dff, #6c47ff)", borderRadius: "2px" }} />
          </div>
          <div className="hero-meta" style={{ marginTop: "8px", marginBottom: "0px", display: "flex", justifyContent: "space-between", fontSize: "10.5px" }}>
            <span style={{ color: "rgba(255,255,255,.4)" }}>{usedCredits}/{limit} used this cycle</span>
            {pct >= 100 ? (
              <span style={{ color: "#ef4444", fontWeight: "700" }}>100% used</span>
            ) : (
              <span style={{ color: "rgba(255,255,255,.6)", fontWeight: "600" }}>{Math.round(pct)}% used</span>
            )}
          </div>
        </>
      )}

      {status.plan === "free" && monthlyCredits === 0 && (
        <div style={{ fontSize: 10.5, color: "#f87171", marginTop: 4 }}>Trial credits used — upgrade to continue</div>
      )}

      {/* State notices */}
      {isCancelling && <div className="hero-notice hero-notice-cancel">⚠ Cancels at cycle end. Go to Account → Manage Billing → Reactivate.</div>}
      {isDowngradeScheduled && !isCancelling && (
        <div className="hero-notice hero-notice-schedule">ℹ Switching to Starter next cycle. Pro access continues until then.</div>
      )}
      {lockedTopup > 0 && !isDowngradeScheduled && (
        <div className="hero-notice hero-notice-locked">ℹ {lockedTopup} {status.plan === "pro" ? "Starter" : "Pro"} credits locked — resubscribe to use them.</div>
      )}

      {/* Button layout */}
      <div className="hero-actions" style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
        {status.plan === "free" ? (
          <button className="btn-hero-primary" style={{ width: "100%", height: "38px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg,var(--brand-light),var(--brand-dark))", color: "white", fontSize: "12px", fontWeight: "600" }} onClick={onManagePlan}>
            Upgrade Plan
          </button>
        ) : (
          <>
            <button className="btn-hero-primary" style={{ flex: 1, height: "38px", borderRadius: "10px", border: "none", background: "var(--brand)", color: "white", fontSize: "12px", fontWeight: "600" }} onClick={onTopUp} disabled={!status.canBuyTopup || isCancelling}>
              + Top Up
            </button>
            <button className="btn-hero-ghost" style={{ flex: 1, height: "38px", borderRadius: "10px", border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "white", fontSize: "12px", fontWeight: "600" }} onClick={onManagePlan}>
              Manage Plan
            </button>
          </>
        )}
      </div>
    </div>
  );
}
