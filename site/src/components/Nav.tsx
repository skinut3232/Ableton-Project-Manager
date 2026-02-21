"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Button from "./ui/Button";
import SetCrateLogo from "./SetCrateLogo";
import { HERO } from "@/lib/constants";

interface NavProps {
  onCtaClick: () => void;
}

export default function Nav({ onCtaClick }: NavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed top-0 z-50 w-full transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-background/90 backdrop-blur-md"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#hero" aria-label="SetCrate home">
          <SetCrateLogo variant="full" height={36} />
        </a>
        <Button onClick={onCtaClick} className="text-sm">
          <span className="hidden sm:inline">{HERO.cta}</span>
          <span className="sm:hidden">14-Day Trial</span>
          <span className="ml-1" aria-hidden="true">&rarr;</span>
        </Button>
      </div>
    </motion.nav>
  );
}
