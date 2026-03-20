"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SplitHeader from "./SplitHeader";
import { PAIN_HEADLINE, PAIN_DESCRIPTION, PAIN_POINTS } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";

export default function PainSection() {
  return (
    <section id="pain" className="py-20 sm:py-28">
      <Container>
        <SplitHeader headline={PAIN_HEADLINE} description={PAIN_DESCRIPTION} />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeInUp}
          className="overflow-hidden rounded-[10px] bg-border"
        >
          <div className="grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4">
            {PAIN_POINTS.map((point) => (
              <div key={point.title} className="bg-surface p-6">
                <span className="text-2xl">{point.icon}</span>
                <h3 className="mt-3 text-sm font-semibold text-heading-secondary">
                  {point.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-body-muted">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
