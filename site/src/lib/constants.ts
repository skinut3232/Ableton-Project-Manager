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
    "SetCrate scans your Ableton library, reads your .als files to extract BPM, key, and plugins, catches missing samples before you open the DAW — and syncs everything to your phone.",
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
    icon: "\uD83D\uDD34",
    title: "Broken sessions, no warning",
    description:
      "You double-click a project and Ableton opens to a sea of missing samples and red plugin slots. You had no idea until it was too late.",
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
    headline: "Know what\u2019s inside before you open it.",
    body: "SetCrate reads your .als files to pull out BPM, key, and every plugin you used \u2014 all searchable from your library. It also checks every sample path against your file system, so you\u2019ll know about missing files before you open the DAW. No surprises.",
    screenshotLabel: "ALS metadata extraction showing BPM, key, plugins, and missing samples",
    screenshot: "/screenshots/Plugins.jpg",
    technicalNote: "Reads Ableton Live 10, 11, and 12 project files.",
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
    body: "The only Ableton project manager with a mobile companion app. Sync your full library \u2014 projects, metadata, bounces, notes \u2014 to your Android phone. Browse your library on the couch, listen to your latest bounces, and walk into your next session already knowing what you\u2019re working on.",
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
      "Reads .als files \u2014 auto-extracts BPM, key, and plugins",
      "Missing sample detection before you open Ableton",
      "Search your library by plugin name",
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
    with: "All your .als files, organized and indexed",
  },
  {
    without: "Open a project, half the samples are missing",
    with: "Missing samples flagged before you open Ableton",
  },
  {
    without: '"What plugins did I use in this track?"',
    with: "Every plugin indexed and searchable",
  },
  {
    without: "Alt-tabbing to Notes.app",
    with: "Notes, tasks, and ideas inside one tool",
  },
  {
    without: "Chained to your studio computer",
    with: "Full library synced to your phone",
  },
];

// ── Roadmap ─────────────────────────────────────────────────────
export const ROADMAP_HEADLINE = "Where we're headed";

export const ROADMAP_ITEMS: RoadmapItem[] = [
  {
    phase: "Now",
    description: "Windows desktop app + Android mobile sync",
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
    question: "Does SetCrate read my .als files?",
    answer:
      "Yes \u2014 SetCrate decompresses and parses your Ableton project files to extract metadata like BPM, key, and which plugins you used. This happens locally on your machine. SetCrate never modifies your .als files, never uploads them anywhere, and never changes your project folders. It\u2019s read-only, and everything stays on your computer.",
  },
  {
    question: "What is missing sample detection?",
    answer:
      "When SetCrate scans your library, it checks every sample path referenced in your .als files against your file system. If a sample has moved, been deleted, or lives on a drive that isn\u2019t connected, SetCrate flags it with a warning badge in your library \u2014 before you open the project in Ableton. No more surprise broken sessions.",
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

export const MAC_WAITLIST_MODAL = {
  headline: "Join the Mac Waitlist",
  description:
    "macOS support is actively in development. Drop your email and we'll let you know as soon as it's ready.",
  cta: "Join Waitlist",
  placeholder: "you@email.com",
  successMessage: "You're on the list! We'll email you when the Mac version is ready.",
};
