"use client";

import { useState } from "react";
import Nav from "./Nav";
import Hero from "./Hero";
import PainSection from "./PainSection";
import Features from "./Features";
import Pricing from "./Pricing";
import Comparison from "./Comparison";
import Roadmap from "./Roadmap";
import FAQ from "./FAQ";
import FinalCTA from "./FinalCTA";
import Footer from "./Footer";
import EmailModal from "./EmailModal";

export default function PageContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  return (
    <>
      <Nav onCtaClick={openModal} />
      <main id="main-content">
        <Hero onCtaClick={openModal} />
        <PainSection />
        <Features />
        <Comparison />
        <Pricing onCtaClick={openModal} />
        <Roadmap />
        <FAQ />
        <FinalCTA onCtaClick={openModal} />
      </main>
      <Footer />
      <EmailModal open={modalOpen} onClose={closeModal} />
    </>
  );
}
