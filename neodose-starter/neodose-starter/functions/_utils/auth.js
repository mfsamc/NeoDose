// functions/_utils/auth.js
export async function getUserFromSupabaseToken(env, request) {
  const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }
  const token = authHeader.split(" ")[1];
  const supabaseUrl = env.SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { ok: false, status: 500, error: "Server not configured with Supabase" };
  }
  const resp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "apikey": anonKey,
    },
  });
  if (!resp.ok) {
    return { ok: false, status: 401, error: "Invalid token" };
  }
  const data = await resp.json();
  // Normalize shape
  const user = {
    id: data.id,
    email: (data.email || (data.user_metadata && data.user_metadata.email)) || null,
  };
  if (!user.email) {
    return { ok: false, status: 401, error: "Email not found on token" };
  }
  return { ok: true, user };
}

export async function ensureUserRow(env, user) {
  const { email, id } = user;
  const stmt = env.DB.prepare(
    `INSERT INTO users (supabase_id, email) VALUES (?, ?)
     ON CONFLICT(email) DO NOTHING`
  ).bind(id, email);
  await stmt.run();
}

export async function getUserPlan(env, email) {
  // If there is an active subscription row, user is pro
  const sub = await env.DB.prepare(
    `SELECT status FROM subscriptions WHERE email = ? ORDER BY updated_at DESC LIMIT 1`
  ).bind(email).first();
  const is_pro = !!(sub && sub.status === 'active');
  return is_pro;
}

export async function recordCalculation(env, email, payload_json, result_json) {
  await env.DB.prepare(
    `INSERT INTO calculations (email, payload_json, result_json) VALUES (?, ?, ?)`
  ).bind(email, JSON.stringify(payload_json || {}), JSON.stringify(result_json || {})).run();
}

export async function countTodayCalculations(env, email) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) as c FROM calculations 
     WHERE email=? AND date(created_at)=date('now')`
  ).bind(email).first();
  return row ? Number(row.c) : 0;
}
