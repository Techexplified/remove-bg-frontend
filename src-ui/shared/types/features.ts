import type { Plan } from "./api";

export type FeatureId =
  | "remove_bg_basic"
  | "crop_resize"
  | "color_background_fill"
  | "ai_background"
  | "ai_shadows"
  | "ai_relighting"
  | "hd_export"
  | "ai_upscale"
  | "ai_image_gen"
  | "ai_logo_maker";

export interface FeatureDef {
  id: FeatureId;
  label: string;
  description: string;
  icon: string;
  credits: number;
  needsInputImage: boolean;
  needsPrompt: boolean;
  minPlan: Plan;
  needsOutputSize?: boolean;
  needsColor?: boolean;
  maxInputPixels?: number;
  badge?: "New" | "Popular" | "Preview" | "Free";
  hasSubScreen?: boolean; // AI features with dedicated output screens
}

export type ProcessingStage = "idle" | "exporting" | "uploading" | "processing" | "success" | "error";

export interface ProcessingState {
  stage: ProcessingStage;
  featureLabel?: string;
  errorMessage?: string;
  refunded?: boolean;
  progress?: number; // 0-100 for upload
  originalSize?: string;
  originalSub?: string;
  targetSize?: string;
  targetSub?: string;
  extraBullets?: string[];
}

export type SectionId = "features" | "toolbox" | "account" | "help" | "legal" | "settings";

export type ModalKind = "none" | "topup" | "plan_picker" | "prompt" | "options" | "coming_soon" | "feature_preview";

export interface Toast {
  id: string;
  kind: "error" | "info" | "success" | "warning";
  title: string;
  message?: string;
  cta?: { label: string; action: "topup" | "manage_plan" | "retry" };
}
