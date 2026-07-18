import type { FeatureDef } from "./features";

export const PRIMARY_FEATURE: FeatureDef = {
  id: "remove_bg_basic", label: "Remove Background", description: "Instantly remove image backgrounds",
  icon: "Sparkles", credits: 1, needsInputImage: true, needsPrompt: false, minPlan: "free", badge: "Free"
};

export const STARTER_FEATURES: FeatureDef[] = [
  { id: "crop_resize", label: "Crop and Resize", description: "Resize to any dimension", icon: "Crop", credits: 1, needsInputImage: true, needsPrompt: false, minPlan: "starter", needsOutputSize: true },
  { id: "color_background_fill", label: "Color Background", description: "Add a solid color backdrop", icon: "Palette", credits: 1, needsInputImage: true, needsPrompt: false, minPlan: "starter", needsColor: true, badge: "Popular" },
];

export const PRO_FEATURES: FeatureDef[] = [
  { id: "hd_export", label: "HD Export", description: "High-resolution output", icon: "FileOutput", credits: 5, needsInputImage: true, needsPrompt: false, minPlan: "pro", needsOutputSize: true },
  { id: "ai_background", label: "AI Background", description: "Generate AI scene backgrounds", icon: "Layers", credits: 5, needsInputImage: true, needsPrompt: false, minPlan: "pro", needsOutputSize: true, badge: "New" },
  { id: "ai_shadows", label: "AI Shadows", description: "Add realistic drop shadows", icon: "Sun", credits: 5, needsInputImage: true, needsPrompt: false, minPlan: "pro", needsOutputSize: true },
  { id: "ai_relighting", label: "AI Relighting", description: "Change lighting and mood", icon: "Lightbulb", credits: 5, needsInputImage: true, needsPrompt: false, minPlan: "pro", needsOutputSize: true, badge: "Popular" },
  { id: "ai_upscale", label: "AI Upscale", description: "4× resolution increase", icon: "ZoomIn", credits: 5, needsInputImage: true, needsPrompt: false, minPlan: "pro", maxInputPixels: 1_000_000, badge: "Preview" },
  { id: "ai_image_gen", label: "Image Gen", description: "Generate images from text", icon: "Wand2", credits: 5, needsInputImage: false, needsPrompt: true, minPlan: "pro", badge: "New" },
  { id: "ai_logo_maker", label: "Logo Maker", description: "Generate logos from text", icon: "PenTool", credits: 5, needsInputImage: false, needsPrompt: true, minPlan: "pro" },
];

export const ALL_FEATURES: FeatureDef[] = [PRIMARY_FEATURE, ...STARTER_FEATURES, ...PRO_FEATURES];

export const PLAN_RANK: Record<string, number> = { free: 0, starter: 1, pro: 2 };
export const PLAN_LIMITS: Record<string, number> = { free: 2, starter: 40, pro: 300 };

export function isFeatureUnlocked(feature: FeatureDef, plan: string): boolean {
  return PLAN_RANK[plan] >= PLAN_RANK[feature.minPlan];
}

export const NAMED_COLORS = [
  { name: "white", hex: "#ffffff" }, { name: "black", hex: "#18181b" },
  { name: "red", hex: "#ef4444" }, { name: "blue", hex: "#3b82f6" },
  { name: "green", hex: "#22c55e" }, { name: "yellow", hex: "#eab308" },
  { name: "orange", hex: "#f97316" }, { name: "purple", hex: "#a855f7" },
  { name: "pink", hex: "#ec4899" }, { name: "gray", hex: "#71717a" },
  { name: "brown", hex: "#92400e" },
];

