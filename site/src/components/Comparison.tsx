"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SplitHeader from "./SplitHeader";
import { COMPARISON_HEADLINE, COMPARISON_ROWS } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";

export default function Comparison() {
  return (
    <section id="comparison" className="py-20 sm:py-28">
      <Container>
        <SplitHeader headline={COMPARISON_HEADLINE} />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeInUp}
          className="mx-auto max-w-3xl"
        >
          {/* Column headers */}
          <div className="grid grid-cols-2 gap-8">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-body-muted">Without SetCrate</h3>
            </div>
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-heading-secondary">With SetCrate</h3>
            </div>
          </div>

          {/* Rows */}
          {COMPARISON_ROWS.map((row) => (
            <div
              key={row.without}
              className="grid grid-cols-2 gap-8 border-b border-border"
            >
              <span className="py-3 text-sm text-body-muted">{row.without}</span>
              <span className="py-3 text-sm text-body-bright">{row.with}</span>
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
