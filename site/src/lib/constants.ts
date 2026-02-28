import type {
  PainPoint,
  Feature,
  PricingCard,
  ComparisonRow,
  RoadmapItem,
  FAQItem,
} from "./types";

// ── Hero ────────────────────────────────────────────────────────
export const HERO = {
  headline: 'Your sessions deserve better than a folder of "final_v2_REAL.als"',
  subheadline:
    "SetCrate is project management built for Ableton Live. Organize sessions, track versions, capture ideas — and never lose work again.",
  cta: "Try Free for 14 Days",
  subCta: "Windows \u00b7 Free for 14 days \u00b7 No credit card required",
  tagline: "Made by a producer who got tired of messy project folders.",
};

// ── Pain Section ────────────────────────────────────────────────
export const PAIN_HEADLINE = "Sound familiar?";

export const PAIN_POINTS: PainPoint[] = [
  {
    icon: "\uD83D\uDCC1",
    title: "Lost in folders",
    description:
      'You\'ve got 47 folders named "beats," 3 versions of the same track, and no idea which one had that synth patch you loved.',
  },
  {
    icon: "\uD83E\uDD37",
    title: "No context",
    description:
      "You open a .als file from 3 months ago and have zero memory of what you were going for, what's done, or what needs fixing.",
  },
  {
    icon: "\uD83D\uDCA1",
    title: "Ideas slip away",
    description:
      "You had a breakthrough at 2am, didn't write it down, and now you're staring at the session trying to remember what you planned to do next.",
  },
];

// ── Features ────────────────────────────────────────────────────
export const FEATURES_HEADLINE =
  "Everything your sessions need. Nothing they don't.";

export const FEATURES: Feature[] = [
  {
    headline: "One home for every session.",
    body: "Group your Live Sets into projects. Tag them by genre, mood, stage, client — whatever makes sense to you. Filter and find any session in seconds, not minutes.",
    screenshotLabel: "Project list view with tags and filters",
    screenshot: "/screenshots/Project_List.jpg",
  },
  {
    headline: "Know exactly where every session stands.",
    body: "SetCrate manages all the .als files in your project, tracks your work sessions, and keeps a full history of your bounces. No more guessing which file is current or when you last worked on a track.",
    screenshotLabel: "Project detail showing sets, sessions, and bounces",
    screenshot: "/screenshots/Project_Detail.jpg",
  },
  {
    headline: "One click back into the DAW.",
    body: "Found what you're looking for? Open any project directly in Ableton Live from SetCrate. No digging through folders, no hunting for the right .als file — just click and create.",
    screenshotLabel: "Open in Ableton button on project detail",
    screenshot: "/screenshots/Open_in_ableton.jpg",
  },
  {
    headline: "Capture what the DAW can't.",
    body: "Attach notes to any session — what you were going for, what needs work, which plugins to try next. Snap photos of your hardware setup, mic placement, or that napkin sketch of your arrangement. It's all right there when you come back.",
    screenshotLabel: "Session detail view with notes and a photo",
    screenshot: "/screenshots/Session_Detail.jpg",
  },
  {
    headline: "Your studio in your pocket.",
    body: "Sync your projects, notes, and session logs to your phone. Review your work on the couch, capture ideas on the go, and walk into your next session ready to work.",
    screenshotLabel: "Mobile app showing synced project on phone",
    screenshot: "/screenshots/mobile_sync.jpg",
  },
];

export const MOBILE_SYNC_NOTE =
  "Included free during your 14-day trial. $3.99/mo or $34.99/yr after.";

// ── Pricing ─────────────────────────────────────────────────────
export const PRICING_HEADLINE = "Simple pricing. No subscriptions required.";

