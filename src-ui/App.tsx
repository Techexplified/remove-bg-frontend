import { useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Provider } from "react-redux";
import { store } from "./app/store";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { setProcessing, addToast, removeToast, openModal, setLastRun, setCheckoutOverlay } from "./app/slices/uiSlice";
import { CheckoutOverlay } from "./shared/components/CheckoutOverlay";
import { Sidebar } from "./shared/components/Sidebar";
import { ProcessingOverlay } from "./shared/components/ProcessingOverlay";
import { ToastStack } from "./shared/components/toasts/ToastStack";
import { TopUpModal } from "./shared/components/modals/TopUpModal";
import { PlanPickerModal } from "./shared/components/modals/PlanPickerModal";
import { PromptModal } from "./shared/components/modals/PromptModal";
import { FeatureOptionsModal } from "./shared/components/modals/FeatureOptionsModal";
import { ComingSoonModal } from "./shared/components/modals/ComingSoonModal";
import { FeaturePreviewModal } from "./shared/components/modals/FeaturePreviewModal";
import { FeaturesScreen } from "./features/features-screen/FeaturesScreen";
import { ToolboxScreen } from "./features/toolbox/ToolboxScreen";
import { AccountScreen } from "./features/account/AccountScreen";
import { HelpScreen } from "./features/help/HelpScreen";
import { LegalScreen } from "./features/legal/LegalScreen";
import { usePluginBridge } from "./shared/hooks/usePluginBridge";
import { useCheckoutWatcher } from "./shared/hooks/useCheckoutWatcher";
import { loadPlanStatus, deductCredits } from "./app/slices/statusSlice";
import { setOriginalUrl } from "./app/slices/figmaSlice";
import { runFeature, resetSession, ApiError } from "./shared/api/client";
import { removeBackgroundLocal } from "./shared/utils/fallbackRemoval";
import { isFeatureUnlocked, ALL_FEATURES } from "./shared/types/featureData";
import type { FeatureDef } from "./shared/types/features";
import type { FeatureId } from "./shared/types/api";

// ── Loading screen shown while waiting for figma bridge to send user identity ──
function LoadingScreen() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 16, background: "var(--surface-1)", padding: 32
    }}>
      <div style={{ width: 40, height: 40, border: "3px solid var(--brand-border)", borderTopColor: "var(--brand)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontSize: 12, color: "var(--text-3)", textAlign: "center" }}>
        Connecting to Figma…
      </div>
    </div>
  );
}

// ── Error screen shown if connection fails after timeout ──
function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 14, background: "var(--surface-1)", padding: 32, textAlign: "center"
    }}>
      <div style={{ fontSize: 24 }}>⚠️</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Couldn't connect</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.5 }}>
        The plugin couldn't verify your Figma account.<br />
        Try reloading the plugin.
      </div>
      <button className="btn btn-primary" onClick={onRetry} style={{ padding: "9px 20px" }}>
        ↻ Retry
      </button>
    </div>
  );
}

