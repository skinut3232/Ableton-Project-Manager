# SetCrate Landing Page — Site Plan

## Summary of Decisions

| Decision | Choice |
|----------|--------|
| URL | setcrate.app |
| Pages | Single page (everything scrolls vertically) |
| Vibe | Dark and moody (Ableton-inspired) |
| Tone | Hype and aspirational |
| Accent color | Purple/violet |
| Inspiration sites | Splice.com, Output.com (Arcade) |
| Nav | Minimal — logo left, "Try Free for 14 Days" button right |
| Hero | Animated product demo video + headline + CTA |
| CTA button text | "Try Free for 14 Days" |
| Trial model | 14 days, full features including mobile sync |
| Email gate | Required before download (captures trial users for follow-up) |
| Product screenshots | Available, used in features section |
| Scroll animations | Subtle fades and parallax |
| Platform at launch | Windows only, macOS coming soon note |
| Desktop price | $29 one-time |
| Mobile sync price | $3.99/mo or $34.99/yr |
| Logo | Needs to be created |
| Footer legal | Privacy Policy, Terms of Service, support@setcrate.app |
| Copy | First draft below, you edit |

---

## Color Palette

Dark background with purple accent. Keep it simple — too many colors dilute the mood.

| Role | Color | Usage |
|------|-------|-------|
| Background | #0A0A0F (near-black with a hint of blue) | Page background |
| Surface | #141420 (slightly lighter dark) | Cards, sections with contrast |
| Border/Subtle | #1E1E2E (muted purple-gray) | Dividers, card borders |
| Body text | #B0B0C0 (soft gray-lavender) | Paragraph text |
| Heading text | #FFFFFF (white) | Headlines, emphasis |
| Accent primary | #8B5CF6 (vivid purple) | CTA buttons, highlights, links |
| Accent hover | #A78BFA (lighter purple) | Button hover states |
| Accent glow | #8B5CF620 (purple at ~12% opacity) | Subtle glow effects behind buttons, hero elements |
| Success/positive | #10B981 (green) | Checkmarks in pricing, positive states |
| Muted text | #6B6B80 | Footer text, captions, secondary info |

**Typography suggestion:** Inter or Satoshi for body, plus a bolder weight for headlines. Both are free, modern, and render well on dark backgrounds. Alternatively, Manrope has a slightly more creative feel that fits the music space.

---

## Page Structure (Top to Bottom)

### Section 1 — Nav Bar (Sticky)

Minimal. Stays visible as they scroll.

```
[SetCrate logo/wordmark]                    [Try Free for 14 Days →]
```

- Logo on left (wordmark for now since no logo exists — just "SetCrate" in a clean bold font)
- Single CTA button on right, purple accent color
- Semi-transparent background that gets slightly more opaque on scroll
- No other nav links — it's a single page, they'll scroll

---

### Section 2 — Hero

This is the first thing anyone sees. It needs to do three things in under 5 seconds: explain what SetCrate is, show it in action, and give them a reason to try it.

**Layout:** Centered text above, animated product demo video below.

**Copy draft:**

> **Headline:** Your sessions deserve better than a folder of "final_v2_REAL.als"
>
> **Subheadline:** SetCrate is project management built for Ableton Live. Organize sessions, track versions, capture ideas — and never lose work again.
>
> **CTA button:** Try Free for 14 Days →
>
> **Sub-CTA text:** Windows · Free for 14 days · No credit card required

**Below the CTA:** The animated product demo video (autoplaying, looped, muted). Show the app in action — creating a project, tagging a session, viewing version history. This is the "oh, I get it" moment.

**Built-by-a-producer tagline:** Small text below or near the hero, something like:
> Made by a producer who got tired of messy project folders.

Keep this subtle — a single line in muted text, not a section.

**Design notes:**
- Subtle purple glow behind the headline or CTA button
- The video/demo should have a slight shadow or border to float above the dark background
- Fade-in animation on load for the text, then the video slides up slightly

---

### Section 3 — Pain Section ("The Problem")

Before you show features, remind them why they need this. This is the "I feel seen" moment.

**Copy draft:**

