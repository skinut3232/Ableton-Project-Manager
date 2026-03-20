export interface PainPoint {
  icon: string;
  title: string;
  description: string;
}

export interface Feature {
  headline: string;
  body: string;
  screenshotLabel: string;
  screenshot?: string;
  technicalNote?: string;
}

export interface PricingCard {
  title: string;
  price: string;
  priceLabel: string;
  features: string[];
  ctaText: string;
  subText: string;
  primary: boolean;
  monthlyPrice?: string;
  yearlyPrice?: string;
  yearlySavings?: string;
}

export interface ComparisonRow {
  without: string;
  with: string;
}

export interface RoadmapItem {
  phase: string;
  description: string;
  opacity: "opacity-100" | "opacity-60" | "opacity-35";
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Pillar {
  title: string;
  description: string;
}

export interface SubFeature {
  number: string;
  label: string;
}

export interface FeatureSection {
  label: string;
  link: { number: string; text: string };
  subFeatures: SubFeature[];
}

export interface NavLink {
  label: string;
  href: string;
}
