"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SectionHeading from "./ui/SectionHeading";
import AccordionItem from "./ui/AccordionItem";
import { FAQ_ITEMS } from "@/lib/constants";
import { fadeIn } from "@/lib/animations";

export default function FAQ() {
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
            />
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
