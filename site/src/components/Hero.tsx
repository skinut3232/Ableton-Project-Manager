"use client";

import { motion } from "framer-motion";
import Button from "./ui/Button";
import Container from "./ui/Container";
import SetCrateLogo from "./SetCrateLogo";
import HeroVideo from "./HeroVideo";
import { HERO } from "@/lib/constants";
import { fadeInUp, staggerContainer } from "@/lib/animations";

interface HeroProps {
  onCtaClick: () => void;
}

export default function Hero({ onCtaClick }: HeroProps) {
  return (
    <section id="hero" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
        <div className="h-[500px] w-[800px] rounded-full bg-accent opacity-[0.06] blur-[120px]" />
      </div>

      <Container className="relative">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div variants={fadeInUp} className="flex justify-center mb-6">
            <SetCrateLogo variant="icon" height={72} />
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="text-4xl font-extrabold leading-tight text-heading sm:text-5xl lg:text-6xl"
          >
            {HERO.headline}
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="mt-6 text-lg text-body sm:text-xl"
          >
            {HERO.subheadline}
          </motion.p>

          <motion.div variants={fadeInUp} className="mt-8">
            <Button onClick={onCtaClick} className="text-lg px-8 py-4">
              {HERO.cta} <span aria-hidden="true">&rarr;</span>
            </Button>
            <p className="mt-3 text-sm text-muted">{HERO.subCta}</p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16"
        >
          <HeroVideo />
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 text-center text-sm text-muted italic"
        >
          {HERO.tagline}
        </motion.p>
      </Container>
    </section>
  );
}
