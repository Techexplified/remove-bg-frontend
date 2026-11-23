import { Shield, FileText, RefreshCw, Lock, ExternalLink, HelpCircle, ChevronLeft } from "lucide-react";

interface Props {
  openExternal: (url: string) => void;
  onBack?: () => void;
}

const LINKS = [
  {
    label: "Privacy Policy",
    icon: Shield,
    url: "https://explified.com/privacy-policy",
  },
  {
    label: "Terms of Service",
    icon: FileText,
    url: "https://explified.com/terms-of-service",
  },
  {
    label: "Refund Policy",
    icon: RefreshCw,
    url: "https://explified.com/refund-policy",
  },
  {
    label: "Security & Data Privacy",
    icon: Lock,
    url: "https://explified.com/security",
  },
  {
    label: "Disclaimer & Disclosure",
    icon: HelpCircle,
    url: "https://explified.com/disclaimer-disclosure",
  },
];

export function LegalScreen({ openExternal, onBack }: Props) {
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
          <h1 className="v2-settings-title">Legal & Privacy</h1>
        </div>
      </header>

      <div className="v2-settings-body">
        <div>
          {LINKS.map((l) => (
            <div
              key={l.label}
              className="v2-legal-link-row"
              onClick={() => openExternal(l.url)}
            >
              <div className="v2-legal-left">
                <div className="v2-legal-icon-wrap">
                  <l.icon size={15} strokeWidth={2} />
                </div>
                <span className="v2-legal-label">{l.label}</span>
              </div>
              <ExternalLink size={13} color="#94a3b8" />
            </div>
          ))}
        </div>

        <div className="v2-legal-disclosure-card">
          <div className="v2-legal-disclosure-title">
            <span>⚠</span>
            <span>AI Processing Disclosure</span>
          </div>
          <div className="v2-legal-disclosure-body">
            Images submitted through this plugin may be processed by trusted third-party AI
            providers to perform background removal and other editing operations. No images are
            stored longer than required for processing. For full details, see our Privacy Policy.
          </div>
          <button
            type="button"
            className="v2-legal-disclosure-link"
            onClick={() => openExternal("https://explified.com/privacy-policy")}
          >
            <ExternalLink size={11} />
            <span>Read our Privacy Policy</span>
          </button>
        </div>
      </div>
    </div>
  );
}