// ── Main app — only rendered after user identity is confirmed ──
function AppReady() {
  const dispatch = useAppDispatch();
  const activeSection = useAppSelector(s => s.ui.activeSection);
  const modal = useAppSelector(s => s.ui.modal);
  const lastRunOptions = useAppSelector(s => s.ui.lastRunOptions);
  const selection = useAppSelector(s => s.figma.selection);

  // AppReady is only mounted once hasReceivedUserId=true, so window.__figmaUserId
  // is already set by the time any of this fires.
  const status = useAppSelector(s => s.status.data);
  const refetch = useCallback(() => dispatch(loadPlanStatus()), [dispatch]);
  const checkoutWatcher = useCheckoutWatcher();
  const checkoutOverlay = useAppSelector(s => s.ui.checkoutOverlay);

  useEffect(() => {
    if (!checkoutOverlay.visible && checkoutWatcher.isWatching) {
      checkoutWatcher.stop();
    }
  }, [checkoutOverlay.visible, checkoutWatcher]);

  const bridge = usePluginBridge();
  const lastFeatureRef = useRef<FeatureDef | null>(null);

  const spendable = !status ? 0
    : status.credits + (status.plan === "pro" ? status.topupCreditsPro : status.topupCreditsStarter);

  const toast = useCallback((
    kind: "error" | "info" | "success" | "warning",
    title: string,
    message?: string,
    cta?: { label: string; action: "topup" | "manage_plan" | "retry" }
  ) => {
    dispatch(addToast({ id: `toast_${Date.now()}_${Math.random()}`, kind, title, message, cta }));
  }, [dispatch]);

  const executeFeature = useCallback(async (
    feature: FeatureDef,
    opts: Record<string, string | undefined> = {},
    localBytes?: Uint8Array
  ) => {
    if (!status) return;
    lastFeatureRef.current = feature;
    dispatch(setLastRun({ featureId: feature.id as FeatureId, options: opts }));

    try {
      let imageBytes: Uint8Array | null = null;
      if (feature.needsInputImage) {
        if (localBytes) {
          imageBytes = localBytes;
        } else {
          dispatch(setProcessing({ stage: "exporting" }));
          imageBytes = await bridge.exportSelectedImage();
        }
        if (imageBytes) {
          const blob = new Blob([imageBytes], { type: "image/png" });
          dispatch(setOriginalUrl(URL.createObjectURL(blob)));
        }
      }
      let result: Uint8Array;
      if (feature.id === "remove_bg_basic" && status.credits < 1 && imageBytes) {
        dispatch(setProcessing({ stage: "processing", featureLabel: feature.label + " (Local Fallback)" }));
        result = await removeBackgroundLocal(imageBytes);
      } else {
        dispatch(setProcessing({ stage: "uploading", featureLabel: feature.label }));
        await new Promise(r => setTimeout(r, 250));
        dispatch(setProcessing({ stage: "processing", featureLabel: feature.label }));
        result = await runFeature(feature.id as FeatureId, imageBytes, opts);
      }

      let originalSize: string | undefined;
      let originalSub: string | undefined;
      let targetSize: string | undefined;
      let targetSub: string | undefined;
      let extraBullets: string[] | undefined;

      if (feature.id === "crop_resize") {
        const inputW = selection.hasSelection ? selection.width : 3000;
        const inputH = selection.hasSelection ? selection.height : 4000;
        originalSize = `${Math.round(inputW)}×${Math.round(inputH)}`;
        originalSub = "(messy framing)";
        
        let targetW = 1080;
        let targetH = 1080;
        if (opts.outputSize) {
          const parts = opts.outputSize.split("x");
          if (parts.length === 2) {
            targetW = parseInt(parts[0], 10) || 1080;
            targetH = parseInt(parts[1], 10) || 1080;
          }
        }
        targetSize = `${targetW}×${targetH}`;
        targetSub = "(subject centered)";
        extraBullets = ["Subject auto-centered", "Smart padding applied"];
      } else if (feature.id === "hd_export") {
        const inputW = selection.hasSelection ? selection.width : 1200;
        const inputH = selection.hasSelection ? selection.height : 1200;
        const inputMP = (inputW * inputH) / 1000000;
        originalSize = `${Math.round(inputW)}×${Math.round(inputH)}`;
        originalSub = `${inputMP.toFixed(1)} MP`;

        const targetMP = opts.outputSize === "full" ? 36 : 16;
        const scale = Math.sqrt((targetMP * 1000000) / (inputW * inputH));
        const targetW = Math.round(inputW * scale);
        const targetH = Math.round(inputH * scale);

        targetSize = `${targetW}×${targetH}`;
        targetSub = `${targetMP} MP`;
        
        const pixelGain = Math.round(targetMP / inputMP);
        extraBullets = [
          `${pixelGain}× more pixels`,
          "Print-ready at 300 DPI"
        ];
      }

      bridge.insertResultImage(result);
      dispatch(setProcessing({
        stage: "success",
        featureLabel: feature.label,
        originalSize,
        originalSub,
        targetSize,
        targetSub,
        extraBullets,
      }));
      // Optimistically deduct credits immediately so the hero card updates right away.
      // We do not re-fetch /status here because the client-side deduction is already accurate,
      // and fetching /status immediately or shortly after can race with the backend database commit,
      // causing the credits to temporarily revert to the old value.
      if (status.credits >= feature.credits && feature.credits > 0) {
        dispatch(deductCredits(feature.credits));
      }

    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong.";
      const code = err instanceof ApiError ? err.code : "";
      const status_code = err instanceof ApiError ? err.status : 0;
      
      const refunded = err instanceof ApiError && err.code === "feature_provider_error";
      dispatch(setProcessing({ stage: "error", errorMessage: msg, refunded }));

      // 1. Network Connection Issue
      const isNetworkError = err instanceof TypeError || (err instanceof Error && (err.message.includes("Failed to fetch") || err.message.includes("network error") || err.message.includes("Figma user id not available")));
      
      // 2. Unsupported format
      const isUnsupportedFormat = msg.toLowerCase().includes("format") || code === "unsupported_image_format";

      // 3. Image Too Large
      const isImageTooLarge = msg.toLowerCase().includes("too large") || code === "image_too_large" || code === "image_too_large_for_upscale";

      // 4. AI Service Down
      const isAiDown = code === "feature_provider_error" || code === "pro_features_locked" || status_code === 503 || status_code === 504;

      // 5. Out of credits
      const isOutOfCredits = code === "insufficient_credits" || msg.toLowerCase().includes("credits") || msg.toLowerCase().includes("run out");

      // 6. Subscription Inactive
      const isSubInactive = code === "subscription_inactive" || msg.toLowerCase().includes("inactive") || (status && !status.isActive && status.plan !== "free");

      if (isNetworkError) {
        toast("error", "No internet connection", "Check your connection and try again.");
      } else if (isUnsupportedFormat) {
        toast("error", "Format not supported", "Please use JPEG, PNG, or WebP files.");
      } else if (isImageTooLarge) {
        toast("error", "Image is too large", "Maximum size is 25 MB. Please compress and retry.");
      } else if (isAiDown) {
        toast("error", "AI service is down", "Our AI provider is temporarily unavailable. Credits preserved.");
      } else if (isOutOfCredits) {
        toast("warning", "You're out of credits", "Top up to continue processing images.", {
          label: "+ Top Up Credits",
          action: status.plan === "free" ? "manage_plan" : "topup"
        });
      } else if (isSubInactive) {
        toast("warning", "Subscription inactive", "Your plan is not active. Manage your subscription to continue.", {
          label: "Manage Plan",
          action: "manage_plan"
        });
      } else {
        toast("error", "Something went wrong", "An unexpected error occurred. Your credits are safe — please retry.", {
          label: "Retry",
          action: "retry"
        });
      }
    }
  }, [status, dispatch, runFeature, bridge, toast]);

  function handleRunFeature(feature: FeatureDef, localBytes?: Uint8Array) {
    if (!status) return;
    if (!isFeatureUnlocked(feature, status.plan)) {
      dispatch(openModal({ kind: "plan_picker" }));
      return;
    }
    // If using locally uploaded image, skip canvas selection checks
    if (!localBytes) {
      const selCount = selection.hasSelection ? selection.count : 0;
      if (feature.needsInputImage && (!selection.hasSelection || selCount > 1)) {
        toast("error", selCount > 1 ? "Multiple layers selected" : "No layer selected",
          selCount > 1 ? "Select a single layer, or use Batch mode in Toolbox." : "Select an image on the canvas first.");
        return;
      }
      if (feature.maxInputPixels && selection.hasSelection && selection.count === 1
        && selection.pixelCount > feature.maxInputPixels) {
        toast("error", "Image is too large",
          `AI Upscale works on images up to ~1000×1000px. Your selection is ${Math.round(selection.pixelCount / 1e4) / 100}MP.`);
        return;
      }
    }
    if (spendable < feature.credits) {
      if (feature.id === "remove_bg_basic") {
        toast("warning", "You're out of credits",
          "now you upgrade your plan to get high quality results.", {
            label: status.plan === "free" ? "Upgrade Plan" : "+ Top Up Credits",
            action: status.plan === "free" ? "manage_plan" : "topup",
          });
        // Proceed with fallback execution
      } else {
        toast("warning", "You're out of credits",
          `This feature costs ${feature.credits} credit${feature.credits > 1 ? "s" : ""}. You have ${spendable}.`, {
            label: status.plan === "free" ? "Upgrade Plan" : "+ Top Up Credits",
            action: status.plan === "free" ? "manage_plan" : "topup",
          });
        return;
      }
    }
    void executeFeature(feature, {}, localBytes);
  }

  function handlePromptSubmit(featureId: FeatureId, prompt: string) {
    const f = ALL_FEATURES.find(f => f.id === featureId);
    if (f) void executeFeature(f, { prompt });
  }

  function handleOptionsSubmit(featureId: FeatureId, opts: Record<string, string | undefined>) {
    const f = ALL_FEATURES.find(f => f.id === featureId);
    if (f) void executeFeature(f, opts);
  }

  function handleCheckoutOpen(url: string, type: "plan" | "topup") {
    if (!status) return;
    const baseline = status;
    bridge.openExternal(url);

    // Show the full-screen checkout overlay immediately
    dispatch(setCheckoutOverlay({ visible: true, type, stage: "verifying" }));

    checkoutWatcher.start(baseline, {
      isSatisfied: type === "topup"
        ? (_, after) => {
            const prev = baseline.plan === "pro" ? baseline.topupCreditsPro : baseline.topupCreditsStarter;
            const curr = after.plan === "pro" ? after.topupCreditsPro : after.topupCreditsStarter;
            return curr > prev;
          }
        : (_, after) => after.plan !== baseline.plan && after.isActive,
      onSettled: outcome => {
        if (outcome === "confirmed") {
          dispatch(setCheckoutOverlay({ visible: true, type, stage: "confirmed" }));
        } else if (outcome === "timed_out") {
          // Hide overlay, show a toast so user isn't stuck
          dispatch(setCheckoutOverlay({ visible: false, type, stage: "verifying" }));
          toast("info", "Still processing", "Credits will appear shortly — check back in a moment.");
        } else {
          // stopped (user closed)
          dispatch(setCheckoutOverlay({ visible: false, type, stage: "verifying" }));
        }
      },
    });
  }

  const handleRetryLast = () => {
    if (lastFeatureRef.current) {
      void executeFeature(lastFeatureRef.current, lastRunOptions as Record<string, string>);
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          className="content-pane"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
        >
          {activeSection === "features" && (
            <FeaturesScreen
              onRunFeature={handleRunFeature}
              onManagePlan={() => dispatch(openModal({ kind: "plan_picker" }))}
              onTopUp={() => dispatch(openModal({ kind: "topup" }))}
              watching={checkoutWatcher.isWatching}
              onStopWatching={checkoutWatcher.stop}
            />
          )}
          {activeSection === "toolbox" && (
            <ToolboxScreen
              onApplyAdjustments={bridge.applyAdjustments}
              onResize={bridge.resizeSelection}
              listSelection={bridge.listSelection}
              exportNode={bridge.exportNode}
              insertResultImage={bridge.insertResultImage}
              notify={bridge.notify}
            />
          )}
          {activeSection === "account" && (
            <AccountScreen
              onManagePlan={() => dispatch(openModal({ kind: "plan_picker" }))}
              onTopUp={() => dispatch(openModal({ kind: "topup" }))}
              openExternal={bridge.openExternal}
              watching={checkoutWatcher.isWatching}
              onStopWatching={checkoutWatcher.stop}
            />
          )}
          {activeSection === "help" && <HelpScreen openExternal={bridge.openExternal} />}
          {activeSection === "legal" && <LegalScreen openExternal={bridge.openExternal} />}
        </motion.div>
      </AnimatePresence>

      <ProcessingOverlay onRetry={handleRetryLast} />
      <ToastStack onRetry={handleRetryLast} />
      <CheckoutOverlay />

      {modal.kind === "topup" && <TopUpModal onCheckoutOpen={handleCheckoutOpen} />}
      {modal.kind === "plan_picker" && (
        <PlanPickerModal
          onCheckoutOpen={handleCheckoutOpen}
          onScheduled={msg => toast("success", "Plan updated!", msg)}
        />
      )}
      {modal.kind === "prompt" && <PromptModal onSubmit={handlePromptSubmit} />}
      {modal.kind === "options" && <FeatureOptionsModal onSubmit={handleOptionsSubmit} />}
      {modal.kind === "coming_soon" && <ComingSoonModal />}
      {modal.kind === "feature_preview" && <FeaturePreviewModal />}
    </>
  );
}

// ── Root shell — handles startup, waits for Figma bridge ──
function AppShell() {
  const dispatch = useAppDispatch();
  const hasReceivedUserId = useAppSelector(s => s.figma.hasReceivedUserId);
  const userId = useAppSelector(s => s.figma.userId);
  const bridge = usePluginBridge();

  // On every plugin open: clear the stale session token so the first /status
  // call goes without a bearer token (first-call semantics per the handoff doc).
  // The fresh token comes back in the response and gets cached by client.ts.
  useEffect(() => {
    resetSession();
  }, []);

  // Retry getting user ID at 5s (handles timing race where UI ready before code.ts)
  useEffect(() => {
    if (hasReceivedUserId) return;
    const retry = setTimeout(() => bridge.requestUserIdRetry(), 5000);
    return () => clearTimeout(retry);
  }, [hasReceivedUserId, bridge]);

  // Once we have the user ID, trigger the first /status fetch
  useEffect(() => {
    if (!hasReceivedUserId || !userId) return;
    dispatch(loadPlanStatus());
  }, [hasReceivedUserId, userId, dispatch]);

  const isReady = hasReceivedUserId && !!userId;
  const [timedOut, setTimedOut] = React.useState(false);

  useEffect(() => {
    if (isReady) return;
    const t = setTimeout(() => setTimedOut(true), 15000);
    return () => clearTimeout(t);
  }, [isReady]);

  return (
    <div className="app">
      <Sidebar />
      {!isReady && !timedOut && <LoadingScreen />}
      {!isReady && timedOut && <ErrorScreen onRetry={() => bridge.requestUserIdRetry()} />}
      {isReady && <AppReady />}
    </div>
  );
}

// Need React for useState in AppShell
import React from "react";

export function App() {
  return (
    <Provider store={store}>
      <AppShell />
    </Provider>
  );
}
