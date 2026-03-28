"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import HeroVideo from "./HeroVideo";
import { HERO, ANNOUNCEMENT } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";

export default function Hero() {
  return (
    <section id="hero" className="pt-[140px] pb-20">
      <Container>
        <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
          {/* Announcement badge */}
          <p className="mb-5 text-[13px] font-medium text-body">
            <span className="text-body-bright">New</span> &mdash; {ANNOUNCEMENT}
          </p>

          {/* Headline — left-aligned */}
          <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-[-2.5px] text-heading sm:text-[56px]">
            {HERO.headline}
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-xl text-base leading-[1.6] text-body">
            {HERO.subheadline}
          </p>
        </motion.div>

        {/* Product screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16"
        >
          <HeroVideo />
        </motion.div>
      </Container>
    </section>
  );
}
