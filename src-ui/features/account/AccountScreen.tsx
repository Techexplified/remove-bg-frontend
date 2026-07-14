import { useEffect, useState } from "react";
import { RefreshCw, ExternalLink, CreditCard, X, Calendar } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { loadPlanStatus } from "../../app/slices/statusSlice";
import { fetchManagePlanUrls, cancelSubscription, reactivateSubscription, ApiError } from "../../shared/api/client";
import type { ManagePlanUrls } from "../../shared/types/api";
import { addToast } from "../../app/slices/uiSlice";

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

  const isCancelling = !!status?.scheduledCancelAt;
  const isDowngradeScheduled = status?.scheduledPlanChange === "starter";
  const cancelLabel = fmtDate(status?.scheduledCancelAt);
  const renewLabel = fmtDate(status?.subscriptionEndsAt);
  const initials = displayName ? displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : userId?.slice(0, 2).toUpperCase() ?? "?";

  const dateRowLabel = isCancelling ? "Access until" : (isDowngradeScheduled || !status?.isActive) ? "Plan ends" : "Next Renewal";
  const dateRowValue = isCancelling ? cancelLabel : renewLabel;

  return (
    <>
      <div className="pane-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div><h2>Account</h2><p>Your plan and identity</p></div>
        <button onClick={() => refetch()} style={{ background: "none", border: "none", color: "var(--c-text-3)", cursor: "pointer", marginTop: 18 }}><RefreshCw size={14} /></button>
      </div>
      <div className="pane-body">
        {/* Banners */}
        {isCancelling && status?.isActive && (
          <div className="banner banner-warning" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <Calendar size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Your subscription cancels on {cancelLabel}.</strong>
                <div style={{ fontSize: 10.5, marginTop: 2 }}>You keep full access until then.</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                onClick={handleReactivate}
                disabled={submittingAction !== null}
                style={{
                  background: "rgba(245,158,11,.1)",
                  border: "1px solid rgba(245,158,11,.18)",
                  color: "#92400e",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                  whiteSpace: "nowrap"
                }}
              >
                {submittingAction === "reactivate" ? "Reactivating..." : "Reactivate →"}
              </button>
              {watching && <button onClick={onStopWatching} style={{ background: "none", border: "none", color: "rgba(251,191,36,.5)", cursor: "pointer", fontSize: 14 }}>×</button>}
            </div>
          </div>
        )}
        {isDowngradeScheduled && !isCancelling && (
          <div className="banner banner-info">
            <Calendar size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <strong>Switching to Starter {renewLabel ? `on ${renewLabel}` : "at next renewal"}</strong>
              <div style={{ fontSize: 10.5, marginTop: 2 }}>Pro access continues until then.</div>
              {(status?.topupCreditsPro ?? 0) > 0 && <div style={{ fontSize: 10, marginTop: 4, color: "rgba(108,71,255,.7)" }}>Your {status!.topupCreditsPro} Pro top-up credits will move to your Starter pool at renewal.</div>}
            </div>
          </div>
        )}

        {/* Hero state (compact) */}
        {isLoading && !status ? (
          <div className="card"><div className="skeleton" style={{ width: "100%", height: 80 }} /></div>
        ) : status && (
          <div className="hero" style={{ marginBottom: 14 }}>
            <div className="hero-top">
              <div className="hero-top-left">
                <span className={`plan-pill plan-pill-${status.plan}`}>{status.plan.toUpperCase()} PLAN</span>
                {status.isActive && !isCancelling && (
                  <span className="badge badge-active" style={{ background: "rgba(74,222,128,.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,.2)", textTransform: "uppercase", padding: "2px 6px" }}>
                    ● ACTIVE
                  </span>
                )}
              </div>
              {status.plan !== "free" && <div className="hero-billing-info">{isCancelling ? `Cancels ${cancelLabel}` : `Renews ${renewLabel}`}</div>}
            </div>
            <div className="hero-credits"><span className="hero-credits-num">{status.credits}</span><span className="hero-credits-label">credits this month</span></div>
            {status.plan !== "free" && (
              <div className="hero-actions">
                <button className="btn-hero-ghost" onClick={onTopUp} disabled={!status.canBuyTopup || isCancelling}>+ Top Up</button>
                <button className="btn-hero-primary" onClick={onManagePlan}>Manage Plan</button>
              </div>
            )}
            {status.plan === "free" && <button className="btn-hero-primary" style={{ width: "100%", marginTop: 14 }} onClick={onManagePlan}>Upgrade Plan</button>}
          </div>
        )}

        {/* Figma Account */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="card-label" style={{ marginBottom: 0 }}>Figma Account</div>
            <span style={{ fontSize: 9.5, color: "var(--text-2)", background: "var(--surface-2)", border: "1px solid var(--border)", padding: "2px 7px", borderRadius: 100 }}>Auto-linked</span>
          </div>
          <div className="account-identity">
            <div className="account-avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="account-name">{displayName ?? "Figma User"}</div>
              <div className="account-figma-id">🔗 {userId ?? "loading…"}</div>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--c-text-2)", lineHeight: 1.5, marginTop: 10, background: "rgba(108,71,255,.03)", border: "1px solid var(--brand-border)", borderRadius: 8, padding: "8px 10px" }}>
            <span style={{ fontWeight: 800, color: "var(--brand)", marginRight: 4 }}>i</span> Your identity is tied to your active Figma account. There's nothing to sign in or out of — your account automatically connects when you open this plugin.
          </div>
        </div>

        {/* Subscription Details */}
        {status && status.plan !== "free" && (
          <div className="card">
            <div className="card-label">Subscription Details</div>
            <Row label="Plan" value={<span className={`badge badge-${status.plan}`} style={{ background: "rgba(245,158,11,.1)", color: "#d97706", border: "1px solid rgba(245,158,11,.15)" }}>{status.plan.toUpperCase()}</span>} />
            <Row label="Status" value={
              <span style={{ color: "#16a34a", fontWeight: 600 }}>
                ● Active
              </span>
            } />
            <Row label="Billing Cycle" value="Monthly" />
            <Row label={dateRowLabel} value={dateRowValue} />
            <Row label="Days Left" value={status.daysLeft} />
            {isDowngradeScheduled && !isCancelling && <Row label="Scheduled Change" value={<span style={{ color: "var(--brand-light)" }}>→ Starter</span>} />}

            <div style={{ marginTop: 12 }}>
              {!portalOpen && (
                <button className="btn btn-block" onClick={() => setPortalOpen(true)}>
                  <ExternalLink size={13} /> Manage Billing
                </button>
              )}
              {portalLoading && <div className="skeleton" style={{ width: "100%", height: 36, borderRadius: 9 }} />}
              {portalError && <div className="banner banner-danger" style={{ marginTop: 8 }}>Couldn't load billing portal. Try again.</div>}
              {portalUrls && (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <button className="btn btn-block" onClick={() => openExternal(portalUrls.portalUrl)}><ExternalLink size={13} />View Billing</button>
                  <button className="btn btn-block" onClick={() => openExternal(portalUrls.updatePaymentUrl)}><CreditCard size={13} />Update Payment Method</button>
                  {isCancelling ? (
                    <button className="btn btn-success btn-block" onClick={handleReactivate} disabled={submittingAction !== null}>
                      <RefreshCw size={13} style={{ animation: submittingAction === "reactivate" ? "spin 0.8s linear infinite" : undefined }} />
                      {submittingAction === "reactivate" ? "Reactivating..." : "Reactivate Subscription"}
                    </button>
                  ) : (
                    <button className="btn btn-danger btn-block" onClick={handleCancel} disabled={submittingAction !== null}>
                      <X size={13} />
                      {submittingAction === "cancel" ? "Cancelling..." : "Cancel Subscription"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="pane-footer">
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/privacy-policy"); }}>Privacy</a> ·{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/terms-of-service"); }}>Terms</a> ·{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("mailto:support@explified.com"); }}>Support</a>
        <br />
        Built by Explified · v1.4.2
      </div>
    </>
  );
}
