// Generic HMAC verification supporting Gumroad (X-Gumroad-Signature) and Lemon Squeezy (X-Signature)
async function verifyHmac(request, secret) {
  const text = await request.text(); // RAW body
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBytes = await crypto.subtle.sign("HMAC", key, enc.encode(text));
  // hex encode
  const b = new Uint8Array(signatureBytes);
  const hex = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  const got = request.headers.get("x-gumroad-signature") || request.headers.get("x-signature") || "";
  const safeEqual = (a, b) => a.length === b.length && crypto.subtle.timingSafeEqual ? crypto.subtle.timingSafeEqual(new TextEncoder().encode(a), new TextEncoder().encode(b)) : a === b;
  // timingSafeEqual isn't currently in Workers, so fall back to strict equality
  return { ok: hex === got, rawBody: text };
}

function parseBody(text, contentType) {
  const type = (contentType || "").toLowerCase();
  if (type.includes("application/json")) {
    try { return JSON.parse(text); } catch { return {}; }
  }
  // Many Gumroad pings send form-encoded
  const params = new URLSearchParams(text);
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  // Some providers nest JSON in a 'payload' field
  if (obj.payload) {
    try { return JSON.parse(obj.payload); } catch {}
  }
  return obj;
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const secret = env.GUMROAD_WEBHOOK_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), { status: 500, headers: {"content-type":"application/json"} });
  }

  // We need the raw body twice: once to verify, then to parse. Clone request.
  const clone = request.clone();
  const { ok, rawBody } = await verifyHmac(clone, secret);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 403, headers: {"content-type":"application/json"} });
  }

  const contentType = request.headers.get("content-type") || "";
  const data = parseBody(rawBody, contentType);

  // Try to extract buyer email and event
  const email = (data.email || data.buyer_email || (data.purchaser && data.purchaser.email) || (data.sale && data.sale.email) || "").toLowerCase();
  const event = data.event || data.action || data.type || "sale";
  if (!email) {
    return new Response(JSON.stringify({ error: "Email not found in payload" }), { status: 400, headers: {"content-type":"application/json"} });
  }

  // Upsert subscription row
  await context.env.DB.prepare(
    `INSERT INTO subscriptions (email, provider, status, raw_json)
     VALUES (?, 'gumroad', 'active', ?)
     ON CONFLICT(email) DO UPDATE SET status='active', raw_json=excluded.raw_json, updated_at=CURRENT_TIMESTAMP`
  ).bind(email, JSON.stringify(data)).run();

  // Ensure user exists
  await context.env.DB.prepare(
    `INSERT INTO users (email) VALUES (?) ON CONFLICT(email) DO NOTHING`
  ).bind(email).run();

  // Audit
  await context.env.DB.prepare(
    `INSERT INTO audit (email, action, meta_json) VALUES (?, 'webhook', ?)`
  ).bind(email, JSON.stringify({ event, provider: "gumroad" })).run();

  return new Response(JSON.stringify({ ok: true }), { headers: {"content-type":"application/json"} });
}