> **Section headline:** Sound familiar?
>
> Three columns (or stacked on mobile), each with an icon and short description:
>
> **Column 1 — Lost in folders**
> "You've got 47 folders named 'beats,' 3 versions of the same track, and no idea which one had that synth patch you loved."
>
> **Column 2 — No context**
> "You open a .als file from 3 months ago and have zero memory of what you were going for, what's done, or what needs fixing."
>
> **Column 3 — Ideas slip away**
> "You had a breakthrough at 2am, didn't write it down, and now you're staring at the session trying to remember what you planned to do next."

**Design notes:**
- Dark surface cards on the darker background
- Subtle red/orange tint or desaturated colors to convey frustration (contrast with the purple "solution" sections that follow)
- Fade-in on scroll

---

### Section 4 — Features ("The Solution")

This is the meat. Four features, each with a screenshot and description. Alternate the layout: screenshot left / text right, then text left / screenshot right. This creates visual rhythm as they scroll.

**Copy draft:**

> **Section headline:** Everything your sessions need. Nothing they don't.

**Feature 1 — Project Organization**

> **Headline:** One home for every session.
>
> **Body:** Group your Live Sets into projects. Tag them by genre, mood, stage, client — whatever makes sense to you. Filter and find any session in seconds, not minutes.
>
> [Screenshot: project list view with tags and filters]

**Feature 2 — Version Tracking**

> **Headline:** Every version. Every change. Always recoverable.
>
> **Body:** SetCrate tracks your .als versions automatically. See what changed between saves, roll back to any point, and stop naming files "final_v3_actually_final.als" forever.
>
> [Screenshot: version history timeline for a project]

**Feature 3 — Notes, Photos & Session Logs**

> **Headline:** Capture what the DAW can't.
>
> **Body:** Attach notes to any session — what you were going for, what needs work, which plugins to try next. Snap photos of your hardware setup, mic placement, or that napkin sketch of your arrangement. It's all right there when you come back.
>
> [Screenshot: session detail view with notes and a photo]

**Feature 4 — Mobile Sync**

> **Headline:** Your studio in your pocket.
>
> **Body:** Sync your projects, notes, and session logs to your phone. Review your work on the couch, capture ideas on the go, and walk into your next session ready to work.
>
> [Screenshot: mobile app showing synced project on phone — could be a phone mockup frame]
>
> **Small note below:** Included free during your 14-day trial. $3.99/mo or $34.99/yr after.

**Design notes:**
- Each feature block fades in as it enters the viewport
- Screenshots should have a subtle purple border or glow
- Generous whitespace between features — let them breathe
- The mobile sync feature could show a phone mockup alongside the desktop screenshot to visually reinforce "works on both"

---

### Section 5 — Pricing

Clean, no surprises. Two cards side by side.

**Copy draft:**

> **Section headline:** Simple pricing. No subscriptions required.

**Card 1 — SetCrate Desktop**

> **Price:** $29
> **Label:** One-time purchase
>
> - Organize unlimited projects and sessions
> - Automatic version tracking
> - Notes, photos, and session logs
> - Activate on up to 3 computers
> - Free updates
>
> **Button:** Try Free for 14 Days →
>
> **Sub-text:** Windows · No credit card required

**Card 2 — Mobile Sync Add-On**

> **Price:** $3.99/mo or $34.99/yr (save 27%)
> **Label:** Optional subscription
>
> - Sync projects to your phone
> - Access notes and session logs anywhere
> - Capture ideas on the go
> - Requires SetCrate Desktop
>
> **Button:** Included Free in Trial
>
> **Sub-text:** Try it during your 14-day trial, decide later

**Design notes:**
- Desktop card is the primary/larger card, slightly elevated or with a purple border
- Mobile Sync card is secondary, slightly smaller or more muted
- The Desktop card should feel like "this is what you're buying" and the Mobile card like "and you can add this if you want"
- Toggle or tabs for monthly/annual on the mobile sync card
- Green checkmarks next to each feature line

---

### Section 6 — Before/After or Comparison (Optional but Powerful)

A quick visual comparison of "without SetCrate" vs. "with SetCrate." This reinforces the pain section with a concrete visual.

