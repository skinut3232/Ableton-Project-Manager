"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import { COMPARISON_HEADLINE, COMPARISON_ROWS } from "@/lib/constants";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export default function Comparison() {
  return (
    <section id="comparison" className="py-20 sm:py-28">
      <Container>
        <SectionHeading>{COMPARISON_HEADLINE}</SectionHeading>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-3xl"
        >
          {/* Column headers */}
          <div className="mb-4 grid grid-cols-2 gap-4 px-4 text-sm font-semibold uppercase tracking-wider">
            <span className="text-muted">Without SetCrate</span>
            <span className="text-accent">With SetCrate</span>
          </div>

          {COMPARISON_ROWS.map((row) => (
            <motion.div
              key={row.without}
              variants={fadeInUp}
              className="grid grid-cols-2 gap-4 border-b border-border px-4 py-4"
            >
              <span className="text-muted">{row.without}</span>
              <span className="flex items-start gap-2 text-heading">
                <svg
                  className="mt-0.5 h-5 w-5 shrink-0 text-accent"
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
                {row.with}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
