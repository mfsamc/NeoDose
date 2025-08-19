import { getUserFromSupabaseToken, ensureUserRow, getUserPlan, recordCalculation, countTodayCalculations } from "../../_utils/auth.js";

export async function onRequestPost(context) {
  const { env, request } = context;
  const FREE_LIMIT = parseInt(env.FREE_DAILY_LIMIT || "5", 10);

  // Validate auth via Supabase
  const auth = await getUserFromSupabaseToken(env, request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: {"content-type":"application/json"} });
  }
  const user = auth.user;
  await ensureUserRow(env, user);

  const is_pro = await getUserPlan(env, user.email);

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: {"content-type":"application/json"} });
  }

  const { weightKg, regimen, customDoseMgPerKg } = body || {};
  const w = Number(weightKg || 0);
  if (!w || w <= 0) {
    return new Response(JSON.stringify({ error: "Weight (kg) is required" }), { status: 400, headers: {"content-type":"application/json"} });
  }

  // Rate limit free users
  const used = await countTodayCalculations(env, user.email);
  if (!is_pro && used >= FREE_LIMIT) {
    return new Response(JSON.stringify({ 
      error: "Free daily limit reached", 
      code: "LIMIT_REACHED", 
      used, 
      limit: FREE_LIMIT 
    }), { status: 402, headers: {"content-type":"application/json"} });
  }

  // --- Demo dosing logic (Caffeine Citrate) ---
  // References (for demo only): typical ranges: Loading 20 mg/kg; Maintenance 5–10 mg/kg/day.
  const dosePerKg = Number(customDoseMgPerKg || (regimen === "loading" ? 20 : 7.5));
  const doseMg = Math.round(w * dosePerKg * 10) / 10; // one decimal

  const result = {
    drug: "Caffeine Citrate",
    weightKg: w,
    regimen: regimen || (customDoseMgPerKg ? "custom" : "maintenance"),
    doseMgPerKg: dosePerKg,
    totalDoseMg: doseMg,
    notes: "Demo only. Validate per local NICU protocol before use."
  };

  // Record calculation
  await recordCalculation(env, user.email, body, result);

  return new Response(JSON.stringify({ ok: true, is_pro, used: used + 1, limit: is_pro ? null : FREE_LIMIT, result }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
