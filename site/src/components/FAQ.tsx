"use client";

import { motion } from "framer-motion";
import Container from "./ui/Container";
import SplitHeader from "./SplitHeader";
import AccordionItem from "./ui/AccordionItem";
import { FAQ_ITEMS } from "@/lib/constants";
import { fadeIn } from "@/lib/animations";

export default function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <Container>
        <SplitHeader headline="Frequently Asked Questions" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeIn}
          className="mx-auto max-w-[600px]"
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
