import { getUserFromSupabaseToken, ensureUserRow, getUserPlan, countTodayCalculations } from "../../_utils/auth.js";

export async function onRequestGet(context) {
  const { env, request } = context;
  const FREE_LIMIT = parseInt(env.FREE_DAILY_LIMIT || "5", 10);

  const auth = await getUserFromSupabaseToken(env, request);
  if (!auth.ok) {
    return new Response(JSON.stringify({ authenticated: false, reason: auth.error }), { status: 200, headers: {"content-type":"application/json"} });
  }
  const user = auth.user;
  await ensureUserRow(env, user);
  const is_pro = await getUserPlan(env, user.email);
  const used = await countTodayCalculations(env, user.email);

  return new Response(JSON.stringify({
    authenticated: true,
    user: { email: user.email },
    is_pro,
    usage: { used, limit: is_pro ? null : FREE_LIMIT }
  }), { headers: {"content-type":"application/json"} });
}
