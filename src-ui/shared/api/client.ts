import type { FeatureId, PlanStatus, ManagePlanUrls, CheckoutResponse, PackId, RunFeatureOptions } from "../types/api";

// Confirmed against the handoff doc — the single source of truth for the base URL.
const API_BASE_URL = "https://removebgapi-pf6diz22ka-uc.a.run.app";

// Module-level token cache — NOT Redux state, NOT React state. This is the
// crux of the fix: RTK Query's fetchBaseQuery re-derives its prepareHeaders
// closure on every dispatch through the store/middleware pipeline, which
// introduced a race where the very first request(s) could fire before the
// figma-user-id / session token were actually readable at header-build time.
// A plain module-scoped variable, read synchronously inside apiFetch, has no
// such race: whatever the most recent successful /status call stored is what
// the next call sends, full stop.
let cachedSessionToken: string | null = null;
export function resetSession() {
  cachedSessionToken = null;
}
export function storeSessionToken(token: string) {
  cachedSessionToken = token;
}

function getFigmaUserId(): string {
  const stored = (window as unknown as { __figmaUserId?: string | null }).__figmaUserId;
  if (!stored) throw new Error("Figma user id not available yet");
  return stored;
}

// figma.currentUser.name is string | null in Figma's API. The backend
// handles empty strings identically to a missing header (converts to null
// before storing), so ?? "" is the correct guard.
function getFigmaDisplayName(): string {
  return (window as unknown as { __figmaDisplayName?: string }).__figmaDisplayName ?? "";
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("x-figma-user-id", getFigmaUserId());
  headers.set("x-figma-display-name", getFigmaDisplayName()); // required by backend
  if (cachedSessionToken) headers.set("Authorization", `Bearer ${cachedSessionToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers, cache: "no-store" });
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

async function parseError(response: Response): Promise<{ message: string; code?: string }> {
  try {
    const body = await response.json();
    return { message: body.message ?? `Request failed (${response.status})`, code: body.error ?? body.code };
  } catch {
    return { message: `Request failed (${response.status})` };
  }
}

// ---- Status ----

export async function fetchPlanStatus(): Promise<PlanStatus> {
  const response = await apiFetch(`/api/subscription/status?_t=${Date.now()}`);
  if (!response.ok) {
    const e = await parseError(response);
    throw new ApiError(e.message, response.status, e.code);
  }
  const d = await response.json();
  const status: PlanStatus = {
    plan: d.plan ?? "free",
    isActive: d.isActive ?? false,
    credits: d.credits ?? 0,
    topupCreditsStarter: d.topup_credits_starter ?? 0,
    topupCreditsPro: d.topup_credits_pro ?? 0,
    daysLeft: d.days_left ?? 0,
    subscriptionEndsAt: d.subscription_ends_at ?? null,
    canBuyTopup: d.can_buy_topup ?? false,
    scheduledPlanChange: d.scheduled_plan_change ?? null,
    scheduledCancelAt: d.scheduled_cancel_at ?? null,
    sessionToken: d.sessionToken ?? "",
    featuresLocked: d.features_locked === true,
  };
  if (status.sessionToken) storeSessionToken(status.sessionToken);
  return status;
}

// ---- Manage Plan (Paddle portal) ----

export async function fetchManagePlanUrls(): Promise<ManagePlanUrls> {
  const response = await apiFetch(`/api/subscription/manage-plan?_t=${Date.now()}`);
  if (!response.ok) {
    const e = await parseError(response);
    throw new ApiError(e.message, response.status, e.code);
  }
  const d = await response.json();
  return { portalUrl: d.portal_url, cancelUrl: d.cancel_url, updatePaymentUrl: d.update_payment_url };
}

// ---- Checkout ----

export async function initCheckout(planId: "starter" | "pro"): Promise<CheckoutResponse> {
  const response = await apiFetch("/api/checkout/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  if (!response.ok) {
    const e = await parseError(response);
    if (e.code === "already_on_plan") throw new ApiError("You're already on this plan.", response.status, e.code);
    if (e.code === "token_required" || e.code === "invalid_token")
      throw new ApiError("Session expired — reopening plugin.", response.status, e.code);
    throw new ApiError(e.message, response.status, e.code);
  }
  const d = await response.json();
  if (d.checkoutUrl) return { kind: "redirect", checkoutUrl: d.checkoutUrl };
  if (d.changedInPlace) return { kind: "changed_in_place", message: d.message ?? "Plan updated." };
  if (d.scheduled) return { kind: "scheduled", message: d.message ?? "Change scheduled.", effectiveAt: d.effective_at_estimate ?? null };
  throw new ApiError("Unexpected checkout response.", 200);
}

export async function initTopUp(packId: PackId): Promise<{ checkoutUrl: string }> {
  const response = await apiFetch("/api/checkout/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packId }),
  });
  if (!response.ok) {
    const e = await parseError(response);
    if (e.code === "plan_required") throw new ApiError("Upgrade to Starter or Pro to buy top-up credits.", response.status, e.code);
    throw new ApiError(e.message, response.status, e.code);
  }
  const d = await response.json();
  if (!d.checkoutUrl) throw new ApiError("Unexpected top-up response.", 200);
  return { checkoutUrl: d.checkoutUrl };
}

// ---- Features ----

const FEATURE_PATHS: Record<FeatureId, string> = {
  remove_bg_basic: "/api/features/remove-bg-basic",
  crop_resize: "/api/features/crop-resize",
  color_background_fill: "/api/features/color-background-fill",
  ai_background: "/api/features/ai-background",
  ai_shadows: "/api/features/ai-shadows",
  ai_relighting: "/api/features/ai-relighting",
  hd_export: "/api/features/hd-export",
  ai_upscale: "/api/features/ai-upscale",
  ai_image_gen: "/api/features/ai-image-gen",
  ai_logo_maker: "/api/features/ai-logo-maker",
};

const PROMPT_FEATURES: FeatureId[] = ["ai_image_gen", "ai_logo_maker"];

export async function runFeature(
  featureId: FeatureId,
  imageBytes: Uint8Array | null,
  options: RunFeatureOptions = {}
): Promise<Uint8Array> {
  const usesJson = PROMPT_FEATURES.includes(featureId);
  let path = FEATURE_PATHS[featureId];
  const qp = new URLSearchParams();
  if (options.outputSize) qp.set("outputSize", options.outputSize);
  if (options.color) qp.set("color", options.color);
  // AI Background: prompt goes in the query string (body is raw image bytes)
  if (options.prompt && !usesJson) qp.set("prompt", options.prompt);
  // AI Shadows
  if (options.shadowMode) qp.set("shadowMode", options.shadowMode);
  if (options.shadowDirection) qp.set("shadowDirection", options.shadowDirection);
  if (options.shadowIntensity) qp.set("shadowIntensity", options.shadowIntensity);
  if (options.shadowSpread) qp.set("shadowSpread", options.shadowSpread);
  // AI Relighting
  if (options.lightingMode && options.lightingMode !== "auto") qp.set("lightingMode", options.lightingMode);
  if ([...qp].length > 0) path += `?${qp.toString()}`;

  const response = usesJson
    ? await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: options.prompt ?? "" }),
      })
    : await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Blob([(imageBytes ?? new Uint8Array()) as unknown as ArrayBufferView<ArrayBuffer>]),
      });

  if (!response.ok) {
    const e = await parseError(response);
    const ERROR_MAP: Record<string, string> = {
      image_too_large_for_upscale: "Image too large — try under 1000×1000px. Credits refunded.",
      unsupported_color_format: "Use a named color (red, blue, white…), not a hex code.",
      insufficient_credits: "Not enough credits.",
      pro_plan_required: "This feature needs the Pro plan.",
      feature_provider_error: "Processing failed — your credits were automatically refunded.",
      invalid_shadow_direction: "Invalid shadow direction value.",
      invalid_shadow_intensity: "Shadow intensity must be between 0 and 1.",
      invalid_shadow_spread: "Shadow spread must be small, medium, or large.",
      invalid_lighting_mode: "Invalid lighting mode selected.",
    };
    throw new ApiError(ERROR_MAP[e.code ?? ""] ?? e.message, response.status, e.code);
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function cancelSubscription(): Promise<{ scheduled: boolean; cancelsAt: string; message: string }> {
  const response = await apiFetch("/api/subscription/cancel", {
    method: "POST",
  });
  if (!response.ok) {
    const e = await parseError(response);
    throw new ApiError(e.message, response.status, e.code);
  }
  const d = await response.json();
  return {
    scheduled: d.scheduled ?? false,
    cancelsAt: d.cancels_at ?? "",
    message: d.message ?? "",
  };
}

export async function reactivateSubscription(): Promise<{ reactivated: boolean; message: string }> {
  const response = await apiFetch("/api/subscription/reactivate", {
    method: "POST",
  });
  if (!response.ok) {
    const e = await parseError(response);
    throw new ApiError(e.message, response.status, e.code);
  }
  const d = await response.json();
  return {
    reactivated: d.reactivated ?? false,
    message: d.message ?? "",
  };
}

