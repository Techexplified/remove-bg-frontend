import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { submitFeedback } from "../../api/client";
import { loadPlanStatus } from "../../../app/slices/statusSlice";
import type { ReviewPromptResponse } from "../../types/api";

interface Props {
  openExternal: (url: string) => void;
}

// Default plugin ID placeholder as noted in plan
const FIGMA_COMMUNITY_REVIEW_URL = "https://www.figma.com/community/plugin/1643987146382893434/zerobg-background-remover-and-ai-image-editor";

export function ReviewPrompt({ openExternal }: Props) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.status.data);
  const sessionUseCount = useAppSelector(s => s.ui.sessionUseCount);
  const showExitIntent = useAppSelector(s => s.ui.showExitIntent);
  const processingStage = useAppSelector(s => s.ui.processing.stage);

  const [dismissedLocally, setDismissedLocally] = useState(false);

  // Conditions check — Part E: Never stack soft-asks (yield if exit intent or processing modal active)
  if (
    !status ||
    status.reviewPromptShown ||
    !status.feedbackPromptsEnabled ||
    sessionUseCount < 3 ||
    showExitIntent ||
    processingStage !== "idle" ||
    dismissedLocally
  ) {
    return null;
  }

  async function handleResponse(response: ReviewPromptResponse) {
    setDismissedLocally(true);

    try {
      await submitFeedback({
        type: "review_prompt",
        response,
      });
      // Refresh status so reviewPromptShown = true in store
      dispatch(loadPlanStatus());
    } catch (err) {
      // Silently handle
    }

    if (response === "agreed") {
      openExternal(FIGMA_COMMUNITY_REVIEW_URL);
    }
  }

  return (
    <div className="review-prompt">
      <div className="review-prompt-emoji">😊</div>
      <div className="review-prompt-title">Enjoying RemoveBG?</div>
      <div className="review-prompt-desc">
        A quick review on Figma Community helps us grow and build more features for you.
      </div>

      <div className="review-prompt-actions">
        <button
          className="review-prompt-btn primary"
          onClick={() => handleResponse("agreed")}
        >
          Leave a Review →
        </button>
        <button
          className="review-prompt-btn secondary"
          onClick={() => handleResponse("dismissed")}
        >
          Maybe Later
        </button>
        <button
          className="review-prompt-btn secondary"
          onClick={() => handleResponse("already_done")}
        >
          Already Done
        </button>
      </div>
    </div>
  );
}
