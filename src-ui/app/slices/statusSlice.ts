import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  fetchPlanStatus,
  initCheckout as apiInitCheckout,
  initTopUp as apiInitTopUp,
  ApiError,
} from "../../shared/api/client";
import type { PlanStatus, CheckoutResponse, PackId } from "../../shared/types/api";

// Plain thunks — NOT RTK Query. Each one just calls the module-level apiFetch
// client directly. No cache, no tags, no header-building middleware that can
// race with when window.__figmaUserId / window.__sessionToken get set.

export const loadPlanStatus = createAsyncThunk<PlanStatus, void, { rejectValue: string }>(
  "status/load",
  async (_void, { rejectWithValue }) => {
    try {
      return await fetchPlanStatus();
    } catch (err) {
      return rejectWithValue(err instanceof ApiError ? err.message : "network error");
    }
  }
);

export const initCheckout = createAsyncThunk<CheckoutResponse, "starter" | "pro", { rejectValue: string }>(
  "status/initCheckout",
  async (planId, { rejectWithValue }) => {
    try {
      return await apiInitCheckout(planId);
    } catch (err) {
      return rejectWithValue(err instanceof ApiError ? err.message : "Checkout failed.");
    }
  }
);

export const initTopUp = createAsyncThunk<{ checkoutUrl: string }, PackId, { rejectValue: string }>(
  "status/initTopUp",
  async (packId, { rejectWithValue }) => {
    try {
      return await apiInitTopUp(packId);
    } catch (err) {
      return rejectWithValue(err instanceof ApiError ? err.message : "Top-up failed.");
    }
  }
);

interface StatusState {
  data: PlanStatus | null;
  loading: boolean;
  error: string | null;
}

const initialState: StatusState = { data: null, loading: false, error: null };

const statusSlice = createSlice({
  name: "status",
  initialState,
  reducers: {
    setPlanStatus: (s, a: PayloadAction<PlanStatus>) => {
      s.data = a.payload;
    },
    deductCredits: (s, a: PayloadAction<number>) => {
      if (s.data) {
        const amount = a.payload;
        if (s.data.credits >= amount) {
          s.data.credits -= amount;
        } else {
          const remaining = amount - s.data.credits;
          s.data.credits = 0;
          if (s.data.plan === "pro") {
            s.data.topupCreditsPro = Math.max(0, s.data.topupCreditsPro - remaining);
          } else {
            s.data.topupCreditsStarter = Math.max(0, s.data.topupCreditsStarter - remaining);
          }
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPlanStatus.pending, (s) => {
        s.loading = true;
        s.error = null;
      })
      .addCase(loadPlanStatus.fulfilled, (s, a) => {
        s.loading = false;
        s.data = a.payload;
      })
      .addCase(loadPlanStatus.rejected, (s, a) => {
        s.loading = false;
        s.data = null;
        s.error = a.payload ?? "network error";
      })
      .addCase(initCheckout.fulfilled, (_s, a) => {
        // Server is the source of truth for credits/plan — we don't
        // optimistically mutate here. Callers re-run loadPlanStatus.
        void a;
      });
  },
});

export const { setPlanStatus, deductCredits } = statusSlice.actions;
export default statusSlice.reducer;
