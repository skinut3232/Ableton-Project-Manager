// LemonSqueezy Webhook Handler — Supabase Edge Function
// Receives webhook events from LemonSqueezy and syncs data to Supabase tables.
// Deploy with: supabase functions deploy lemonsqueezy-webhook --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const WEBHOOK_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET")!;

// ==========================================================================
// Signature Verification
// ==========================================================================

async function verifySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const hexDigest = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe comparison
  if (hexDigest.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < hexDigest.length; i++) {
    result |= hexDigest.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

// ==========================================================================
// Customer Upsert
// ==========================================================================

// Upsert a customer record — returns the Supabase UUID for foreign key linking.
async function upsertCustomer(
  lsCustomerId: string,
  email: string,
  name: string | null
): Promise<string | null> {
  const { data, error } = await supabase
    .from("customers")
    .upsert(
      {
        lemonsqueezy_customer_id: String(lsCustomerId),
        email,
        name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lemonsqueezy_customer_id" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("Customer upsert error:", error);
    return null;
  }
  return data.id;
}

// ==========================================================================
// Event Handlers
// ==========================================================================

async function handleOrderCreated(dataId: string, attributes: any) {
  // Upsert customer first
  const customerId = await upsertCustomer(
    String(attributes.customer_id),
    attributes.user_email,
    attributes.user_name
  );

  // Insert order
  const { error } = await supabase.from("orders").upsert(
    {
      lemonsqueezy_order_id: String(dataId),
      customer_id: customerId,
      product_name: attributes.first_order_item?.product_name ?? null,
      variant_name: attributes.first_order_item?.variant_name ?? null,
      status: attributes.status,
      total: attributes.total,
      currency: attributes.currency ?? "USD",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lemonsqueezy_order_id" }
  );

  if (error) console.error("Order upsert error:", error);
}

async function handleSubscriptionCreated(dataId: string, attributes: any) {
  // Upsert customer
  const customerId = await upsertCustomer(
    String(attributes.customer_id),
    attributes.user_email,
    attributes.user_name
  );

  // Insert subscription
  const { error } = await supabase.from("subscriptions").upsert(
    {
      lemonsqueezy_subscription_id: String(dataId),
      customer_id: customerId,
      product_name: attributes.product_name,
      variant_name: attributes.variant_name,
      status: attributes.status,
      card_brand: attributes.card_brand,
      card_last_four: attributes.card_last_four,
      trial_ends_at: attributes.trial_ends_at,
      renews_at: attributes.renews_at,
      ends_at: attributes.ends_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lemonsqueezy_subscription_id" }
  );

  if (error) console.error("Subscription upsert error:", error);
}

async function handleSubscriptionUpdated(dataId: string, attributes: any) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: attributes.status,
      card_brand: attributes.card_brand,
      card_last_four: attributes.card_last_four,
      renews_at: attributes.renews_at,
      ends_at: attributes.ends_at,
      updated_at: new Date().toISOString(),
    })
    .eq("lemonsqueezy_subscription_id", String(dataId));

  if (error) console.error("Subscription update error:", error);
}

async function handleSubscriptionExpired(dataId: string, attributes: any) {
  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "expired",
      ends_at: attributes.ends_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("lemonsqueezy_subscription_id", String(dataId));

  if (error) console.error("Subscription expired update error:", error);
}

async function handleLicenseKeyCreated(dataId: string, attributes: any) {
  // Upsert customer
  const customerId = await upsertCustomer(
    String(attributes.customer_id),
    attributes.user_email,
    attributes.user_name
  );

  // Look up the order by LemonSqueezy order ID to get our UUID
  let orderId: string | null = null;
  if (attributes.order_id) {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("lemonsqueezy_order_id", String(attributes.order_id))
      .single();
    orderId = data?.id ?? null;
  }

  // Insert license key
  const { error } = await supabase.from("license_keys").upsert(
    {
      lemonsqueezy_license_key_id: String(dataId),
      customer_id: customerId,
      order_id: orderId,
      product_name: attributes.product_name ?? null,
      variant_name: attributes.variant_name ?? null,
      license_key: attributes.key,
      status: attributes.status,
      activation_limit: attributes.activation_limit,
      activation_usage: attributes.activation_usage ?? 0,
      expires_at: attributes.expires_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lemonsqueezy_license_key_id" }
  );

  if (error) console.error("License key upsert error:", error);
}

// ==========================================================================
// Main Handler
// ==========================================================================

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Read raw body for signature verification
  const body = await req.text();

  // Verify HMAC signature
  const signature = req.headers.get("x-signature");
  if (!signature) {
    console.error("Missing X-Signature header");
    return new Response("Unauthorized", { status: 401 });
  }

  const valid = await verifySignature(body, signature, WEBHOOK_SECRET);
  if (!valid) {
    console.error("Invalid signature");
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse event
  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    console.error("Invalid JSON body");
    return new Response("Bad request", { status: 400 });
  }

  const eventName: string = event.meta?.event_name;
  const dataId: string = event.data?.id;
  const attributes = event.data?.attributes;

  if (!eventName || !dataId || !attributes) {
    console.error("Missing event data:", { eventName, dataId });
    return new Response("Bad request", { status: 400 });
  }

  console.log(`Processing event: ${eventName} (data.id: ${dataId})`);

  // Route to handler
  try {
    switch (eventName) {
      case "order_created":
        await handleOrderCreated(dataId, attributes);
        break;
      case "subscription_created":
        await handleSubscriptionCreated(dataId, attributes);
        break;
      case "subscription_updated":
        await handleSubscriptionUpdated(dataId, attributes);
        break;
      case "subscription_expired":
        await handleSubscriptionExpired(dataId, attributes);
        break;
      case "license_key_created":
        await handleLicenseKeyCreated(dataId, attributes);
        break;
      default:
        console.log(`Unhandled event: ${eventName}`);
    }
  } catch (err) {
    console.error(`Error handling ${eventName}:`, err);
    // Still return 200 to prevent LemonSqueezy retries for processing errors
    // The data is logged and can be investigated
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
