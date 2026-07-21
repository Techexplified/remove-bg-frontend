import { useState } from "react";
import { ThumbsUp, ThumbsDown, RotateCcw, Check, Send } from "lucide-react";
import { useAppSelector } from "../../../app/hooks";
import { submitFeedback } from "../../api/client";
import type { FeatureId, FeedbackRating, FeedbackIssue } from "../../types/api";

interface Props {
  featureId: FeatureId;
  onRetry?: () => void;
}

const ISSUES: { id: FeedbackIssue; label: string }[] = [
  { id: "background_not_clean", label: "Background not clean" },
  { id: "wrong_colours", label: "Wrong colours" },
  { id: "lost_detail", label: "Lost detail" },
  { id: "other", label: "Other" },
];

export function QuickRating({ featureId, onRetry }: Props) {
  const status = useAppSelector(s => s.status.data);

  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<FeedbackIssue | null>(null);
  const [otherText, setOtherText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Opt-out check
  if (!status?.feedbackPromptsEnabled) return null;

  async function handleRatingClick(rating: FeedbackRating) {
    setSelectedRating(rating);
    if (rating === "retry" && onRetry) {
      onRetry();
    }
    if (rating !== "thumbs_down") {
      setSubmitted(true);
      try {
        await submitFeedback({
          type: "rating",
          feature: featureId,
          rating,
        });
      } catch (err) {
        // Silently handle quick rating errors
      }
    }
  }

  async function handleIssueClick(issue: FeedbackIssue) {
    setSelectedIssue(issue);
    if (issue !== "other") {
      setSubmitted(true);
      try {
        await submitFeedback({
          type: "rating",
          feature: featureId,
          rating: "thumbs_down",
          issue,
        });
      } catch (err) {
        // Silently handle
      }
    }
  }

  async function handleOtherSubmit() {
    if (!otherText.trim()) return;
    setSubmitted(true);
    try {
      await submitFeedback({
        type: "rating",
        feature: featureId,
        rating: "thumbs_down",
        issue: "other",
        issue_text: otherText.trim(),
      });
    } catch (err) {
      // Silently handle
    }
  }

  if (submitted) {
    return (
      <div className="quick-rating">
        <div className="rating-sent" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Check size={12} /> Thanks for your feedback!
        </div>
      </div>
    );
  }

  return (
    <div className="quick-rating">
      <div className="quick-rating-label">How did that look?</div>
      <div className="quick-rating-btns">
        <button
          className={`quick-rating-btn ${selectedRating === "thumbs_up" ? "selected" : ""}`}
          onClick={() => handleRatingClick("thumbs_up")}
        >
          <ThumbsUp size={12} /> Great
        </button>
        <button
          className={`quick-rating-btn ${selectedRating === "thumbs_down" ? "selected" : ""}`}
          onClick={() => handleRatingClick("thumbs_down")}
        >
          <ThumbsDown size={12} /> Not great
        </button>
        {onRetry && (
          <button
            className={`quick-rating-btn ${selectedRating === "retry" ? "selected" : ""}`}
            onClick={() => handleRatingClick("retry")}
          >
            <RotateCcw size={12} /> Try again
          </button>
        )}
      </div>

      {selectedRating === "thumbs_down" && (
        <div className="rating-issues">
          <div className="quick-rating-label" style={{ width: "100%", marginTop: 4, marginBottom: 4 }}>
            What went wrong?
          </div>
          {ISSUES.map(issue => (
            <button
              key={issue.id}
              className={`rating-issue-chip ${selectedIssue === issue.id ? "selected" : ""}`}
              onClick={() => handleIssueClick(issue.id)}
            >
              {issue.label}
            </button>
          ))}

          {selectedIssue === "other" && (
            <div style={{ display: "flex", gap: 4, width: "100%", justifyContent: "center", marginTop: 4 }}>
              <input
                type="text"
                className="rating-other-input"
                placeholder="Tell us what went wrong…"
                value={otherText}
                onChange={e => setOtherText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleOtherSubmit()}
                autoFocus
              />
              <button
                className="quick-rating-btn selected"
                onClick={handleOtherSubmit}
                style={{ marginTop: 6, padding: "6px 10px" }}
              >
                <Send size={11} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