export const CROP_PRESETS = [
  { id: "instagram_post", label: "Instagram Post", width: 1080, height: 1080 },
  { id: "instagram_story", label: "Instagram Story", width: 1080, height: 1920 },
  { id: "facebook_ad", label: "Facebook Ad", width: 1200, height: 628 },
  { id: "amazon_listing", label: "Amazon Listing", width: 1000, height: 1000 },
  { id: "shopify_thumb", label: "Shopify Thumbnail", width: 800, height: 800 },
  { id: "linkedin_banner", label: "LinkedIn Banner", width: 1584, height: 396 },
  { id: "youtube_thumb", label: "YouTube Thumbnail", width: 1280, height: 720 },
  { id: "twitter_post", label: "Twitter/X Post", width: 1200, height: 675 },
];

export const BG_PRESETS = [
  { label: "Studio White",   prompt: "clean white studio background with soft even lighting" },
  { label: "Beach",          prompt: "on a sandy beach with ocean waves and bright sunlight" },
  { label: "Coffee Shop",    prompt: "on the counter of a cozy coffee shop with warm lighting" },
  { label: "Office Desk",    prompt: "on a modern office desk with a laptop and plants" },
  { label: "Marble",         prompt: "on a white marble surface with soft shadows" },
  { label: "Nature",         prompt: "in a lush green garden with soft natural light" },
  { label: "Gradient",       prompt: "clean gradient background, light grey to white" },
  { label: "Kitchen",        prompt: "on a kitchen counter with cooking ingredients nearby" },
];

export const SHADOW_DIRECTIONS = [
  { value: "left",        label: "←", sublabel: "Left" },
  { value: "behindLeft",  label: "↙", sublabel: "Behind Left" },
  { value: "behind",      label: "↓", sublabel: "Behind" },
  { value: "behindRight", label: "↘", sublabel: "Behind Right" },
  { value: "right",       label: "→", sublabel: "Right" },
];

export const SHADOW_MODES = [
  { id: "soft", label: "Soft", desc: "Diffused, natural" },
  { id: "hard", label: "Hard", desc: "Sharp, dramatic" },
];

export const RELIGHTING_MODES = [
  { id: "auto",            label: "Auto",            desc: "AI corrects lighting automatically. Best for most images." },
  { id: "preserve-colors", label: "Preserve Colors",  desc: "Keeps exact product colors. Best for e-commerce photography." },
  { id: "portrait",        label: "Portrait",         desc: "Optimized for faces and people. Softens skin, balances lighting." },
];

export const TOPUP_PACKS = [
  { id: "small" as const, label: "Small Pack", starterCredits: 20, proCredits: 100, starterPrice: "$7", proPrice: "$15", badge: "Popular" },
  { id: "medium" as const, label: "Medium Pack", starterCredits: 50, proCredits: 250, starterPrice: "$17", proPrice: "$36", badge: "Best Value" },
];

