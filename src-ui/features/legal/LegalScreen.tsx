import { Shield, FileText, RefreshCw, Lock, ExternalLink, HelpCircle, ChevronLeft } from "lucide-react";
import { useAppDispatch } from "../../app/hooks";
import { setSection } from "../../app/slices/uiSlice";

interface Props { openExternal: (url: string) => void; }

const LINKS = [
  { label: "Privacy Policy", icon: Shield, cls: "legal-icon-privacy", url: "https://explified.com/privacy-policy" },
  { label: "Terms of Service", icon: FileText, cls: "legal-icon-terms", url: "https://explified.com/terms-of-service" },
  { label: "Refund Policy", icon: RefreshCw, cls: "legal-icon-refund", url: "https://explified.com/refund-policy" },
  { label: "Security & Data Privacy", icon: Lock, cls: "legal-icon-security", url: "https://explified.com/security" },
  { label: "Disclaimer & Disclosure", icon: HelpCircle, cls: "legal-icon-refund", url: "https://explified.com/disclaimer-disclosure" },
];

export function LegalScreen({ openExternal }: Props) {
  const dispatch = useAppDispatch();

  return (
    <>
      <div className="breadcrumb-container" style={{ paddingBottom: 0 }}>
        <button className="breadcrumb-link" onClick={() => dispatch(setSection("features"))}>
          <ChevronLeft size={13} /> Home
        </button>
      </div>
      <div className="pane-header">
        <h2>Legal</h2>
        <p>Terms, policies, and data disclosures</p>
      </div>
      <div className="pane-body">
        {LINKS.map(l => (
          <div key={l.label} className="legal-row" onClick={() => openExternal(l.url)}>
            <div className="legal-row-left">
              <div className={`legal-row-icon ${l.cls}`}><l.icon size={15} /></div>
              <span className="legal-row-name">{l.label}</span>
            </div>
            <ExternalLink size={13} color="var(--c-text-3)" />
          </div>
        ))}
        <div className="legal-disclosure">
          <div className="legal-disclosure-title">⚠ AI Processing Disclosure</div>
          <div className="legal-disclosure-body">Images submitted through this plugin may be processed by trusted third-party AI providers to perform background removal and other editing operations. No images are stored longer than required for processing. For full details, see our Privacy Policy.</div>
          <button className="legal-disclosure-link" onClick={() => openExternal("https://explified.com/privacy-policy")}>
            <ExternalLink size={11} />Read our Privacy Policy
          </button>
        </div>
      </div>
      <div className="pane-footer">
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/privacy-policy"); }}>Privacy</a> ·{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("https://explified.com/terms-of-service"); }}>Terms</a> ·{" "}
        <a href="#" onClick={(e) => { e.preventDefault(); openExternal("mailto:support@explified.com"); }}>Support</a>
        <br />
        Built by Explified · v1.4.2
      </div>
    </>
  );
}
