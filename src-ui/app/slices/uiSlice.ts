import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { SectionId, ModalKind, Toast, ProcessingState } from "../../shared/types/features";
import type { FeatureId } from "../../shared/types/api";

interface CheckoutOverlay {
  visible: boolean;
  type: "plan" | "topup";
  stage: "verifying" | "confirmed" | "failed";
  message?: string;
}

interface UIState {
  activeSection: SectionId;
  activeAIFeature: FeatureId | null;
  modal: { kind: ModalKind; featureId?: FeatureId };
  processing: ProcessingState;
  toasts: Toast[];
  lastRunFeatureId: FeatureId | null;
  lastRunOptions: Record<string, string | undefined>;
  checkoutOverlay: CheckoutOverlay;
}

const initialState: UIState = {
  activeSection: "features",
  activeAIFeature: null,
  modal: { kind: "none" },
  processing: { stage: "idle" },
  toasts: [],
  lastRunFeatureId: null,
  lastRunOptions: {},
  checkoutOverlay: { visible: false, type: "topup", stage: "verifying" },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setSection: (s, a: PayloadAction<SectionId>) => { s.activeSection = a.payload; s.modal = { kind: "none" }; },
    setAIFeature: (s, a: PayloadAction<FeatureId | null>) => { s.activeAIFeature = a.payload; },
    openModal: (s, a: PayloadAction<{ kind: ModalKind; featureId?: FeatureId }>) => { s.modal = a.payload; },
    closeModal: (s) => { s.modal = { kind: "none" }; },
    setProcessing: (s, a: PayloadAction<ProcessingState>) => { s.processing = a.payload; },
    addToast: (s, a: PayloadAction<Toast>) => { s.toasts.push(a.payload); },
    removeToast: (s, a: PayloadAction<string>) => { s.toasts = s.toasts.filter(t => t.id !== a.payload); },
    setLastRun: (s, a: PayloadAction<{ featureId: FeatureId; options: Record<string, string | undefined> }>) => {
      s.lastRunFeatureId = a.payload.featureId;
      s.lastRunOptions = a.payload.options;
    },
    setCheckoutOverlay: (s, a: PayloadAction<Partial<CheckoutOverlay> & { visible: boolean }>) => {
      s.checkoutOverlay = { ...s.checkoutOverlay, ...a.payload };
    },
  },
});

export const { setSection, setAIFeature, openModal, closeModal, setProcessing, addToast, removeToast, setLastRun, setCheckoutOverlay } = uiSlice.actions;
export default uiSlice.reducer;
