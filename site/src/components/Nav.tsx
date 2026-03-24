"use client";

import { motion } from "framer-motion";
import SetCrateLogo from "./SetCrateLogo";
import { NAV_LINKS, HERO, CHECKOUT_URL } from "@/lib/constants";

interface NavProps {
  onCtaClick: () => void;
}

export default function Nav({ onCtaClick }: NavProps) {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[rgba(10,10,11,0.8)] backdrop-blur-[12px]"
    >
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-6 sm:px-10">
        <a href="#hero" aria-label="SetCrate home">
          <SetCrateLogo variant="full" height={32} />
        </a>
        <div className="flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden text-[13px] text-body transition-colors duration-200 hover:text-heading sm:block"
            >
              {link.label}
            </a>
          ))}
          <a
            href={CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-[13px] text-body transition-colors duration-200 hover:text-heading sm:block"
          >
            Buy Now
          </a>
          <button
            onClick={onCtaClick}
            className="rounded-md bg-heading px-3.5 py-1.5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-heading-secondary cursor-pointer"
          >
            <span className="hidden sm:inline">{HERO.cta}</span>
            <span className="sm:hidden">Try Free</span>
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
