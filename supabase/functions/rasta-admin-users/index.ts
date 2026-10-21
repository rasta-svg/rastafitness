import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: cors });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return new Response(JSON.stringify({ error: "Server configuration missing" }), { status: 500, headers: cors });

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return new Response(JSON.stringify({ error: "ورود مدیر الزامی است." }), { status: 401, headers: cors });

  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !user || (user.email || "").toLowerCase() !== "elida600000@gmail.com") {
    return new Response(JSON.stringify({ error: "دسترسی غیرمجاز است." }), { status: 403, headers: cors });
  }

  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return new Response(JSON.stringify({ error: "دریافت کاربران انجام نشد." }), { status: 500, headers: cors });

  const { data: presenceRows } = await adminClient
    .from("user_presence")
    .select("user_id,last_seen,app_state");
  const presenceByUser = new Map((presenceRows || []).map((p) => [p.user_id, p]));
  const nowMs = Date.now();
  const users = (data.users || []).map((u) => {
    const presence = presenceByUser.get(u.id);
    const lastSeen = presence?.last_seen || u.last_sign_in_at || null;
    const freshHeartbeat = Boolean(presence?.last_seen) &&
      (nowMs - new Date(presence.last_seen).getTime()) <= 90000;
    return {
      id: u.id,
      email: u.email || "",
      phone: u.phone || u.user_metadata?.phone || "",
      name: u.user_metadata?.full_name || u.user_metadata?.name || "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      last_seen: lastSeen,
      online: freshHeartbeat && presence?.app_state === "active",
      email_confirmed_at: u.email_confirmed_at || null,
    };
  });

  const [plansResult, subscriptionsResult, paymentsResult] = await Promise.all([
    adminClient.from("subscription_plans").select("id,is_active"),
    adminClient.from("subscriptions").select("id,status,ends_at"),
    adminClient.from("payment_transactions").select("id,status,amount_irr"),
  ]);
  if (plansResult.error || subscriptionsResult.error || paymentsResult.error) {
    return new Response(JSON.stringify({ error: "دریافت خلاصه اشتراک و پرداخت انجام نشد." }), { status: 500, headers: cors });
  }

  const now = Date.now();
  const subscriptions = subscriptionsResult.data || [];
  const payments = paymentsResult.data || [];
  const billing = {
    activePlans: (plansResult.data || []).filter((p) => p.is_active).length,
    activeSubscriptions: subscriptions.filter((s) => s.status === "active" && (!s.ends_at || new Date(s.ends_at).getTime() > now)).length,
    pendingPayments: payments.filter((p) => p.status === "pending").length,
    successfulPayments: payments.filter((p) => p.status === "succeeded").length,
    grossRevenueIrr: payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + Number(p.amount_irr || 0), 0),
  };

  return new Response(JSON.stringify({ users, total: users.length, billing }), { status: 200, headers: cors });
});