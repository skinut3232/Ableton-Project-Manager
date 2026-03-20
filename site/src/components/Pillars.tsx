"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import { PILLARS } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";

export default function Pillars() {
  return (
    <section className="border-t border-section-border py-20">
      <Container>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={fadeInUp}
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-surface">
                {i === 0 && <CrateIcon />}
                {i === 1 && <ScanIcon />}
                {i === 2 && <BoltIcon />}
              </div>
              <h3 className="text-[15px] font-semibold text-heading-secondary">
                {pillar.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-body">
                {pillar.description}
              </p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function CrateIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-heading-secondary">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-heading-secondary">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-heading-secondary">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
