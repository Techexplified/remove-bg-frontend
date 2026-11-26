import { Heart, MessageSquare, ExternalLink, ThumbsUp } from "lucide-react";
import logoIcon from "../../../assets/icon-small-transparent.png";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLikeOnFigma: () => void;
}

export function CommunityReviewModal({ isOpen, onClose, onLikeOnFigma }: Props) {
  if (!isOpen) return null;

  return (
    <div className="v2-community-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="v2-community-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Top Sheet Handle Bar */}
        <div className="v2-community-sheet-handle" />

        {/* Accent Thumbs Up Badge */}
        <div className="v2-community-badge">
          <ThumbsUp size={18} strokeWidth={2.2} />
        </div>

        {/* Header & Subtitle */}
        <h3 className="v2-community-title">Glad you like it!</h3>
        <p className="v2-community-desc">
          A like and a comment on our Figma page helps other designers find RemoveBG.
        </p>

        {/* Plugin Preview Card */}
        <div className="v2-community-plugin-card">
          <div className="v2-community-card-left">
            <img src={logoIcon} alt="RemoveBG" className="v2-community-plugin-icon" />
            <div className="v2-community-plugin-info">
              <span className="v2-community-plugin-name">RemoveBG on Figma</span>
              <span className="v2-community-plugin-author">by Explified · Figma Community</span>
            </div>
          </div>
          <div className="v2-community-card-badges">
            <Heart size={14} />
            <MessageSquare size={14} />
          </div>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          className="v2-community-like-cta"
          onClick={onLikeOnFigma}
        >
          <Heart size={15} fill="#ffffff" color="#ffffff" />
          <span>Like & comment on Figma</span>
          <ExternalLink size={13} style={{ marginLeft: 2 }} />
        </button>

        {/* Secondary Dismiss Button */}
        <button
          type="button"
          className="v2-community-dismiss-btn"
          onClick={onClose}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