**Copy draft:**

> **Section headline:** Stop surviving. Start organizing.

Two-column comparison:

| Without SetCrate | With SetCrate |
|---|---|
| 47 folders named "beats" | One searchable project library |
| "Which version had that bassline?" | Full version history with diffs |
| "What was I doing in this session?" | Notes and context for every session |
| Alt-tabbing to Notes.app | Everything lives inside one tool |
| "I had an idea but forgot it" | Capture ideas from your phone |

**Design notes:**
- Left column (without) in muted/gray text
- Right column (with) in white text with purple checkmarks
- Could animate: left side fades in slightly desaturated, right side fades in brighter

---

### Section 7 — Platform Roadmap

Brief and honest. Shows momentum and that this is actively developed.

**Copy draft:**

> **Section headline:** Where we're headed

A simple horizontal timeline or roadmap graphic:

> **Now:** Windows desktop app + mobile sync (iOS & Android)
> **Next:** macOS support
> **Later:** Collaboration features, Ableton Link integration

Keep this tight — three items max. Don't overpromise.

**Design notes:**
- Simple timeline graphic with dots or a progress bar
- "Now" items in full white/purple, "Next" slightly muted, "Later" most muted
- This section can be small — it's a confidence builder, not a main attraction

---

### Section 8 — FAQ

Address the objections before they become reasons not to buy.

**Draft FAQ items:**

**Q: Is there a free trial?**
A: Yes. SetCrate is fully functional for 14 days, including mobile sync. No credit card required. After the trial, purchase a desktop license to keep using it.

**Q: What happens to my data after the trial ends?**
A: Your projects, notes, and version history are saved locally. Nothing is deleted. Once you activate a license, everything is right where you left it.

**Q: Does SetCrate work with Ableton Live Lite / Intro / Standard / Suite?**
A: Yes. SetCrate works with any edition of Ableton Live that saves .als files.

**Q: Is macOS supported?**
A: Not yet — Windows only at launch. macOS support is our top priority and is actively in development. Sign up for updates and we'll let you know when it ships.

**Q: Do I need the mobile sync subscription?**
A: No. The desktop app is fully functional on its own. Mobile sync is an optional add-on if you want to access your project notes and session logs from your phone.

**Q: Can I activate my license on multiple computers?**
A: Yes. Each desktop license can be activated on up to 3 machines (e.g., studio desktop, laptop, backup).

**Q: What if I want a refund?**
A: If SetCrate isn't right for you, reach out to support@setcrate.app within 14 days of purchase and we'll sort it out.

**Design notes:**
- Accordion style (click to expand)
- Keep it to 6–8 questions max
- Muted styling, doesn't need to be flashy

---

### Section 9 — Final CTA (Closing)

One last push. Repeat the CTA for people who scrolled the whole page and are now convinced.

**Copy draft:**

> **Headline:** Ready to take control of your sessions?
>
> **Subheadline:** 14 days free. No credit card. No commitment.
>
> **Button:** Try Free for 14 Days →
>
> **Sub-text:** Windows · Made by a producer, for producers.

**Design notes:**
- Full-width section with a subtle purple gradient or glow
- Larger text than the rest of the page — this is the climax
- Mirror the hero CTA styling for visual consistency

---

### Section 10 — Footer

Clean, minimal, functional.

```
SetCrate                                          Twitter · Instagram · YouTube

Privacy Policy · Terms of Service · support@setcrate.app

© 2026 SetCrate. Made by a producer, for producers.
```

**Design notes:**
- Muted text on dark background
- Social icons (not text links) for Twitter/X, Instagram, YouTube
- No unnecessary links — keep it clean

---

## Email Gate Flow

When someone clicks "Try Free for 14 Days," they don't immediately download. Instead:

1. A modal or inline form appears asking for their email
2. Copy on the form: "Enter your email to download SetCrate. We'll send you tips during your trial and a reminder before it ends."
3. They enter email → click "Download Now"
4. The download starts immediately
5. Their email is added to your mailing list

