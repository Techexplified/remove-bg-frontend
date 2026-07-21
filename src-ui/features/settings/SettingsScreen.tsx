import { useState, useEffect } from "react";
import { Check, Star, Send, Save, RefreshCw } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { savePreferences, submitFeedback, ApiError } from "../../shared/api/client";
import { loadPlanStatus } from "../../app/slices/statusSlice";
import { addToast } from "../../app/slices/uiSlice";

const FEATURE_CHECKBOXES = [
  { id: "remove_bg_basic", label: "Remove Background" },
  { id: "ai_background", label: "AI Background replacement" },
  { id: "ai_shadows", label: "AI Shadows" },
  { id: "hd_export", label: "HD Export" },
  { id: "ai_relighting", label: "AI Relighting" },
  { id: "crop_resize", label: "Crop & Resize" },
  { id: "ai_upscale", label: "AI Upscale" },
];

export function SettingsScreen() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);

  // Preference state
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const [savingPrefs, setSavingPrefs] = useState(false);

  // Feedback state
  const [starRating, setStarRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [sendingFeedback, setSendingFeedback] = useState(false);

  useEffect(() => {
    if (status) {
      setSelectedFeatures(status.featureInterests || []);

    }
  }, [status]);

  function toggleFeature(id: string) {
    setSelectedFeatures(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  }

  async function handleSavePreferences() {
    setSavingPrefs(true);
    try {
      await savePreferences({
        feature_interests: selectedFeatures,
      });
      dispatch(loadPlanStatus());
      dispatch(addToast({
        id: `toast_save_prefs_${Date.now()}`,
        kind: "success",
        title: "Preferences saved",
        message: "Your feedback settings have been updated.",
      }));
    } catch (err) {
      dispatch(addToast({
        id: `toast_save_prefs_err_${Date.now()}`,
        kind: "error",
        title: "Failed to save preferences",
        message: err instanceof ApiError ? err.message : "Something went wrong.",
      }));
    } finally {
      setSavingPrefs(false);
    }
  }

  async function handleSendFeedback() {
    if (!feedbackMsg.trim() && !starRating) {
      dispatch(addToast({
        id: `toast_empty_fb_${Date.now()}`,
        kind: "warning",
        title: "Empty feedback",
        message: "Please enter a message or select a star rating.",
      }));
      return;
    }

    setSendingFeedback(true);
    try {
      await submitFeedback({
        type: "open",
        message: feedbackMsg.trim() || undefined,
        star_rating: starRating || undefined,
      });
      dispatch(addToast({
        id: `toast_fb_sent_${Date.now()}`,
        kind: "success",
        title: "Thanks for the feedback!",
        message: "We appreciate your thoughts.",
      }));
      setFeedbackMsg("");
      setStarRating(null);
    } catch (err) {
      dispatch(addToast({
        id: `toast_fb_err_${Date.now()}`,
        kind: "error",
        title: "Failed to send feedback",
        message: err instanceof ApiError ? err.message : "Something went wrong.",
      }));
    } finally {
      setSendingFeedback(false);
    }
  }

  return (
    <>
      <div className="pane-header">
        <h2>Settings</h2>
        <p>Feedback & Preferences</p>
      </div>

      <div className="pane-body">
        {/* Feature Interests Card */}
        <div className="settings-card">
          <div className="settings-card-title">Which features are you interested in?</div>
          <div className="settings-card-desc">
            Update anytime — helps us prioritise what to build next.
          </div>

          <div className="settings-checkbox-group">
            {FEATURE_CHECKBOXES.map(item => {
              const isChecked = selectedFeatures.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`settings-checkbox ${isChecked ? "checked" : ""}`}
                >
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
            className="settings-btn settings-btn-primary"
            onClick={() => handleSavePreferences()}
            disabled={savingPrefs}
          >
            {savingPrefs ? <RefreshCw size={13} className="spin" /> : <Save size={13} />} Save preferences
          </button>
        </div>

        {/* Rate & Open Feedback Card */}
        <div className="settings-card">
          <div className="settings-card-title">Rate your experience</div>
          <div className="star-rating" onMouseLeave={() => setHoverRating(null)}>
            {[1, 2, 3, 4, 5].map(star => {
              const active = star <= ((hoverRating ?? starRating) || 0);
              return (
                <span
                  key={star}
                  className={`star-rating-star ${active ? (hoverRating ? "hovered" : "filled") : ""}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onClick={() => setStarRating(star)}
                >
                  ★
                </span>
              );
            })}
          </div>

          <div className="settings-card-title" style={{ marginTop: 12 }}>
            Anything you'd like us to build or improve?
          </div>
          <textarea
            className="settings-textarea"
            placeholder="Share your ideas or feature requests…"
            value={feedbackMsg}
            onChange={e => setFeedbackMsg(e.target.value)}
          />

          <button
            className="settings-btn settings-btn-primary"
            style={{ marginTop: 12 }}
            onClick={handleSendFeedback}
            disabled={sendingFeedback}
          >
            {sendingFeedback ? <RefreshCw size={13} className="spin" /> : <Send size={13} />} Send feedback
          </button>
        </div>


      </div>
    </>
  );
}
