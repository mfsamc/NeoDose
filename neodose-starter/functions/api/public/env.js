export async function onRequestGet({ env }) {
  const publicEnv = {
    SUPABASE_URL: env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || "",
    CHECKOUT_URL: env.CHECKOUT_URL || "",
    APP_NAME: "NeoDose"
  };
  return new Response(JSON.stringify(publicEnv), {
    headers: { "content-type": "application/json" },
    status: 200,
  });
}