**Why this matters:** You now have a list of every trial user. You can send:
- **Day 1:** Welcome email with getting started tips
- **Day 7:** "Here's what you've been missing" email highlighting features they may not have found
- **Day 10–12:** "Your trial ends in 3 days — here's what you'll lose access to" (list their project count if possible, or just the features)
- **Day 14:** "Trial ended. Unlock SetCrate for $29." Direct link to checkout.
- **Day 21:** Last nudge for non-converters.

This email sequence is one of the highest-leverage things you can build. It converts trial users who would otherwise forget. You can set this up later with LemonSqueezy's built-in email features or a free tier of something like Buttondown or Resend.

---

## Trial Download UX

After the email gate, the download section should be clear about what they're getting:

```
┌─────────────────────────────────┐
│  ⬇ Download for Windows        │
│  SetCrate-1.0.0-setup.exe      │
│  Windows 10/11 · 85 MB         │
│                                 │
│  🍎 macOS — Coming Soon         │
│  Leave your email and we'll     │
│  notify you when it's ready.    │
└─────────────────────────────────┘
```

The macOS "coming soon" doubles as another email capture opportunity. Different list segment — these are people who want your product but literally can't use it yet. Gold for launch day.

---

## Technical Notes for Implementation

**Framework:** Next.js (App Router)
**Hosting:** Vercel (free tier)
**Domain:** setcrate.app → CNAME to cname.vercel-dns.com (already set up in Cloudflare)
**Styling:** Tailwind CSS (dark theme utility classes, easy to match the color palette above)
**Animations:** Framer Motion (works natively with Next.js/React, great for scroll-triggered fades and parallax)
**Video:** Self-hosted MP4 in the public folder or use a lightweight embed. Keep it under 10MB for fast loading.
**Email capture:** Start simple with a form that POSTs to a serverless function (Vercel API route) which adds the email to your list. Can integrate with LemonSqueezy's email features or a third-party later.
**Checkout integration:** LemonSqueezy provides a JavaScript overlay. After trial, the "Buy Now" button opens the checkout without leaving your site.
**Analytics:** Vercel Analytics (free, built-in) or Plausible (privacy-friendly, $9/mo). Avoid Google Analytics — music producers tend to run ad blockers and GA is blocked by most of them. Plausible isn't.

---

## Assets You Need to Prepare

Before we build the site, you'll need these ready:

1. **Logo or wordmark** — Even a clean text-only wordmark ("SetCrate" in a specific font) works for launch. We can design something later.
2. **Animated product demo** — The hero video. Record your screen, then polish it (speed up slow parts, add transitions, overlay purple accents). Tools: OBS for recording, DaVinci Resolve (free) or After Effects for editing.
3. **4 product screenshots** — One for each feature section. Clean, real data (not lorem ipsum), consistent window size.
4. **Mobile mockup** — A screenshot of the mobile app inside a phone frame. Plenty of free phone mockup templates online.
5. **Favicon** — A small icon for the browser tab. Can be a simple purple "S" or crate icon.
6. **Open Graph image** — The preview image when your link is shared on Twitter/Discord/etc. 1200x630px, dark background, SetCrate name, one-line description, maybe a small screenshot.
7. **Privacy Policy & Terms of Service** — Can be generated from templates (many free generators online), but review them. They need to cover data collection (email, license keys, usage analytics if any) and your refund approach.

---

## Page Copy Checklist

All first-draft copy is included in the section breakdowns above. Here's the full list for easy reference:

- [ ] Hero headline
- [ ] Hero subheadline
- [ ] Hero sub-CTA text
- [ ] "Built by a producer" tagline
- [ ] Pain section — 3 pain point descriptions
- [ ] Features section headline
- [ ] Feature 1 — Organization headline + body
- [ ] Feature 2 — Version tracking headline + body
- [ ] Feature 3 — Notes/photos headline + body
- [ ] Feature 4 — Mobile sync headline + body
- [ ] Pricing section headline
- [ ] Desktop card — features list
- [ ] Mobile Sync card — features list
- [ ] Before/after comparison items
- [ ] Roadmap items (3)
- [ ] FAQ — 7 questions and answers
- [ ] Final CTA headline + subheadline
- [ ] Footer copy
- [ ] Email gate modal copy
- [ ] macOS coming soon copy
