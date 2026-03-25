// Email templates for drip sequences (Deno-compatible version).
// Mirrors site/src/lib/email-templates.ts but runs in Supabase Edge Functions.

const PURCHASE_URL = "https://setcrate.lemonsqueezy.com/";
const SITE_URL = "https://setcrate.app";
const SUPPORT_EMAIL = "support@setcrate.app";

function wrap(body: string, unsubscribeUrl?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin: 0; padding: 0; background-color: #0A0A0B; color: #E4E4E7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; line-height: 1.6;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px;">
    <div style="margin-bottom: 32px;">
      <strong style="color: #FAFAFA; font-size: 18px;">SetCrate</strong>
    </div>
    ${body}
    <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #1E1E24; font-size: 12px; color: #52525B;">
      <p>SetCrate · Made by a producer, for producers</p>
      <p><a href="${SITE_URL}" style="color: #6366F1;">setcrate.app</a> · <a href="mailto:${SUPPORT_EMAIL}" style="color: #6366F1;">support@setcrate.app</a></p>
      ${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}" style="color: #52525B;">Unsubscribe</a></p>` : ""}
    </div>
  </div>
</body>
</html>`.trim();
}

function ctaButton(text: string, href: string): string {
  return `
    <div style="margin: 28px 0;">
      <a href="${href}" style="display: inline-block; background: linear-gradient(135deg, #6366F1, #7C3AED); color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 500; font-size: 15px;">${text}</a>
    </div>`;
}

// Template registry keyed by drip name for easy lookup in the drip-sender.
export interface EmailTemplate {
  subject: string;
  html: string;
}

export function getTemplate(key: string, unsubscribeUrl?: string): EmailTemplate | null {
  switch (key) {
    case "trial_day_3":
      return {
        subject: "3 things most producers miss in SetCrate",
        html: wrap(`
          <p>Hey! You're a few days into your trial. Here are three features most people don't discover on their own:</p>
          <p><strong style="color: #FAFAFA;">1. Tags</strong><br />Right-click any project → Add Tag. Use genre, mood, stage (demo, mixing, done), client name, whatever makes sense for how you think about your music.</p>
          <p><strong style="color: #FAFAFA;">2. Session Notes</strong><br />Open any project → click the Notes tab. Write down what you were going for, what needs work, which plugins to try next. This is the context your DAW can't store.</p>
          <p><strong style="color: #FAFAFA;">3. Missing Sample Detection</strong><br />Look for projects with a red badge in your library. Click one and you'll see exactly which samples are missing and where they were supposed to be. No more opening a project to a wall of red.</p>
          <p>Hit reply if you have questions. Happy to help!</p>
          <p style="color: #71717A;">Rob, SetCrate</p>
        `, unsubscribeUrl),
      };

    case "trial_day_7":
      return {
        subject: "You're halfway through your SetCrate trial",
        html: wrap(`
          <p>One week in! How's it going?</p>
          <p>By now you've probably got your library scanned and tagged. Here's what to explore this week:</p>
          <p><strong style="color: #FAFAFA;">Collections</strong><br />Group projects into playlists. Create a "Release Candidates" or "Need to Finish" collection and drag projects in.</p>
          <p><strong style="color: #FAFAFA;">Keyboard Shortcuts</strong><br />Press <code style="background: #1E1E24; padding: 2px 6px; border-radius: 4px; color: #A1A1AA;">Ctrl+F</code> or <code style="background: #1E1E24; padding: 2px 6px; border-radius: 4px; color: #A1A1AA;">/</code> to jump to search. <code style="background: #1E1E24; padding: 2px 6px; border-radius: 4px; color: #A1A1AA;">Space</code> plays/pauses the current bounce.</p>
          <p><strong style="color: #FAFAFA;">Dashboard</strong><br />Click Dashboard in the sidebar to see your library health at a glance: missing samples, projects without bounces, stale sessions.</p>
          <p>You've got 7 more days. If SetCrate is saving you time, you can lock in your license anytime:</p>
          ${ctaButton("Buy Now, $29 (one-time)", PURCHASE_URL)}
          <p style="color: #71717A;">Rob, SetCrate</p>
        `, unsubscribeUrl),
      };

    case "trial_day_10":
      return {
        subject: "Have you tried mobile sync?",
        html: wrap(`
          <p>Quick one: did you know SetCrate has a mobile companion app?</p>
          <p>It syncs your full library to your phone: projects, metadata, bounces, notes. So you can:</p>
          <ul style="padding-left: 20px; color: #A1A1AA;">
            <li style="margin-bottom: 8px;">Listen to your latest bounces on the couch or commute</li>
            <li style="margin-bottom: 8px;">Browse your project library away from the studio</li>
            <li style="margin-bottom: 8px;">Walk into your next session already knowing what you're working on</li>
          </ul>
          <p>Mobile sync is <strong style="color: #E4E4E7;">included free</strong> during your trial. It's available on Android now (iOS coming soon).</p>
          <p>4 days left in your trial. Grab your license to keep everything you've built:</p>
          ${ctaButton("Buy Now, $29", PURCHASE_URL)}
          <p style="color: #71717A;">Rob, SetCrate</p>
        `, unsubscribeUrl),
      };

    case "trial_expiring":
      return {
        subject: "Your SetCrate trial ends in 2 days",
        html: wrap(`
          <p>Heads up! Your free trial ends in <strong style="color: #FAFAFA;">2 days</strong>.</p>
          <p>Everything you've built (your library, tags, collections, session notes) is saved locally and won't be deleted. But you'll need a license to keep using SetCrate.</p>
          <p>It's a one-time purchase. No subscription, no recurring charges. Your license works on up to 3 computers.</p>
          ${ctaButton("Buy Now, $29 (lifetime)", PURCHASE_URL)}
          <p>If SetCrate isn't right for you, no hard feelings at all. But if it's been useful, now's the time.</p>
          <p style="color: #71717A;">Rob, SetCrate</p>
        `, unsubscribeUrl),
      };

    case "purchase_welcome":
      return {
        subject: "You're in! Your SetCrate license is activated",
        html: wrap(`
          <p style="color: #FAFAFA; font-size: 17px; font-weight: 600; margin-bottom: 16px;">Thanks for buying SetCrate!</p>
          <p>Your license is activated and you're all set. All your projects, notes, and session history are right where you left them.</p>
          <p>A few things worth knowing:</p>
          <ul style="padding-left: 20px; color: #A1A1AA;">
            <li style="margin-bottom: 8px;">Your license works on <strong style="color: #E4E4E7;">up to 3 computers</strong> (studio desktop, laptop, backup)</li>
            <li style="margin-bottom: 8px;">Updates are <strong style="color: #E4E4E7;">free forever</strong>. You'll see a banner when a new version is available</li>
            <li style="margin-bottom: 8px;">If you ever need to move your license, go to Settings → Deactivate, then re-activate on the new machine</li>
          </ul>
          <p>If you run into anything at all, reply to this email or reach out at <a href="mailto:${SUPPORT_EMAIL}" style="color: #6366F1;">${SUPPORT_EMAIL}</a>.</p>
          <p>Happy producing.</p>
          <p style="color: #71717A;">Rob, SetCrate</p>
        `, unsubscribeUrl),
      };

    case "purchase_day_3":
      return {
        subject: "Get more out of SetCrate",
        html: wrap(`
          <p>Now that you're settled in, here are some power-user features you might not have found yet:</p>
          <p><strong style="color: #FAFAFA;">Smart Collections</strong><br />Create collections with rules (e.g., "all projects tagged 'techno' with BPM > 130") and they auto-populate as you add projects.</p>
          <p><strong style="color: #FAFAFA;">Bulk Tagging</strong><br />Select multiple projects in the library → right-click → apply tags to all of them at once.</p>
          <p><strong style="color: #FAFAFA;">Keyboard Shortcuts</strong><br /><code style="background: #1E1E24; padding: 2px 6px; border-radius: 4px; color: #A1A1AA;">Ctrl+Shift+R</code> opens a random project (great for rediscovering old ideas). <code style="background: #1E1E24; padding: 2px 6px; border-radius: 4px; color: #A1A1AA;">Ctrl+R</code> refreshes your library after adding new projects.</p>
          <p>And if you haven't tried <strong style="color: #E4E4E7;">mobile sync</strong> yet, it's $3.99/mo and puts your entire library on your phone. Browse projects, listen to bounces, review notes, all away from the studio.</p>
          <p style="color: #71717A;">Rob, SetCrate</p>
        `, unsubscribeUrl),
      };

    case "winback_day_3":
      return {
        subject: "Your sessions are still waiting",
        html: wrap(`
          <p>Hey! Your SetCrate trial ended a few days ago, and I wanted to check in.</p>
          <p>Your library is still there. Every project, tag, session note, and collection is saved locally on your machine. Nothing was deleted. You just need a license to open SetCrate again.</p>
          ${ctaButton("Buy Now, $29 (one-time)", PURCHASE_URL)}
          <p>If something didn't work the way you expected, or if you hit a wall during the trial, I'd genuinely love to hear about it. Just reply to this email.</p>
          <p style="color: #71717A;">Rob, SetCrate</p>
        `, unsubscribeUrl),
      };

    case "winback_day_10":
      return {
        subject: "One last thing from SetCrate",
        html: wrap(`
          <p>I know you're busy making music, so I'll keep this short.</p>
          <p>Your SetCrate library is still on your machine with all your projects and notes intact. If you want to pick it back up, here's the link:</p>
          ${ctaButton("Buy Now, $29", PURCHASE_URL)}
          <p>This is the last email I'll send about your trial. If you ever want to come back, the link above works anytime.</p>
          <p>Thanks for giving SetCrate a shot. I appreciate it.</p>
          <p style="color: #71717A;">Rob, SetCrate</p>
        `, unsubscribeUrl),
      };

    default:
      return null;
  }
}
