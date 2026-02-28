-- ============================================================================
-- LemonSqueezy Webhook Tables
-- Stores synced purchase, subscription, and license key data from LemonSqueezy
-- ============================================================================

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemonsqueezy_customer_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemonsqueezy_order_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  product_name TEXT,
  variant_name TEXT,
  status TEXT NOT NULL,
  total INTEGER,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemonsqueezy_subscription_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  product_name TEXT,
  variant_name TEXT,
  status TEXT NOT NULL,
  card_brand TEXT,
  card_last_four TEXT,
  trial_ends_at TIMESTAMPTZ,
  renews_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- License keys table
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lemonsqueezy_license_key_id TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  product_name TEXT,
  variant_name TEXT,
  license_key TEXT NOT NULL,
  status TEXT NOT NULL,
  activation_limit INTEGER,
  activation_usage INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_license_keys_customer ON license_keys(customer_id);
CREATE INDEX idx_license_keys_key ON license_keys(license_key);

-- RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_keys ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own customer record (matched by email)
CREATE POLICY "Users can read own customer record"
  ON customers FOR SELECT
  USING (email = auth.jwt()->>'email');

-- Authenticated users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
  ON subscriptions FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE email = auth.jwt()->>'email'
  ));

-- Authenticated users can read their own license keys
CREATE POLICY "Users can read own license keys"
  ON license_keys FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE email = auth.jwt()->>'email'
  ));

-- Authenticated users can read their own orders
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  USING (customer_id IN (
    SELECT id FROM customers WHERE email = auth.jwt()->>'email'
  ));
