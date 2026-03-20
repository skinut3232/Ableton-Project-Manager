"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Container from "./ui/Container";
import SplitHeader from "./SplitHeader";
import { FEATURES, FEATURE_SECTIONS, MOBILE_SYNC_NOTE } from "@/lib/constants";

/* Short descriptions shown beside the phone mockup in the Sync section */
const SYNC_BULLETS: Record<string, string> = {
  "Android App": "Your full project library synced to your phone. Browse sessions, read notes, and prep for your next studio day.",
  "Offline Access": "Everything is cached locally. No Wi-Fi needed once synced.",
  "Bounce Playback": "Listen to your latest bounces anywhere — on the train, on the couch, wherever ideas hit.",
  "Push Notifications": "Get notified when sync completes or when new bounces are ready to review.",
};
import { fadeInUp } from "@/lib/animations";

export default function Features() {
  return (
    <div id="features">
      {FEATURES.map((feature, i) => {
        const section = FEATURE_SECTIONS[i];
        const isLast = i === FEATURES.length - 1;

        return (
          <section
            key={feature.headline}
            className="border-t border-section-border py-20 sm:py-[120px]"
          >
            <Container>
              {/* Split header with label, headline, description, and numbered link */}
              <SplitHeader
                label={section.label}
                headline={feature.headline}
                description={feature.body}
                linkNumber={section.link.number}
                linkText={section.link.text}
              />

              {/* Visual — phone mockup for Sync, window frame for everything else */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeInUp}
              >
                {isLast ? (
                  /* Sync section: phone mockup + feature bullets side by side */
                  <div className="grid grid-cols-1 items-center gap-12 sm:grid-cols-[auto_1fr] sm:gap-12">
                    {/* Phone frame */}
                    <div className="mx-auto w-[260px] rounded-[28px] border-2 border-border-secondary bg-surface-2 p-3">
                      <div className="overflow-hidden rounded-[18px] bg-surface">
                        {feature.screenshot ? (
                          <Image
                            src={feature.screenshot}
                            alt={feature.screenshotLabel}
                            width={260}
                            height={520}
                            className="block w-full"
                          />
                        ) : (
                          <div className="flex aspect-[9/16] items-center justify-center">
                            <p className="text-xs text-tertiary">{feature.screenshotLabel}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Feature bullets */}
                    <div className="space-y-6">
                      {section.subFeatures.map((sf) => (
                        <div key={sf.number}>
                          <p className="text-[15px] font-semibold text-heading-secondary">
                            {sf.label}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-body">
                            {SYNC_BULLETS[sf.label] ?? ""}
                          </p>
                        </div>
                      ))}
                      <p className="text-sm text-body-muted">{MOBILE_SYNC_NOTE}</p>
                    </div>
                  </div>
                ) : (
                  /* Standard sections: screenshot in window frame */
                  <>
                    {feature.screenshot ? (
                      <div className="overflow-hidden rounded-[10px] border border-border bg-surface">
                        {/* Titlebar dots */}
                        <div className="flex items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
                          <div className="h-2 w-2 rounded-full bg-border-secondary" />
                          <div className="h-2 w-2 rounded-full bg-border-secondary" />
                          <div className="h-2 w-2 rounded-full bg-border-secondary" />
                        </div>
                        <Image
                          src={feature.screenshot}
                          alt={feature.screenshotLabel}
                          width={960}
                          height={540}
                          className="block w-full"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center rounded-[10px] border border-border bg-surface">
                        <p className="text-sm text-tertiary">{feature.screenshotLabel}</p>
                      </div>
                    )}

                    {/* Technical note */}
                    {feature.technicalNote && (
                      <p className="mt-3 text-sm text-body-muted italic">
                        {feature.technicalNote}
                      </p>
                    )}
                  </>
                )}
              </motion.div>

              {/* Numbered sub-features grid (skip for Sync — bullets shown beside phone) */}
              {section.subFeatures && !isLast && (
                <div className="mx-auto mt-12 grid max-w-[500px] grid-cols-2 gap-x-10 gap-y-2">
                  {section.subFeatures.map((sf) => (
                    <p key={sf.number} className="text-[13px] text-tertiary">
                      <span className="tabular-nums">{sf.number}</span>{" "}
                      {sf.label}
                    </p>
                  ))}
                </div>
              )}
            </Container>
          </section>
        );
      })}
    </div>
  );
}
