"use client";

import { motion } from "framer-motion";
import Button from "./ui/Button";
import Container from "./ui/Container";
import { FINAL_CTA } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";

interface FinalCTAProps {
  onCtaClick: () => void;
}

export default function FinalCTA({ onCtaClick }: FinalCTAProps) {
  return (
    <section id="cta" className="py-[140px]">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeInUp}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-3xl font-bold tracking-[-2px] text-heading sm:text-[48px] sm:leading-[1.1]">
            {FINAL_CTA.headline}
          </h2>

          <p className="mt-4 text-lg text-body sm:text-xl">
            {FINAL_CTA.subheadline}
          </p>

          <div className="mt-8 flex items-center justify-center gap-3">
            <Button onClick={onCtaClick} className="text-lg px-8 py-4">
              {FINAL_CTA.cta} <span aria-hidden="true">&rarr;</span>
            </Button>
            <Button variant="secondary" className="text-lg px-8 py-4">
              Learn more
            </Button>
          </div>

          <p className="mt-4 text-sm text-tertiary">{FINAL_CTA.subText}</p>
        </motion.div>
      </Container>
    </section>
  );
}
