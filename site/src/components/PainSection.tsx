"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import { PAIN_HEADLINE, PAIN_POINTS } from "@/lib/constants";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export default function PainSection() {
  return (
    <section id="pain" className="py-20 sm:py-28">
      <Container>
        <SectionHeading>{PAIN_HEADLINE}</SectionHeading>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 sm:grid-cols-3"
        >
          {PAIN_POINTS.map((point) => (
            <motion.div
              key={point.title}
              variants={fadeInUp}
              className="rounded-xl border border-border bg-surface p-6"
            >
              <span className="text-3xl">{point.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-heading">
                {point.title}
              </h3>
              <p className="mt-2 text-body leading-relaxed">
                {point.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
