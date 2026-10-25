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

  let requestBody: Record<string, unknown> = {};
  try { requestBody = await req.json(); } catch { requestBody = {}; }
  if (requestBody.action === "save_announcement") {
    const message = String(requestBody.message || "").trim();
    const isActive = requestBody.is_active === true;
    const expiresRaw = requestBody.expires_at ? String(requestBody.expires_at) : "";
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
    if (message.length > 1200) return new Response(JSON.stringify({ error: "متن پیام حداکثر ۱۲۰۰ نویسه باشد." }), { status: 400, headers: cors });
    if (isActive && !message) return new Response(JSON.stringify({ error: "برای انتشار، متن پیام را وارد کنید." }), { status: 400, headers: cors });
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now())) return new Response(JSON.stringify({ error: "زمان پایان باید در آینده باشد." }), { status: 400, headers: cors });
    const { data: saved, error: saveError } = await adminClient.from("app_announcements").upsert({
      id: 1, message, is_active: isActive, expires_at: expiresAt ? expiresAt.toISOString() : null,
      updated_at: new Date().toISOString(), updated_by: user.id
    }, { onConflict: "id" }).select("id,message,is_active,expires_at,updated_at").single();
    if (saveError || !saved) return new Response(JSON.stringify({ error: "ذخیره پیام همگانی انجام نشد." }), { status: 500, headers: cors });
    return new Response(JSON.stringify({ ok: true, announcement: saved }), { status: 200, headers: cors });
  }
  if (requestBody.action === "get_announcement") {
    const { data: announcement, error: announcementError } = await adminClient.from("app_announcements").select("id,message,is_active,expires_at,updated_at").eq("id", 1).maybeSingle();
    if (announcementError) return new Response(JSON.stringify({ error: "دریافت پیام همگانی انجام نشد." }), { status: 500, headers: cors });
    return new Response(JSON.stringify({ announcement: announcement || { id: 1, message: "", is_active: false, expires_at: null } }), { status: 200, headers: cors });
  }

  if (requestBody.action === "delete_user") {
    const targetId = String(requestBody.user_id || "");
    const confirmEmail = String(requestBody.confirm_email || "").trim().toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      return new Response(JSON.stringify({ error: "شناسهٔ حساب نامعتبر است." }), { status: 400, headers: cors });
    }
    if (targetId === user.id) return new Response(JSON.stringify({ error: "حساب مدیر جاری را نمی‌توان از داخل پنل حذف کرد." }), { status: 409, headers: cors });
    const { data: targetData, error: targetError } = await adminClient.auth.admin.getUserById(targetId);
    const target = targetData?.user;
    if (targetError || !target) return new Response(JSON.stringify({ error: "حساب انتخاب‌شده پیدا نشد." }), { status: 404, headers: cors });
    if (!target.email || target.email.toLowerCase() !== confirmEmail) {
      return new Response(JSON.stringify({ error: "ایمیل تأیید با ایمیل حساب انتخاب‌شده مطابقت ندارد." }), { status: 400, headers: cors });
    }
    if (target.email.toLowerCase() === "elida600000@gmail.com") {
      return new Response(JSON.stringify({ error: "حساب اصلی مدیر از این مسیر قابل حذف نیست." }), { status: 409, headers: cors });
    }
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetId, false);
    if (deleteError) return new Response(JSON.stringify({ error: "حذف حساب انجام نشد: " + deleteError.message }), { status: 500, headers: cors });
    return new Response(JSON.stringify({ ok: true, deleted_user_id: targetId }), { status: 200, headers: cors });
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
    adminClient.from("subscriptions").select("id,plan_id,status,ends_at"),
    adminClient.from("payment_transactions").select("id,status,amount_irr,subscription_id"),
  ]);
  if (plansResult.error || subscriptionsResult.error || paymentsResult.error) {
    return new Response(JSON.stringify({ error: "دریافت خلاصه اشتراک و پرداخت انجام نشد." }), { status: 500, headers: cors });
  }

  const now = Date.now();
  const subscriptions = subscriptionsResult.data || [];
  const payments = paymentsResult.data || [];
  const paidSubscriptionIds = new Set(payments
    .filter((p) => p.status === "succeeded" && p.subscription_id)
    .map((p) => p.subscription_id));
  const isCurrentlyActive = (s) => s.status === "active" && (!s.ends_at || new Date(s.ends_at).getTime() > now);
  const billing = {
    activePlans: (plansResult.data || []).filter((p) => p.is_active).length,
    activeSubscriptions: subscriptions.filter(isCurrentlyActive).length,
    freeSubscriptions: subscriptions.filter((s) => isCurrentlyActive(s) && s.plan_id === "premium" && !paidSubscriptionIds.has(s.id)).length,
    pendingPayments: payments.filter((p) => p.status === "pending").length,
    successfulPayments: payments.filter((p) => p.status === "succeeded").length,
    grossRevenueIrr: payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + Number(p.amount_irr || 0), 0),
  };

  return new Response(JSON.stringify({ users, total: users.length, billing }), { status: 200, headers: cors });
});