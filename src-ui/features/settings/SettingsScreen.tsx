import { useState } from "react";
import { ChevronLeft, Send, Save, RefreshCw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { savePreferences, submitFeedback, ApiError } from "../../shared/api/client";
import { loadPlanStatus } from "../../app/slices/statusSlice";
import { addToast, openModal, setSection } from "../../app/slices/uiSlice";
import { AccountScreen } from "../account/AccountScreen";
import { HelpScreen } from "../help/HelpScreen";
import { LegalScreen } from "../legal/LegalScreen";
import { useCheckoutWatcher } from "../../shared/hooks/useCheckoutWatcher";
import { usePluginBridgeContext } from "../../shared/context/PluginBridgeContext";
import "../../shared/styles/v2/settings.css";

const FEATURE_CHECKBOXES = [
  { id: "remove_bg_basic", label: "Remove Background" },
  { id: "ai_background", label: "AI Background replacement" },
  { id: "ai_shadows", label: "AI Shadows" },
  { id: "hd_export", label: "HD Export" },
  { id: "ai_relighting", label: "AI Relighting" },
  { id: "crop_resize", label: "Crop & Resize" },
  { id: "ai_upscale", label: "AI Upscale" },
];

export type SettingsTab = "account" | "help" | "legal" | "feedback";

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.status.data);
  const bridge = usePluginBridgeContext();
  const checkoutWatcher = useCheckoutWatcher();

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  // Preference state
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    () => status?.featureInterests || []
  );
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Feedback state
  const [starRating, setStarRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  function toggleFeature(id: string) {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  async function handleSavePreferences() {
    setSavingPrefs(true);
    try {
      await savePreferences({ feature_interests: selectedFeatures });
      dispatch(loadPlanStatus());
      dispatch(
        addToast({
          id: `toast_save_prefs_${Date.now()}`,
          kind: "success",
          title: "Preferences saved",
          message: "Your feedback settings have been updated.",
        })
      );
    } catch (err) {
      dispatch(
        addToast({
          id: `toast_save_prefs_err_${Date.now()}`,
          kind: "error",
          title: "Failed to save preferences",
          message: err instanceof ApiError ? err.message : "Something went wrong.",
        })
      );
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleSendFeedback() {
    if (!feedbackMsg.trim() && !starRating) {
      dispatch(
        addToast({
          id: `toast_empty_fb_${Date.now()}`,
          kind: "warning",
          title: "Empty feedback",
          message: "Please enter a message or select a star rating.",
        })
      );
      return;
    }
    setSendingFeedback(true);
    try {
      await submitFeedback({
        type: "open",
        message: feedbackMsg.trim() || undefined,
        star_rating: starRating || undefined,
      });
      dispatch(
        addToast({
          id: `toast_fb_sent_${Date.now()}`,
          kind: "success",
          title: "Thanks for the feedback!",
          message: "We appreciate your thoughts.",
        })
      );
      setFeedbackMsg("");
      setStarRating(null);
    } catch (err) {
      dispatch(
        addToast({
          id: `toast_fb_err_${Date.now()}`,
          kind: "error",
          title: "Failed to send feedback",
          message: err instanceof ApiError ? err.message : "Something went wrong.",
        })
      );
    } finally {
      setSendingFeedback(false);
    }
  }

  return (
    <>
      {activeTab === "account" && (
        <AccountScreen
          onBackToHome={() => dispatch(setSection("features"))}
          onNavigateTab={setActiveTab}
          onManagePlan={() => dispatch(openModal({ kind: "plan_picker", context: "upgrade" }))}
          onTopUp={() => dispatch(openModal({ kind: "topup" }))}
          openExternal={bridge.openExternal}
          watching={checkoutWatcher.isWatching}
          onStopWatching={checkoutWatcher.stop}
        />
      )}

      {activeTab === "help" && (
        <HelpScreen
          openExternal={bridge.openExternal}
          onBack={() => setActiveTab("account")}
        />
      )}

      {activeTab === "legal" && (
        <LegalScreen
          openExternal={bridge.openExternal}
          onBack={() => setActiveTab("account")}
        />
      )}

      {activeTab === "feedback" && (
        <div className="v2-settings-screen">
          <header className="v2-settings-header">
            <div className="v2-settings-header-left">
              <button
                type="button"
                className="v2-back-icon-btn"
                onClick={() => setActiveTab("account")}
                title="Back to account"
              >
                <ChevronLeft size={16} strokeWidth={2.4} />
              </button>
              <h1 className="v2-settings-title">Feedback & Preferences</h1>
            </div>
          </header>

          <div className="v2-settings-body">
            {/* Feature Interests Card */}
            <div className="v2-subview-card">
              <div className="v2-subview-card-title">Which features are you interested in?</div>
              <div className="v2-subview-card-desc">
                Update anytime — helps us prioritise what to build next.
              </div>

              <div className="v2-feedback-checkbox-list">
                {FEATURE_CHECKBOXES.map((item) => {
                  const isChecked = selectedFeatures.includes(item.id);
                  return (
                    <label key={item.id} className="v2-feedback-checkbox-item">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFeature(item.id)}
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>

              <button
                type="button"
                className="v2-primary-action-btn"
                onClick={handleSavePreferences}
                disabled={savingPrefs}
              >
                {savingPrefs ? (
                  <RefreshCw size={13} className="spin" />
                ) : (
                  <Save size={13} />
                )}
                <span>Save preferences</span>
              </button>
            </div>

            {/* Rate & Open Feedback Card */}
            <div className="v2-subview-card">
              <div className="v2-subview-card-title">Rate your experience</div>
              <div
                className="v2-star-rating-row"
                onMouseLeave={() => setHoverRating(null)}
              >
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= ((hoverRating ?? starRating) || 0);
                  return (
                    <button
                      key={star}
                      type="button"
                      className={`v2-star-btn ${
                        active ? (hoverRating ? "hovered" : "filled") : ""
                      }`}
                      onMouseEnter={() => setHoverRating(star)}
                      onClick={() => setStarRating(star)}
                    >
                      ★
                    </button>
                  );
                })}
              </div>

              <div className="v2-subview-card-title" style={{ marginTop: 6 }}>
                Anything you'd like us to build or improve?
              </div>
              <textarea
                className="v2-feedback-textarea"
                placeholder="Share your ideas or feature requests…"
                value={feedbackMsg}
                onChange={(e) => setFeedbackMsg(e.target.value)}
              />

              <button
                type="button"
                className="v2-primary-action-btn"
                onClick={handleSendFeedback}
                disabled={sendingFeedback}
              >
                {sendingFeedback ? (
                  <RefreshCw size={13} className="spin" />
                ) : (
                  <Send size={13} />
                )}
                <span>Send feedback</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
