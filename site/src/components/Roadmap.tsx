"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SplitHeader from "./SplitHeader";
import { ROADMAP_HEADLINE, ROADMAP_ITEMS } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";

interface RoadmapProps {
  onMacWaitlistClick?: () => void;
}

export default function Roadmap({ onMacWaitlistClick }: RoadmapProps) {
  return (
    <section id="roadmap" className="py-20 sm:py-28">
      <Container>
        <SplitHeader headline={ROADMAP_HEADLINE} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {ROADMAP_ITEMS.map((item) => {
            const opacityClass =
              item.opacity === "opacity-100"
                ? "opacity-100"
                : item.opacity === "opacity-60"
                  ? "opacity-70"
                  : "opacity-50";

            return (
              <motion.div
                key={item.phase}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeInUp}
                className={`rounded-[10px] border border-border bg-surface p-6 ${opacityClass}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-accent">
                  {item.phase}
                </p>
                <p className="mt-2 text-sm text-body">{item.description}</p>
                {item.phase === "Next" && onMacWaitlistClick && (
                  <button
                    onClick={onMacWaitlistClick}
                    className="mt-3 text-sm font-medium text-accent transition-colors duration-200 hover:text-accent-highlight cursor-pointer"
                  >
                    Join the Mac waitlist &rarr;
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
