import { RefreshCw, Check, ChevronRight, ChevronLeft, HelpCircle, Star, FileText } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { loadPlanStatus } from "../../app/slices/statusSlice";
import { fetchManagePlanUrls } from "../../shared/api/client";
import { PLAN_LIMITS } from "../../shared/types/featureData";

interface Props {
  onManagePlan: () => void;
  onTopUp: () => void;
  openExternal: (url: string) => void;
  watching: boolean;
  onStopWatching: () => void;
  onNavigateTab?: (tab: "help" | "legal" | "feedback") => void;
  onBackToHome?: () => void;
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function SubRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="v2-sub-row">
      <span className="v2-sub-key">{label}</span>
      <span className="v2-sub-val">{value}</span>
    </div>
  );
}

export function AccountScreen({
  onManagePlan,
  onTopUp,
  openExternal,
  onNavigateTab,
  onBackToHome,
}: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.status.data);
  const statusLoading = useAppSelector((s) => s.status.loading);
  const refetch = () => dispatch(loadPlanStatus());
  const displayName = useAppSelector((s) => s.figma.displayName);
  const userId = useAppSelector((s) => s.figma.userId);

  async function handleManageBilling() {
    try {
      const urls = await fetchManagePlanUrls();
      if (urls.portalUrl) {
        openExternal(urls.portalUrl);
      } else {
        onManagePlan();
      }
    } catch {
      onManagePlan();
    }
  }

  const plan = status?.plan ?? "free";
  const isFree = plan === "free";
  const monthlyCredits = status?.credits ?? 0;
  const limit = PLAN_LIMITS[plan] ?? 3;
  const spendableTopup =
    plan === "starter" ? status?.topupCreditsStarter ?? 0 : status?.topupCreditsPro ?? 0;
  const remainingPct =
    limit > 0 ? Math.min(100, Math.max(0, Math.round((monthlyCredits / limit) * 100))) : 0;

  const isCancelling = !!status?.scheduledCancelAt;
  const isDowngradeScheduled = status?.scheduledPlanChange === "starter";
  const cancelLabel = fmtDate(status?.scheduledCancelAt);
  const renewLabel = fmtDate(status?.subscriptionEndsAt);
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : userId?.slice(0, 2).toUpperCase() ?? "U";

  const dateRowLabel = isCancelling
    ? "Access until"
    : isDowngradeScheduled || !status?.isActive
    ? "Plan ends"
    : "Next Renewal";
  const dateRowValue = isCancelling ? cancelLabel : renewLabel;

  return (
    <div className="v2-settings-screen">
      {/* Top Header */}
      <header className="v2-settings-header">
        <div className="v2-settings-header-left">
          {onBackToHome && (
            <button
              type="button"
              className="v2-back-icon-btn"
              onClick={onBackToHome}
              title="Back to home"
            >
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>
          )}
          <h1 className="v2-settings-title">Account</h1>
        </div>
        <button
          type="button"
          className="v2-header-action-btn"
          onClick={() => refetch()}
          title="Refresh account status"
        >
          <RefreshCw size={14} strokeWidth={2} className={statusLoading ? "spin" : ""} />
        </button>
      </header>

      {/* Main Body */}
      <div className="v2-settings-body">
        {/* Card 1: Combined Dark Navy Hero Card (#0f172a) */}
        <div className="v2-account-hero-card">
          <div className="v2-hero-identity-row">
            <div className="v2-hero-user-group">
              <div className="v2-hero-avatar">{initials}</div>
              <div className="v2-hero-user-info">
                <span className="v2-hero-user-name" title={displayName ?? "Explified"}>
                  {displayName ?? "Explified"}
                </span>
                <span className="v2-hero-user-id" title={userId ?? "Auto-Linked Figma"}>
                  {userId ?? "Auto-Linked Figma"}
                </span>
              </div>
            </div>
            <span className="v2-hero-auto-badge">AUTO-LINKED FIGMA</span>
          </div>

          <div className="v2-hero-divider" />

          <div className="v2-hero-plan-section">
            <span className="v2-hero-plan-label">YOUR PLAN</span>
            <div className="v2-hero-credits-title">
              {monthlyCredits} {monthlyCredits === 1 ? "credit" : "credits"} left
            </div>
            <div className="v2-hero-progress-track">
              <div
                className="v2-hero-progress-fill"
                style={{ width: `${remainingPct}%` }}
              />
            </div>
            <span className="v2-hero-plan-copy">
              {monthlyCredits} of {limit} images left. A credit is used only when you apply.
              {spendableTopup > 0 && ` (+${spendableTopup} top-up)`}
            </span>
          </div>
        </div>

        {/* Card 2: Conditional by Plan */}
        {isFree ? (
          /* Free Plan: Wireframe Starter Pitch Card */
          <div className="v2-starter-pitch-card">
            <div className="v2-starter-pitch-header">
              <span className="v2-starter-pitch-name">Starter</span>
              <div className="v2-starter-pitch-price">
                $5 <span className="v2-starter-pitch-period">/ month</span>
              </div>
            </div>
            <div className="v2-starter-pitch-features">
              <div className="v2-starter-feature-item">
                <Check size={14} strokeWidth={2.5} className="v2-starter-check-icon" />
                <span>50 images every month</span>
              </div>
              <div className="v2-starter-feature-item">
                <Check size={14} strokeWidth={2.5} className="v2-starter-check-icon" />
                <span>Unlocks Background and Resize</span>
              </div>
            </div>
            <button
              type="button"
              className="v2-starter-upgrade-btn"
              onClick={onManagePlan}
            >
              Upgrade to Starter
            </button>
          </div>
        ) : (
          /* Starter Plan: Subscription Details Card (no pitch card to prevent scrolling) */
          <div className="v2-sub-details-card">
            <div className="v2-sub-details-header">Subscription Details</div>
            <SubRow
              label="Plan Type"
              value={<span className="v2-plan-tag-starter">STARTER</span>}
            />
            <SubRow
              label="Account Status"
              value={
                isCancelling ? (
                  <span className="v2-status-dot-cancelling">Cancelling</span>
                ) : status?.isActive ? (
                  <span className="v2-status-dot-active">Active</span>
                ) : (
                  <span style={{ color: "#ef4444", fontWeight: 600 }}>Inactive</span>
                )
              }
            />
            <SubRow label="Billing Cycle" value="Monthly" />
            <SubRow label={dateRowLabel} value={dateRowValue || "—"} />
            <SubRow
              label="Days Remaining"
              value={
                <span style={{ color: "#0f172a", fontWeight: 700 }}>
                  {status?.daysLeft != null
                    ? `${status.daysLeft} ${status.daysLeft === 1 ? "Day" : "Days"}`
                    : "—"}
                </span>
              }
            />

            <div className="v2-sub-actions-row">
              <button
                type="button"
                className="v2-topup-btn"
                onClick={onTopUp}
              >
                Top Up
              </button>
              <button
                type="button"
                className="v2-manage-billing-btn"
                onClick={handleManageBilling}
              >
                Manage Billing & Invoice
              </button>
            </div>
          </div>
        )}

        {/* Card 3: Grouped Menu Rows */}
        <div className="v2-menu-group-card">
          <button
            type="button"
            className="v2-menu-row"
            onClick={() => onNavigateTab?.("help")}
          >
            <div className="v2-menu-row-left">
              <div className="v2-menu-row-icon">
                <HelpCircle size={16} strokeWidth={2} />
              </div>
              <span className="v2-menu-row-label">Help & FAQ</span>
            </div>
            <ChevronRight size={15} strokeWidth={2.2} className="v2-menu-row-chevron" />
          </button>

          {/* <button
            type="button"
            className="v2-menu-row"
            onClick={() => onNavigateTab?.("feedback")}
          >
            <div className="v2-menu-row-left">
              <div className="v2-menu-row-icon">
                <Star size={16} strokeWidth={2} />
              </div>
              <span className="v2-menu-row-label">Feedback & Preferences</span>
            </div>
            <ChevronRight size={15} strokeWidth={2.2} className="v2-menu-row-chevron" />
          </button> */}

          <button
            type="button"
            className="v2-menu-row"
            onClick={() => onNavigateTab?.("legal")}
          >
            <div className="v2-menu-row-left">
              <div className="v2-menu-row-icon">
                <FileText size={16} strokeWidth={2} />
              </div>
              <span className="v2-menu-row-label">Legal & privacy</span>
            </div>
            <ChevronRight size={15} strokeWidth={2.2} className="v2-menu-row-chevron" />
          </button>
        </div>

        {/* Footer */}
        <div className="v2-trust-footer">
          Payments are handled by Dodo Payments.
        </div>
      </div>
    </div>
  );
}
