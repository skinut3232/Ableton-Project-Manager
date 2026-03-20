"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Container from "./ui/Container";
import SplitHeader from "./SplitHeader";
import Button from "./ui/Button";
import { PRICING_HEADLINE, PRICING_CARDS } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";

interface PricingProps {
  onCtaClick: () => void;
}

export default function Pricing({ onCtaClick }: PricingProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <Container>
        <SplitHeader headline={PRICING_HEADLINE} />

        <div className="mx-auto grid max-w-[700px] gap-4 lg:grid-cols-2">
          {PRICING_CARDS.map((card) => (
            <motion.div
              key={card.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeInUp}
              className={`flex flex-col rounded-xl border p-8 ${
                card.primary
                  ? "border-accent-border bg-surface"
                  : "border-border bg-surface"
              }`}
            >
              <h3 className="text-xl font-bold text-heading-secondary">{card.title}</h3>

              <div className="mt-4 flex items-baseline gap-1">
                {card.monthlyPrice ? (
                  <>
                    <span className="text-[40px] font-bold leading-none tracking-[-1.5px] text-heading">
                      {annual ? card.yearlyPrice : card.monthlyPrice}
                    </span>
                    <span className="text-body">
                      {annual ? "/yr" : card.priceLabel}
                    </span>
                    {annual && card.yearlySavings && (
                      <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        {card.yearlySavings}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-[40px] font-bold leading-none tracking-[-1.5px] text-heading">
                      {card.price}
                    </span>
                    <span className="text-body">{card.priceLabel}</span>
                  </>
                )}
              </div>

              {card.monthlyPrice && (
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <span className={annual ? "text-tertiary" : "text-heading-secondary"}>
                    Monthly
                  </span>
                  <button
                    role="switch"
                    aria-checked={annual}
                    aria-label="Toggle annual pricing"
                    onClick={() => setAnnual(!annual)}
                    className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                      annual ? "bg-accent" : "bg-border-secondary"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                        annual ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                  <span className={annual ? "text-heading-secondary" : "text-tertiary"}>
                    Annual
                  </span>
                </div>
              )}

              <ul className="mt-6 flex-1 space-y-3">
                {card.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm text-body">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button
                  variant={card.primary ? "primary" : "secondary"}
                  onClick={card.primary ? onCtaClick : undefined}
                  className="w-full"
                >
                  {card.ctaText}
                  {card.primary && <span className="ml-1" aria-hidden="true">&rarr;</span>}
                </Button>
                <p className="mt-2 text-center text-xs text-tertiary">
                  {card.subText}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