export const PRICING_CARDS: PricingCard[] = [
  {
    title: "SetCrate Desktop",
    price: "$29",
    priceLabel: "One-time purchase",
    features: [
      "Organize unlimited projects and sessions",
      "Session tracking and bounce history",
      "Notes, photos, and session logs",
      "Activate on up to 3 computers",
      "Free updates",
    ],
    ctaText: "Try Free for 14 Days",
    subText: "Windows \u00b7 No credit card required",
    primary: true,
  },
  {
    title: "Mobile Sync Add-On",
    price: "$3.99",
    priceLabel: "/mo",
    monthlyPrice: "$3.99",
    yearlyPrice: "$34.99",
    yearlySavings: "save 27%",
    features: [
      "Sync projects to your phone",
      "Access notes and session logs anywhere",
      "Capture ideas on the go",
      "Requires SetCrate Desktop",
    ],
    ctaText: "Included Free in Trial",
    subText: "Try it during your 14-day trial, decide later",
    primary: false,
  },
];

// ── Comparison ──────────────────────────────────────────────────
export const COMPARISON_HEADLINE = "Stop surviving. Start organizing.";

export const COMPARISON_ROWS: ComparisonRow[] = [
  {
    without: '47 folders named "beats"',
    with: "One searchable project library",
  },
  {
    without: '"Which version had that bassline?"',
    with: "All your .als files organized in one place",
  },
  {
    without: '"What was I doing in this session?"',
    with: "Notes and context for every session",
  },
  {
    without: "Alt-tabbing to Notes.app",
    with: "Everything lives inside one tool",
  },
  {
    without: '"I had an idea but forgot it"',
    with: "Capture ideas from your phone",
  },
];

// ── Roadmap ─────────────────────────────────────────────────────
export const ROADMAP_HEADLINE = "Where we're headed";

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    phase: "Now",
    description: "Windows desktop app + mobile sync (iOS & Android)",
    opacity: "opacity-100",
  },
  {
    phase: "Next",
    description: "macOS support",
    opacity: "opacity-60",
  },
  {
    phase: "Later",
    description: "Collaboration features, Ableton Link integration",
    opacity: "opacity-35",
  },
];

// ── FAQ ─────────────────────────────────────────────────────────
export const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Is there a free trial?",
    answer:
      "Yes. SetCrate is fully functional for 14 days, including mobile sync. No credit card required. After the trial, purchase a desktop license to keep using it.",
  },
  {
    question: "What happens to my data after the trial ends?",
    answer:
      "Your projects, notes, and version history are saved locally. Nothing is deleted. Once you activate a license, everything is right where you left it.",
  },
  {
    question: "Does SetCrate work with Ableton Live Lite / Intro / Standard / Suite?",
    answer:
      "Yes. SetCrate works with any edition of Ableton Live that saves .als files.",
  },
  {
    question: "Is macOS supported?",
    answer:
      "Not yet — Windows only at launch. macOS support is our top priority and is actively in development. Sign up for updates and we'll let you know when it ships.",
  },
  {
    question: "Do I need the mobile sync subscription?",
    answer:
      "No. The desktop app is fully functional on its own. Mobile sync is an optional add-on if you want to access your project notes and session logs from your phone.",
  },
  {
    question: "Can I activate my license on multiple computers?",
    answer:
      "Yes. Each desktop license can be activated on up to 3 machines (e.g., studio desktop, laptop, backup).",
  },
  {
    question: "What if I want a refund?",
    answer:
      "If SetCrate isn't right for you, reach out to support@setcrate.app within 14 days of purchase and we'll sort it out.",
  },
];

// ── Final CTA ───────────────────────────────────────────────────
export const FINAL_CTA = {
  headline: "Ready to take control of your sessions?",
  subheadline: "14 days free. No credit card. No commitment.",
  cta: "Try Free for 14 Days",
  subText: "Windows \u00b7 Made by a producer, for producers.",
};

// ── Download ────────────────────────────────────────────────────
export const DOWNLOAD_URL =
  "https://github.com/skinut3232/Ableton-Project-Manager/releases/latest/download/SetCrate_1.0.0_x64-setup.exe";

// ── Email Modal ─────────────────────────────────────────────────
export const EMAIL_MODAL = {
  headline: "Download SetCrate",
  description:
    "Enter your email to download SetCrate. We'll send you tips during your trial and a reminder before it ends.",
  cta: "Download Now",
  placeholder: "you@email.com",
  successMessage: "Your download is starting!",
};
