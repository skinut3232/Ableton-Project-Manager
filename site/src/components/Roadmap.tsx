"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import { ROADMAP_HEADLINE, ROADMAP_ITEMS } from "@/lib/constants";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export default function Roadmap() {
  return (
    <section id="roadmap" className="py-20 sm:py-28">
      <Container>
        <SectionHeading>{ROADMAP_HEADLINE}</SectionHeading>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mx-auto max-w-3xl"
        >
          {/* Desktop: horizontal timeline */}
          <div className="hidden sm:grid sm:grid-cols-3 sm:gap-6">
            {ROADMAP_ITEMS.map((item, i) => (
              <motion.div
                key={item.phase}
                variants={fadeInUp}
                className={item.opacity}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      i === 0 ? "bg-accent" : "bg-border"
                    }`}
                  />
                  {i < ROADMAP_ITEMS.length - 1 && (
                    <div className="h-px flex-1 bg-border" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-heading">{item.phase}</h3>
                <p className="mt-1 text-sm text-body">{item.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Mobile: vertical timeline */}
          <div className="sm:hidden space-y-6">
            {ROADMAP_ITEMS.map((item, i) => (
              <motion.div
                key={item.phase}
                variants={fadeInUp}
                className={`flex gap-4 ${item.opacity}`}
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      i === 0 ? "bg-accent" : "bg-border"
                    }`}
                  />
                  {i < ROADMAP_ITEMS.length - 1 && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="pb-6">
                  <h3 className="text-lg font-bold text-heading">
                    {item.phase}
                  </h3>
                  <p className="mt-1 text-sm text-body">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
