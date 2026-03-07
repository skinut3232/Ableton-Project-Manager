"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import AccordionItem from "./ui/AccordionItem";
import { FAQ_ITEMS } from "@/lib/constants";
import { fadeIn } from "@/lib/animations";

interface FAQProps {
  onMacWaitlistClick?: () => void;
}

export default function FAQ({ onMacWaitlistClick }: FAQProps) {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <Container>
        <SectionHeading>Frequently Asked Questions</SectionHeading>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeIn}
          className="mx-auto max-w-2xl"
        >
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.question}
              question={item.question}
              answer={item.answer}
              extra={
                item.question === "Is macOS supported?" && onMacWaitlistClick ? (
                  <button
                    onClick={onMacWaitlistClick}
                    className="text-sm font-medium text-accent hover:text-accent/80 transition-colors cursor-pointer"
                  >
                    Join the Mac waitlist &rarr;
                  </button>
                ) : undefined
              }
            />
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
