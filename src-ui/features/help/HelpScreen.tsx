import { useState } from "react";
import { Mail, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Bug } from "lucide-react";
import { FAQ_DATA } from "../../shared/types/featureData";

interface Props { openExternal: (url: string) => void; }

const TOPICS = [
  { label: "Billing Issues", icon: "💳", className: "chip-billing" },
  { label: "Payment Issues", icon: "💰", className: "chip-payment" },
  { label: "Subscription Help", icon: "🔄", className: "chip-subscription" },
  { label: "Technical Issues", icon: "🔧", className: "chip-technical" },
  { label: "Feature Requests", icon: "⭐", className: "chip-feature" },
];

const CAT_COLORS: Record<string, string> = {
  "Plans & Billing": "#6c47ff",
  "Payments & Billing": "#6c47ff",
  "Credits": "#2563eb",
  "Account & Subscription": "#16a34a",
  "Upgrades & Downgrades": "#16a34a",
  "Cancellation": "#16a34a",
  "Technical": "#d97706",
  "Refunds": "#d97706",
  "Contact & Support": "#6c47ff",
  "Privacy & Data": "#16a34a"
};

const CAT_BG_COLORS: Record<string, string> = {
  "Plans & Billing": "rgba(108,71,255,.08)",
  "Payments & Billing": "rgba(108,71,255,.08)",
  "Credits": "rgba(37,99,235,.08)",
  "Account & Subscription": "rgba(22,163,74,.08)",
  "Upgrades & Downgrades": "rgba(22,163,74,.08)",
  "Cancellation": "rgba(22,163,74,.08)",
  "Technical": "rgba(217,119,6,.08)",
  "Refunds": "rgba(217,119,6,.08)",
  "Contact & Support": "rgba(108,71,255,.08)",
  "Privacy & Data": "rgba(22,163,74,.08)"
};

const CAT_CLASSES: Record<string, string> = {
  "Plans & Billing": "plans-billing",
  "Payments & Billing": "plans-billing",
  "Refunds": "technical",
  "Cancellation": "account-subscription",
  "Upgrades & Downgrades": "account-subscription",
  "Credits": "credits",
  "Account & Subscription": "account-subscription",
  "Technical": "technical",
  "Contact & Support": "plans-billing",
  "Privacy & Data": "account-subscription"
};

export function HelpScreen({ openExternal }: Props) {
  const [view, setView] = useState<"main" | "faq">("main");
  const [open, setOpen] = useState<number | null>(null);

  // We want the 4 questions from the screenshot for the preview list
  const previewQuestions = [
    "Why does my bank statement show \"Dodo Payments\" instead of Explified or ZeroBG?",
    "Will I be charged automatically every month?",
    "How do I cancel my subscription?",
    "What happens to my credits when I upgrade or downgrade?"
  ];

  const previewFaqs = FAQ_DATA.filter(f => previewQuestions.includes(f.question));
  const categories = [...new Set(FAQ_DATA.map(f => f.category))];

  const handlePreviewClick = (questionText: string) => {
    const idx = FAQ_DATA.findIndex(f => f.question === questionText);
    setOpen(idx !== -1 ? idx : 0);
    setView("faq");
  };

  const handleViewAllFaqs = () => {
    // Open the first FAQ item by default if nothing else is chosen
    if (open === null) {
      setOpen(0);
    }
    setView("faq");
  };

  if (view === "faq") {
    return (
      <>
        <div className="breadcrumb-container">
          <button className="breadcrumb-link" onClick={() => setView("main")}>
            <ChevronLeft size={13} /> Help & Support
          </button>
        </div>
        <div className="pane-header">
          <h2>FAQ</h2>
          <p>Answers to common questions</p>
        </div>
        <div className="pane-body" style={{ paddingTop: 10 }}>
          {categories.map(cat => {
            const catFaqs = FAQ_DATA.filter(f => f.category === cat);
            if (catFaqs.length === 0) return null;

            return (
              <div key={cat} className="faq-section">
                <span className="faq-cat-badge" style={{
                  color: CAT_COLORS[cat] ?? "var(--c-text-3)",
                  backgroundColor: CAT_BG_COLORS[cat] ?? "var(--c-bg-2)"
                }}>
                  {cat}
                </span>
                {catFaqs.map((faq, i) => {
                  const idx = FAQ_DATA.indexOf(faq);
                  const isOpen = open === idx;
                  const catClass = CAT_CLASSES[cat] ?? "technical";
                  return (
                    <div key={i} className={`faq-item faq-item-${catClass} ${isOpen ? "expanded" : ""}`}>
                      <div className="faq-q" onClick={() => setOpen(isOpen ? null : idx)}>
                        <span style={{ paddingRight: 8 }}>{faq.question}</span>
                        {isOpen ? <ChevronUp size={14} color="var(--c-text-3)" /> : <ChevronDown size={14} color="var(--c-text-3)" />}
                      </div>
                      {isOpen && <div className="faq-a">{faq.answer}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="pane-footer">
          <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/privacy-policy"); }}>Privacy</a> ·{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/terms-of-service"); }}>Terms</a> ·{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); openExternal("mailto:support@explified.com"); }}>Support</a>
          <br />
          Built by Explified 
        </div>
      </>
    );
  }

  return (
    <>
      <div className="pane-header">
        <h2>Help & Support</h2>
        <p>We're here to help</p>
      </div>
      <div className="pane-body">
        <div className="help-contact-card">
          <div className="help-contact-icon"><Mail size={20} /></div>
          <div className="help-contact-email">support@explified.com</div>
          <div className="help-contact-actions">
            <button className="btn btn-primary" onClick={() => openExternal("mailto:support@explified.com")}>Contact Support</button>
            <button className="btn btn-danger" onClick={() => openExternal("mailto:support@explified.com?subject=Bug+Report")}>
              <Bug size={12} />Report a Bug
            </button>
          </div>
        </div>

        <div className="help-topics-card">
          <div className="help-topics-title">Need Help With?</div>
          <div className="help-topics-sub">Select a topic to get targeted support</div>
          <div className="help-topics-chips">
            {TOPICS.map(t => (
              <button key={t.label} className={`help-topic-chip ${t.className}`}
                onClick={() => openExternal(`mailto:support@explified.com?subject=${encodeURIComponent(t.label)}`)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, padding: "0 2px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)" }}>Frequently Asked</div>
          <button className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px", border: "none", color: "var(--brand)" }} onClick={handleViewAllFaqs}>
            View All <ChevronRight size={12} style={{ marginLeft: 2, display: "inline-block", verticalAlign: "middle" }} />
          </button>
        </div>

        <div className="faq-preview-list">
          {previewFaqs.map((faq, i) => (
            <div key={i} className="faq-preview-row" onClick={() => handlePreviewClick(faq.question)}>
              <span>{faq.question}</span>
              <ChevronRight size={13} color="var(--c-text-3)" />
            </div>
          ))}
        </div>

        <button className="btn btn-block" style={{ marginTop: 12, display: "flex", gap: "6px", justifyContent: "center" }} onClick={handleViewAllFaqs}>
          📖 View Full FAQ
        </button>
      </div>
      <div className="pane-footer">
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/privacy-policy"); }}>Privacy</a> ·{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/terms-of-service"); }}>Terms</a> ·{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("mailto:support@explified.com"); }}>Support</a>
        <br />
        Built by Explified 
      </div>
    </>
  );
}
