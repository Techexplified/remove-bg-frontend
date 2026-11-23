import { useState } from "react";
import {
  Mail,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Bug,
  CreditCard,
  CircleDollarSign,
  RefreshCw,
  Wrench,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { FAQ_DATA } from "../../shared/types/featureData";

interface Props {
  openExternal: (url: string) => void;
  onBack?: () => void;
}

const TOPICS = [
  { label: "Billing Issues", icon: CreditCard },
  { label: "Payment Issues", icon: CircleDollarSign },
  { label: "Subscription Help", icon: RefreshCw },
  { label: "Technical Issues", icon: Wrench },
  { label: "Feature Requests", icon: Sparkles },
];

const CAT_COLORS: Record<string, string> = {
  "Plans & Billing": "#0f172a",
  "Payments & Billing": "#0f172a",
  Credits: "#2563eb",
  "Account & Subscription": "#16a34a",
  "Upgrades & Downgrades": "#16a34a",
  Cancellation: "#ea580c",
  Technical: "#d97706",
  Refunds: "#d97706",
  "Contact & Support": "#0f172a",
  "Privacy & Data": "#16a34a",
};

const CAT_BG_COLORS: Record<string, string> = {
  "Plans & Billing": "rgba(15, 23, 42, 0.06)",
  "Payments & Billing": "rgba(15, 23, 42, 0.06)",
  Credits: "rgba(37, 99, 235, 0.08)",
  "Account & Subscription": "rgba(22, 163, 74, 0.08)",
  "Upgrades & Downgrades": "rgba(22, 163, 74, 0.08)",
  Cancellation: "rgba(234, 88, 12, 0.08)",
  Technical: "rgba(217, 119, 6, 0.08)",
  Refunds: "rgba(217, 119, 6, 0.08)",
  "Contact & Support": "rgba(15, 23, 42, 0.06)",
  "Privacy & Data": "rgba(22, 163, 74, 0.08)",
};

const CAT_CLASSES: Record<string, string> = {
  "Plans & Billing": "plans-billing",
  "Payments & Billing": "plans-billing",
  Refunds: "technical",
  Cancellation: "account-subscription",
  "Upgrades & Downgrades": "account-subscription",
  Credits: "credits",
  "Account & Subscription": "account-subscription",
  Technical: "technical",
  "Contact & Support": "plans-billing",
  "Privacy & Data": "account-subscription",
};

export function HelpScreen({ openExternal, onBack }: Props) {
  const [view, setView] = useState<"main" | "faq">("main");
  const [open, setOpen] = useState<number | null>(null);

  const previewQuestions = [
    'Why does my bank statement show "Dodo Payments" instead of Explified or RemoveBG?',
    "Will I be charged automatically every month?",
    "How do I cancel my subscription?",
    "What happens to my credits when I upgrade or downgrade?",
  ];

  const previewFaqs = FAQ_DATA.filter((f) => previewQuestions.includes(f.question));
  const categories = [...new Set(FAQ_DATA.map((f) => f.category))];

  const handlePreviewClick = (questionText: string) => {
    const idx = FAQ_DATA.findIndex((f) => f.question === questionText);
    setOpen(idx !== -1 ? idx : 0);
    setView("faq");
  };

  const handleViewAllFaqs = () => {
    if (open === null) {
      setOpen(0);
    }
    setView("faq");
  };

  if (view === "faq") {
    return (
      <div className="v2-settings-screen">
        <header className="v2-settings-header">
          <div className="v2-settings-header-left">
            <button
              type="button"
              className="v2-back-icon-btn"
              onClick={() => setView("main")}
              title="Back to help"
            >
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>
            <h1 className="v2-settings-title">Frequently Asked Questions</h1>
          </div>
        </header>

        <div className="v2-settings-body">
          {categories.map((cat) => {
            const catFaqs = FAQ_DATA.filter((f) => f.category === cat);
            if (catFaqs.length === 0) return null;

            return (
              <div key={cat} className="faq-section">
                <span
                  className="faq-cat-badge"
                  style={{
                    color: CAT_COLORS[cat] ?? "#475569",
                    backgroundColor: CAT_BG_COLORS[cat] ?? "#f1f5f9",
                    fontFamily: "Manrope, sans-serif",
                    fontWeight: 700,
                  }}
                >
                  {cat}
                </span>
                {catFaqs.map((faq) => {
                  const idx = FAQ_DATA.indexOf(faq);
                  const isOpen = open === idx;
                  const catClass = CAT_CLASSES[cat] ?? "technical";
                  return (
                    <div
                      key={faq.question}
                      className={`faq-item faq-item-${catClass} ${isOpen ? "expanded" : ""}`}
                    >
                      <div className="faq-q" onClick={() => setOpen(isOpen ? null : idx)}>
                        <span style={{ paddingRight: 8 }}>{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp size={14} color="#64748b" />
                        ) : (
                          <ChevronDown size={14} color="#64748b" />
                        )}
                      </div>
                      {isOpen && <div className="faq-a">{faq.answer}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="v2-settings-screen">
      <header className="v2-settings-header">
        <div className="v2-settings-header-left">
          {onBack && (
            <button
              type="button"
              className="v2-back-icon-btn"
              onClick={onBack}
              title="Back to account"
            >
              <ChevronLeft size={16} strokeWidth={2.4} />
            </button>
          )}
          <h1 className="v2-settings-title">Help & Support</h1>
        </div>
      </header>

      <div className="v2-settings-body">
        {/* Contact Support Card */}
        <div className="help-contact-card">
          <div className="help-contact-icon">
            <Mail size={20} />
          </div>
          <div className="help-contact-email">support@explified.com</div>
          <div className="help-contact-actions">
            <button
              type="button"
              className="v2-help-action-btn primary"
              onClick={() => openExternal("mailto:support@explified.com")}
            >
              Contact Support
            </button>
            <button
              type="button"
              className="v2-help-action-btn secondary"
              onClick={() => openExternal("mailto:support@explified.com?subject=Bug+Report")}
            >
              <Bug size={13} strokeWidth={2} color="#ef4444" />
              <span>Report a Bug</span>
            </button>
          </div>
        </div>

        {/* Need Help With Topics Card */}
        <div className="help-topics-card">
          <div className="help-topics-title">Need Help With?</div>
          <div className="help-topics-sub">Select a topic to get targeted support</div>
          <div className="help-topics-chips">
            {TOPICS.map((t) => (
              <button
                key={t.label}
                type="button"
                className="help-topic-chip"
                onClick={() =>
                  openExternal(
                    `mailto:support@explified.com?subject=${encodeURIComponent(t.label)}`
                  )
                }
              >
                <t.icon size={13} strokeWidth={2} className="help-topic-icon" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Preview */}
        <div className="v2-faq-preview-header">
          <div className="v2-faq-preview-title">
            Frequently Asked
          </div>
          <button
            type="button"
            className="v2-faq-view-link"
            onClick={handleViewAllFaqs}
          >
            <span>View All</span>
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </div>

        <div className="faq-preview-list">
          {previewFaqs.map((faq) => (
            <div
              key={faq.question}
              className="faq-preview-row"
              onClick={() => handlePreviewClick(faq.question)}
            >
              <span>{faq.question}</span>
              <ChevronRight size={13} color="#94a3b8" />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="v2-view-faq-btn"
          onClick={handleViewAllFaqs}
        >
          <BookOpen size={14} strokeWidth={2} className="v2-view-faq-icon" />
          <span>View Full FAQ</span>
          <ChevronRight size={14} strokeWidth={2} className="v2-view-faq-chevron" />
        </button>
      </div>
    </div>
  );
}
