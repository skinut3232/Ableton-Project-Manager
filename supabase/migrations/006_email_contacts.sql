-- ============================================================================
-- Email Contacts — Unified CRM table
-- Merges landing site signups with LemonSqueezy purchase data.
-- Used by the drip-sender Edge Function to manage automated email sequences.
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,

  -- Lifecycle segment, updated by Edge Functions on lifecycle events.
  -- Values: trial_lead, trial_active, trial_expiring, trial_expired,
  --         customer_desktop, customer_sync, churned_sync
  segment TEXT NOT NULL DEFAULT 'trial_lead',

  -- Timestamps for drip sequence timing
  trial_started_at TIMESTAMPTZ,
  trial_expires_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ,
  subscription_started_at TIMESTAMPTZ,
  churned_at TIMESTAMPTZ,

  -- Link to LemonSqueezy customer record (populated on purchase)
  customer_id UUID REFERENCES customers(id),

  -- Resend audience contact ID (for syncing tags/properties)
  resend_contact_id TEXT,

  -- Drip tracking — stores the key of the last drip email sent (e.g. 'trial_day_3').
  -- The drip-sender checks this to avoid sending duplicates.
  last_drip_sent TEXT,
  last_drip_sent_at TIMESTAMPTZ,

  -- Opt-out
  unsubscribed BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ,

  -- Standard timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for drip-sender queries
CREATE INDEX idx_email_contacts_segment ON email_contacts(segment);
CREATE INDEX idx_email_contacts_trial_expires ON email_contacts(trial_expires_at);
CREATE INDEX idx_email_contacts_unsubscribed ON email_contacts(unsubscribed);

-- RLS — service-role only (no user-facing access needed)
ALTER TABLE email_contacts ENABLE ROW LEVEL SECURITY;

-- Backfill existing email_signups into email_contacts.
-- Sets trial_started_at to the signup date (best approximation).
-- ON CONFLICT DO NOTHING so re-running this migration is safe.
INSERT INTO email_contacts (email, segment, trial_started_at, trial_expires_at, created_at)
SELECT
  email,
  'trial_active',
  created_at,
  created_at + INTERVAL '14 days',
  created_at
FROM email_signups
WHERE source = 'trial_download'
ON CONFLICT (email) DO NOTHING;
