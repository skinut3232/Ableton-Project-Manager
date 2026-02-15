"use client";

import { motion } from "framer-motion";
import Button from "./ui/Button";
import Container from "./ui/Container";
import { FINAL_CTA } from "@/lib/constants";
import { fadeInUp, staggerContainer } from "@/lib/animations";

interface FinalCTAProps {
  onCtaClick: () => void;
}

export default function FinalCTA({ onCtaClick }: FinalCTAProps) {
  return (
    <section id="cta" className="relative overflow-hidden py-24 sm:py-32">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-accent/5 to-transparent" />

      <Container className="relative">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl font-extrabold text-heading sm:text-4xl lg:text-5xl"
          >
            {FINAL_CTA.headline}
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="mt-4 text-lg text-body sm:text-xl"
          >
            {FINAL_CTA.subheadline}
          </motion.p>

          <motion.div variants={fadeInUp} className="mt-8">
            <Button onClick={onCtaClick} className="text-lg px-8 py-4">
              {FINAL_CTA.cta} <span aria-hidden="true">&rarr;</span>
            </Button>
            <p className="mt-3 text-sm text-muted">{FINAL_CTA.subText}</p>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
