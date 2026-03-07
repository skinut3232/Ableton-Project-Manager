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

type ModalVariant = "trial_download" | "mac_waitlist";

export default function PageContent() {
  const [modalVariant, setModalVariant] = useState<ModalVariant | null>(null);
  const openTrialModal = () => setModalVariant("trial_download");
  const openMacWaitlist = () => setModalVariant("mac_waitlist");
  const closeModal = () => setModalVariant(null);

  return (
    <>
      <Nav onCtaClick={openTrialModal} />
      <main id="main-content">
        <Hero onCtaClick={openTrialModal} />
        <PainSection />
        <Features />
        <Comparison />
        <Pricing onCtaClick={openTrialModal} />
        <Roadmap onMacWaitlistClick={openMacWaitlist} />
        <FAQ onMacWaitlistClick={openMacWaitlist} />
        <FinalCTA onCtaClick={openTrialModal} />
      </main>
      <Footer />
      <EmailModal
        open={modalVariant !== null}
        onClose={closeModal}
        variant={modalVariant ?? "trial_download"}
      />
    </>
  );
}
