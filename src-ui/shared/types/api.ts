// ============================================================================
// API Response Types — confirmed against FRONTEND_HANDOFF_FINAL.md
// ============================================================================

export type Plan = "free" | "starter" | "pro";

export interface PlanStatus {
  plan: Plan;
  isActive: boolean;
  credits: number;
  topupCreditsStarter: number;
  topupCreditsPro: number;
  daysLeft: number;
  subscriptionEndsAt: string | null;
  canBuyTopup: boolean;
  scheduledPlanChange: "starter" | "pro" | null;
  scheduledCancelAt: string | null; // non-null = cancelled but access until this date
  sessionToken: string;
  /** When true: Pro plan, Pro top-ups, and all AI features are server-side locked. */
  featuresLocked: boolean;
  // ── AI Trial + Feedback fields (Section 3 of handoff) ──
  aiTrialUsed: boolean;
  featureInterests: string[];
  feedbackPromptsEnabled: boolean;
  reviewPromptShown: boolean;
}

export interface ManagePlanUrls {
  portalUrl: string;
  cancelUrl: string;
  updatePaymentUrl: string;
}

export type CheckoutResponse =
  | { kind: "redirect"; checkoutUrl: string }
  | { kind: "changed_in_place"; message: string }
  | { kind: "scheduled"; message: string; effectiveAt: string | null };

export type FeatureId =
  | "remove_bg_basic" | "crop_resize" | "color_background_fill"
  | "ai_background" | "ai_shadows" | "ai_relighting"
  | "hd_export" | "ai_upscale" | "ai_image_gen" | "ai_logo_maker";

export type PackId = "small" | "medium";

export interface RunFeatureOptions {
  prompt?: string;
  outputSize?: string;
  dimensions?: string;
  color?: string;
  shadowMode?: string;        // "soft" | "hard"
  shadowDirection?: string;   // "left"|"right"|"behind"|"behindLeft"|"behindRight"
  shadowIntensity?: string;   // "0.0".."1.0"
  shadowSpread?: string;      // "small" | "medium" | "large"
  lightingMode?: string;      // "auto"|"preserve-colors"|"portrait"
}

// ── Feedback API types ──

export type FeedbackRating = "thumbs_up" | "thumbs_down" | "retry";
export type FeedbackIssue = "background_not_clean" | "wrong_colours" | "lost_detail" | "other";
export type ReviewPromptResponse = "agreed" | "dismissed" | "already_done";

export type FeedbackPayload =
  | { type: "rating"; feature: FeatureId; rating: FeedbackRating; issue?: FeedbackIssue; issue_text?: string }
  | { type: "paywall_exit_interest"; feature: FeatureId | "other"; other_text?: string }
  | { type: "review_prompt"; response: ReviewPromptResponse }
  | { type: "open"; message?: string; star_rating?: number };

export interface PreferencesPayload {
  feature_interests?: string[];
  feedback_prompts_enabled?: boolean;
}