export const FAQ_DATA = [
  // PAYMENTS & BILLING
  {
    category: "Payments & Billing",
    question: "Why does my bank statement show \"Dodo Payments\" instead of Explified or ZeroBG?",
    answer: "Dodo Payments is our payment processor and handles all transactions on our behalf. When you subscribe to ZeroBG, the charge on your bank statement will appear as \"Dodo Payments\" — this is completely normal and confirms your payment was processed successfully. For any questions, contact us at support@explified.com and we'll help you directly."
  },
  {
    category: "Payments & Billing",
    question: "What payment methods are accepted?",
    answer: "We accept all major credit and debit cards (Visa, Mastercard, American Express) as well as PayPal where available. Payment options are displayed at checkout."
  },
  {
    category: "Payments & Billing",
    question: "Will I be charged automatically every month?",
    answer: "Yes — subscriptions renew automatically at the end of each billing cycle. You'll receive a receipt each time a renewal is processed. You can cancel at any time from within the plugin to stop future charges."
  },
  {
    category: "Payments & Billing",
    question: "I was charged but I didn't mean to renew. What should I do?",
    answer: "Email us at support@explified.com within 14 days of the charge with your registered email address and the date of the charge. If it's your first-ever subscription payment, you're covered by our 14-day money-back guarantee. If it's a renewal charge, contact us and we'll review your case."
  },

  // REFUNDS
  {
    category: "Refunds",
    question: "Do you offer refunds?",
    answer: "Yes — we offer a 14-day money-back guarantee on your first subscription purchase. If you're not satisfied, email support@explified.com within 14 days of your purchase and we'll process a full refund, no questions asked. After the 14-day window, payments are final."
  },
  {
    category: "Refunds",
    question: "I've used some credits. Can I still get a refund?",
    answer: "Credits represent delivered service — each feature you run processes a real image using our AI provider. Once credits have been used, those specific credits are non-refundable. However, if you're within your 14-day window, contact us at support@explified.com and we'll discuss your situation fairly."
  },
  {
    category: "Refunds",
    question: "I bought a top-up credit pack. Can I get a refund on that?",
    answer: "Top-up credit packs are non-refundable once any credits from the pack have been used. Unused top-up credits remain in your account and never expire as long as you maintain an active subscription."
  },
  {
    category: "Refunds",
    question: "How long does a refund take?",
    answer: "Once approved, refunds are processed within 1–3 business days on our end. Depending on your bank or card provider, it may take an additional 5–10 business days to appear on your statement."
  },
  {
    category: "Refunds",
    question: "I requested a refund. How will I know it was approved?",
    answer: "We'll reply to your email once your refund has been approved and processed. If you don't hear from us within 3 business days of your request, please follow up at support@explified.com"
  },

  // CANCELLATION
  {
    category: "Cancellation",
    question: "How do I cancel my subscription?",
    answer: "Open the ZeroBG plugin in Figma, go to your plan details, tap Manage Plan, then Cancel Subscription. You'll be taken to our secure billing portal to confirm. Alternatively, email support@explified.com and we'll cancel it for you."
  },
  {
    category: "Cancellation",
    question: "If I cancel, do I lose access immediately?",
    answer: "No. When you cancel, your subscription remains active until the end of your current billing period. You keep full access to all features and your remaining credits until that date. The plugin will show a banner confirming your cancellation date so you know exactly when access ends."
  },
  {
    category: "Cancellation",
    question: "I cancelled but the plugin still shows my plan as active. Is that normal?",
    answer: "Yes, completely normal. Cancellation takes effect at the end of your current billing period, not immediately. The plugin shows an amber notice with the exact date your access ends. Until that date, you have full access to everything. After that date, your account moves to the free tier automatically with no further charges."
  },
  {
    category: "Cancellation",
    question: "Can I get a refund for the remaining days after I cancel?",
    answer: "Cancellation stops future charges but does not generate a refund for the remaining days in your current billing cycle. You retain full access until the end of that period, so the service is still being delivered during that time."
  },
  {
    category: "Cancellation",
    question: "What happens to my top-up credits if I cancel?",
    answer: "Your top-up credits are not deleted when you cancel. They stay in your account but become locked until you resubscribe. Once you resubscribe to the same plan tier, your top-up credits become available again immediately."
  },
  {
    category: "Cancellation",
    question: "I cancelled by mistake. Can I undo it?",
    answer: "Yes — as long as your subscription is still within the active period (you haven't reached the cancellation date yet), you can reactivate it. Open the plugin, go to Manage Plan, and tap Reactivate Subscription. This opens the billing portal where you can undo the cancellation. If your access has already ended, simply subscribe again as a new subscriber."
  },

  // UPGRADES & DOWNGRADES
  {
    category: "Upgrades & Downgrades",
    question: "I upgraded to Pro. How much was I charged?",
    answer: "When you upgrade from Starter to Pro, you are charged a prorated amount — only the difference between the Pro and Starter plan prices for the remaining days in your current billing cycle. For example, if you upgrade with 5 days remaining in a 30-day cycle, you pay approximately $4.50 (the Pro vs Starter price difference for those 5 days). Your next renewal and every month after is charged the full Pro price of $39."
  },
  {
    category: "Upgrades & Downgrades",
    question: "Why was my upgrade charge less than $39?",
    answer: "This is correct and expected. Upgrade charges are prorated — you only pay the difference between Pro ($39) and Starter ($12) prices for the days remaining in your billing cycle. From your next renewal onwards, you are charged the full $39/month."
  },
  {
    category: "Upgrades & Downgrades",
    question: "I upgraded to Pro but want to go back to Starter. Can I get a refund?",
    answer: "Upgrade charges are non-refundable. However, you can downgrade to Starter at any time from within the plugin under Manage Plan. Your Pro plan stays active until the end of the current billing period, and Starter pricing ($12/month) applies from your next renewal."
  },
  {
    category: "Upgrades & Downgrades",
    question: "The plugin shows my plan is \"scheduled to change.\" What does that mean?",
    answer: "This means you've requested a plan change (either an upgrade or downgrade) that takes effect at your next renewal. You keep your current plan and all its features until the renewal date shown. On that date, the new plan activates automatically and you're billed accordingly. No action is required from you."
  },
  {
    category: "Upgrades & Downgrades",
    question: "What happens to my credits when I upgrade or downgrade?",
    answer: "Your monthly credits reset to the new plan's allotment at the next renewal. Any top-up credits you've purchased are automatically transferred to your new plan — you never lose purchased credits due to a plan change. If you downgrade from Pro to Starter, your Pro top-up credits move to your Starter pool and can be used on Basic features."
  },

  // CONTACT & SUPPORT
  {
    category: "Contact & Support",
    question: "How do I contact support?",
    answer: "Email us at support@explified.com with your registered email address and a description of your issue. We respond within 2 business days. For billing questions, please include the date of the charge and the email address associated with your account so we can look it up quickly."
  },
  {
    category: "Contact & Support",
    question: "What information should I include when emailing support?",
    answer: "For the fastest response, include: (1) your registered email address, (2) the date of the charge or issue, (3) a brief description of what happened. For refund requests, also include your reason. We'll confirm receipt and follow up within 2 business days."
  },

  // PRIVACY & DATA
  {
    category: "Privacy & Data",
    question: "What data does the ZeroBG plugin collect?",
    answer: "When you open the ZeroBG plugin in Figma, we automatically collect your Figma user ID and display name to create and manage your account. This information is provided directly by Figma — we do not ask you to log in or create a separate account. Your Figma user ID does not include your email address or any other personal information unless you provide it during checkout."
  },
  {
    category: "Privacy & Data",
    question: "Why do you need my Figma user ID?",
    answer: "Your Figma user ID is how we identify your account within our system. It allows us to track your credit balance, subscription status, and usage history — all without requiring a separate username or password. This is the standard approach used by Figma plugins and is explicitly permitted by Figma's plugin API."
  },
  {
    category: "Privacy & Data",
    question: "Is my Figma user ID linked to my personal information?",
    answer: "Your Figma user ID and display name are stored in our database solely to operate the ZeroBG service. We do not sell, share, or use this information for any purpose other than managing your account. Your email address is only collected if you provide it during checkout via Dodo Payments, our payment processor, and is used for billing and receipt purposes only."
  },
  {
    category: "Privacy & Data",
    question: "What happens to my data if I stop using the plugin?",
    answer: "Your account data (Figma user ID, credit balance, subscription history) is retained in our systems for as long as your account exists. If you would like your data deleted, email support@explified.com and we will remove your account and associated data within 30 days, in accordance with applicable data protection regulations including GDPR."
  },
  {
    category: "Privacy & Data",
    question: "Is my image data stored when I use a feature?",
    answer: "Images you process through the ZeroBG plugin are sent to Photoroom, our AI image processing provider, solely to perform the requested operation. We do not store your images on our servers. Photoroom's own data handling policies apply to images processed through their API. Usage logs (feature name, credit cost, success/failure status) are retained for account management and support purposes only."
  },
  {
    category: "Privacy & Data",
    question: "How do I request deletion of my personal data?",
    answer: "Email support@explified.com from the email address associated with your account, stating that you wish to delete your account and personal data. We will process your request within 30 days and confirm by email when complete. Note that deleting your account will permanently remove your credit balance and subscription history and cannot be undone."
  }
];

