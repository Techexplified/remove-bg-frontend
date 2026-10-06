import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, CreditCard, X, Calendar } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { loadPlanStatus } from "../../app/slices/statusSlice";
import { fetchManagePlanUrls, cancelSubscription, reactivateSubscription, ApiError } from "../../shared/api/client";
import type { ManagePlanUrls } from "../../shared/types/api";
import { addToast } from "../../app/slices/uiSlice";
import { PLAN_LIMITS } from "../../shared/types/featureData";

interface Props { onManagePlan: () => void; onTopUp: () => void; openExternal: (url: string) => void; watching: boolean; onStopWatching: () => void; }

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="sub-detail-row">
      <span className="sub-detail-key">{label}</span>
      <span className="sub-detail-val">{value}</span>
    </div>
  );
}

export function AccountScreen({ onManagePlan, onTopUp, openExternal, watching, onStopWatching }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);
  const isLoading = useAppSelector(s => s.status.loading);
  const refetch = () => dispatch(loadPlanStatus());
  const displayName = useAppSelector(s => s.figma.displayName);
  const userId = useAppSelector(s => s.figma.userId);
  const [portalOpen, setPortalOpen] = useState(false);
  const [portalUrls, setPortalUrls] = useState<ManagePlanUrls | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [submittingAction, setSubmittingAction] = useState<"cancel" | "reactivate" | null>(null);

  async function handleCancel() {
    setSubmittingAction("cancel");
    try {
      const res = await cancelSubscription();
      dispatch(loadPlanStatus());
      dispatch(addToast({
        id: `toast_cancel_${Date.now()}`,
        kind: "warning",
        title: "Cancellation scheduled",
        message: res.message || `Your subscription will cancel on ${fmtDate(res.cancelsAt)}.`
      }));
    } catch (err) {
      dispatch(addToast({
        id: `toast_cancel_err_${Date.now()}`,
        kind: "error",
        title: "Cancel failed",
        message: err instanceof ApiError ? err.message : "Could not cancel subscription."
      }));
    } finally {
      setSubmittingAction(null);
    }
  }

  async function handleReactivate() {
    setSubmittingAction("reactivate");
    try {
      const res = await reactivateSubscription();
      dispatch(loadPlanStatus());
      dispatch(addToast({
        id: `toast_reactivate_${Date.now()}`,
        kind: "success",
        title: "Subscription reactivated",
        message: res.message || "Your subscription has been reactivated."
      }));
    } catch (err) {
      dispatch(addToast({
        id: `toast_reactivate_err_${Date.now()}`,
        kind: "error",
        title: "Reactivate failed",
        message: err instanceof ApiError ? err.message : "Could not reactivate subscription."
      }));
    } finally {
      setSubmittingAction(null);
    }
  }

  useEffect(() => {
    if (!portalOpen || status?.plan === "free") return;
    let cancelled = false;
    setPortalLoading(true);
    setPortalError(null);
    fetchManagePlanUrls()
      .then((urls) => { if (!cancelled) setPortalUrls(urls); })
      .catch((err) => { if (!cancelled) setPortalError(err instanceof ApiError ? err.message : "network error"); })
      .finally(() => { if (!cancelled) setPortalLoading(false); });
    return () => { cancelled = true; };
  }, [portalOpen, status?.plan]);

  const plan = status?.plan ?? "free";
  const isFree = plan === "free";
  const monthlyCredits = status?.credits ?? 0;
  const limit = PLAN_LIMITS[plan] ?? 10;
  const spendableTopup = plan === "pro" ? (status?.topupCreditsPro ?? 0) : plan === "starter" ? (status?.topupCreditsStarter ?? 0) : 0;
  const remainingPct = limit > 0 ? Math.min(100, Math.max(0, Math.round((monthlyCredits / limit) * 100))) : 0;

  const isCancelling = !!status?.scheduledCancelAt;
  const isDowngradeScheduled = status?.scheduledPlanChange === "starter";
  const cancelLabel = fmtDate(status?.scheduledCancelAt);
  const renewLabel = fmtDate(status?.subscriptionEndsAt);
  const initials = displayName ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : userId?.slice(0, 2).toUpperCase() ?? "?";

  const dateRowLabel = isCancelling ? "Access until" : (isDowngradeScheduled || !status?.isActive) ? "Plan ends" : "Next Renewal";
  const dateRowValue = isCancelling ? cancelLabel : renewLabel;

  return (
    <>
      <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--c-text)" }}>Account</h2>
          <p style={{ fontSize: "11px", color: "var(--c-text-3)" }}>Your plan and identity</p>
        </div>
        <button onClick={() => refetch()} style={{ background: "none", border: "none", color: "var(--c-text-3)", cursor: "pointer" }}>
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="pane-body">
        {/* User Identity Card */}
        <div className="account-identity">
          <div className="account-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="account-name">{displayName ?? "Explified"}</div>
            <div className="account-figma-id">{userId ?? "Auto-Linked Figma"}</div>
          </div>
          <span className="account-auto-linked">AUTO-LINKED FIGMA</span>
        </div>

        {/* Current Plan Card */}
        <div className="card">
          <div className="card-label">Current Plan</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "var(--c-text)", letterSpacing: "-0.01em" }}>
                {plan.toUpperCase()}
              </div>
              <div style={{ fontSize: "11px", color: "var(--c-text-3)", marginTop: "4px" }}>
                You have <strong style={{ color: "var(--brand)" }}>{monthlyCredits}</strong> of {limit} credits remaining from your monthly quota{spendableTopup > 0 ? ` (+${spendableTopup} top-up)` : ""}.
              </div>
            </div>

            {/* Circular progress gauge */}
            <div className="gauge-container">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="var(--c-border)" strokeWidth="6" />
                <circle
                  cx="32" cy="32" r="26" fill="none" stroke="var(--brand)" strokeWidth="6"
                  strokeDasharray="163.36" strokeDashoffset={163.36 * (1 - remainingPct / 100)}
                  strokeLinecap="round" transform="rotate(-90 32 32)"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="gauge-pct">{remainingPct}%</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            {isFree ? (
              <button className="btn btn-primary" style={{ width: "100%", height: "38px" }} onClick={onManagePlan}>
                Upgrade Plan
              </button>
            ) : (
              <>
                <button className="btn btn-ghost" style={{ flex: 1, height: "38px" }} onClick={onTopUp}>
                  Top Up
                </button>
                <button className="btn btn-primary" style={{ flex: 1, height: "38px" }} onClick={onManagePlan}>
                  Manage Plan
                </button>
              </>
            )}
          </div>
        </div>

        {/* Subscription Details */}
        <div className="card">
          <div className="card-label">Subscription Details</div>
          <Row label="Plan Type" value={<span className={`badge badge-${plan}`}>{plan.toUpperCase()}</span>} />
          <Row
            label="Account Status"
            value={
              isFree ? (
                <span style={{ color: "var(--c-text-2)", fontWeight: "600" }}>Free Tier</span>
              ) : isCancelling ? (
                <span style={{ color: "#f59e0b", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b" }} /> Cancelling
                </span>
              ) : status?.isActive ? (
                <span style={{ color: "var(--brand)", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--brand)" }} /> Active
                </span>
              ) : (
                <span style={{ color: "#ef4444", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444" }} /> Inactive
                </span>
              )
            }
          />
          <Row label="Billing Cycle" value={isFree ? "—" : "Monthly"} />
          <Row label={isFree ? "Next Renewal" : dateRowLabel} value={isFree ? "—" : (dateRowValue || "—")} />
          <Row
            label="Days Remaining"
            value={
              isFree ? (
                "—"
              ) : (
                <span style={{ color: "var(--brand)", fontWeight: "700" }}>
                  {status?.daysLeft != null ? `${status.daysLeft} ${status.daysLeft === 1 ? "Day" : "Days"}` : "—"}
                </span>
              )
            }
          />
        </div>


        {/* Manage Billing Button */}
        {!isFree && (
          <button
            className="btn btn-block"
            style={{ height: "42px", borderRadius: "12px", background: "var(--c-bg-2)", border: "1px solid var(--c-border)", fontWeight: "700" }}
            onClick={() => setPortalOpen(true)}>
            Manage Billing & Invoice
          </button>
        )}
      </div>
      <div className="pane-footer">
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/privacy-policy"); }}>Privacy</a> ·{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/terms-of-service"); }}>Terms</a> ·{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("mailto:support@explified.com"); }}>Support</a>
        <br />
        Built by Explified
      </div>
    </>
  );
}
