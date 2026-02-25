"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import ScreenshotPlaceholder from "./ui/ScreenshotPlaceholder";
import { FEATURES_HEADLINE, FEATURES, MOBILE_SYNC_NOTE } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";

export default function Features() {
  return (
    <section id="features" className="py-20 sm:py-28">
      <Container>
        <SectionHeading>{FEATURES_HEADLINE}</SectionHeading>

        <div className="space-y-24">
          {FEATURES.map((feature, i) => {
            const reversed = i % 2 === 1;
            const isLast = i === FEATURES.length - 1;

            return (
              <motion.div
                key={feature.headline}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeInUp}
                className={`flex flex-col items-center gap-10 lg:flex-row ${
                  reversed ? "lg:flex-row-reverse" : ""
                }`}
              >
                <div className="w-full lg:w-1/2">
                  {feature.screenshot ? (
                    <div className="overflow-hidden rounded-xl border border-border shadow-[0_0_30px_var(--color-accent-glow)]">
                      <Image
                        src={feature.screenshot}
                        alt={feature.screenshotLabel}
                        width={800}
                        height={450}
                        className="h-auto w-full"
                      />
                    </div>
                  ) : (
                    <ScreenshotPlaceholder label={feature.screenshotLabel} />
                  )}
                </div>
                <div className="w-full lg:w-1/2">
                  <h3 className="text-2xl font-bold text-heading sm:text-3xl">
                    {feature.headline}
                  </h3>
                  <p className="mt-4 text-lg leading-relaxed text-body">
                    {feature.body}
                  </p>
                  {isLast && (
                    <p className="mt-3 text-sm text-muted">{MOBILE_SYNC_NOTE}</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
