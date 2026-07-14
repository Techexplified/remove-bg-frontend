import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Info, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { removeToast, openModal, setSection } from "../../../app/slices/uiSlice";

interface Props {
  onRetry?: () => void;
}

const AUTO_DISMISS_MS = 7000;

export function ToastStack({ onRetry }: Props) {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector(s => s.ui.toasts);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    toasts.forEach(t => {
      if (t.id === "checkout_progress") return; // don't auto-dismiss checkout progress
      if (timers.has(t.id)) return; // already scheduled
      const timer = setTimeout(() => {
        dispatch(removeToast(t.id));
        timers.delete(t.id);
      }, AUTO_DISMISS_MS);
      timers.set(t.id, timer);
    });
    // clean up timers for toasts that were manually dismissed
    timers.forEach((timer, id) => {
      if (!toasts.some(t => t.id === id)) {
        clearTimeout(timer);
        timers.delete(id);
      }
    });
  }, [toasts, dispatch]);

  const handleCta = (action: string) => {
    if (action === "topup") {
      dispatch(openModal({ kind: "coming_soon" }));
    } else if (action === "manage_plan") {
      dispatch(setSection("account"));
    } else if (action === "retry") {
      onRetry?.();
    }
  };

  const icons = {
    error: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
    info: Info
  };

  return (
    <div className="toast-stack">
      <AnimatePresence>
        {toasts.map(toast => {
          const Icon = icons[toast.kind] || Info;
          const isCheckoutProgress = toast.id === "checkout_progress";

          return (
            <motion.div
              key={toast.id}
              className={`toast toast-${toast.kind}`}
              initial={{ opacity: 0, x: 20, scale: .95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="toast-icon-wrap">
                {isCheckoutProgress ? <Loader2 size={14} className="spin" /> : <Icon size={14} />}
              </div>
              <div className="toast-content">
                <div className="toast-title">{toast.title}</div>
                {toast.message && <div className="toast-msg">{toast.message}</div>}
                {toast.cta && (
                  <button
                    className={`toast-cta toast-cta-${toast.cta.action}`}
                    onClick={() => {
                      handleCta(toast.cta!.action);
                      dispatch(removeToast(toast.id));
                    }}
                  >
                    {toast.cta.label}
                  </button>
                )}
              </div>
              <button className="toast-close" onClick={() => dispatch(removeToast(toast.id))}>
                <X size={12} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
