import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const ADMIN_EMAIL = "elida600000@gmail.com";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server configuration missing" }, 500);

  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "ابتدا وارد حساب رستا شوید." }, 401);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return json({ error: "نشست معتبر نیست؛ دوباره وارد شوید." }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "درخواست نامعتبر است." }, 400); }
  const action = String(body.action || "");
  const isAdmin = (user.email || "").toLowerCase() === ADMIN_EMAIL;

  if (action === "get_announcement") {
    const { data, error } = await db.from("rasta_announcements").select("message,expires_at,dismiss_after_sessions,updated_at").eq("id", true).maybeSingle();
    if (error) return json({ error: "دریافت پیام همگانی انجام نشد." }, 500);
    const active = !!data?.message && (!data.expires_at || new Date(data.expires_at).getTime() > Date.now());
    return json({ announcement: active ? data : null });
  }

  if (action === "save_announcement") {
    if (!isAdmin) return json({ error: "فقط مدیر اجازهٔ تغییر پیام همگانی را دارد." }, 403);
    const message = String(body.message || "").trim().slice(0, 1200);
    const hours = Math.max(0, Math.min(8760, Number(body.hours || 0)));
    const sessions = Math.max(0, Math.min(1000, Math.floor(Number(body.sessions || 0))));
    if (!Number.isFinite(hours) || !Number.isFinite(sessions)) return json({ error: "مدت یا تعداد ورود و خروج معتبر نیست." }, 400);
    const expiresAt = hours > 0 ? new Date(Date.now() + hours * 3600000).toISOString() : null;
    const { error } = await db.from("rasta_announcements").upsert({ id: true, message, expires_at: expiresAt, dismiss_after_sessions: sessions, updated_at: new Date().toISOString() });
    if (error) return json({ error: "ذخیرهٔ پیام همگانی انجام نشد." }, 500);
    return json({ ok: true, announcement: message ? { message, expires_at: expiresAt, dismiss_after_sessions: sessions } : null });
  }

  if (action === "config") {
    const { data, error } = await db.from("payment_settings")
      .select("card_number,cardholder_name,instructions").eq("id", true).maybeSingle();
    if (error) return json({ error: "دریافت اطلاعات کارت ممکن نشد." }, 500);
    const [{ data: plan }, { data: customNutritionPlan }, { data: consultationPlan }] = await Promise.all([
      db.from("subscription_plans").select("price_irr").eq("id", "premium").maybeSingle(),
      db.from("subscription_plans").select("price_irr").eq("id", "custom_nutrition").maybeSingle(),
      db.from("subscription_plans").select("price_irr").eq("id", "nutrition_consultation").maybeSingle(),
    ]);
    return json({ config: {
      card_number: data?.card_number || "",
      cardholder_name: data?.cardholder_name || "",
      instructions: data?.instructions || "",
      enabled: /^\d{16}$/.test(data?.card_number || "") && Boolean(data?.cardholder_name),
      price_toman: Math.round(Number(plan?.price_irr || 0) / 10),
      custom_nutrition_price_toman: Math.round(Number(customNutritionPlan?.price_irr || 0) / 10),
      nutrition_consultation_price_toman: Math.round(Number(consultationPlan?.price_irr || 0) / 10),
    } });
  }

  if (action === "submit") {
    const planId = String(body.plan_id || "");
    const reference = String(body.transfer_reference || "").trim().slice(0, 100);
    const transferTime = String(body.transfer_time || "").trim().slice(0, 80);
    if (!["premium", "custom_nutrition", "nutrition_consultation"].includes(planId)) return json({ error: "نوع خرید معتبر نیست." }, 400);
    if (reference.length < 3) return json({ error: "شماره پیگیری یا شناسه واریز را وارد کنید." }, 400);
    const { data: config } = await db.from("payment_settings").select("card_number,cardholder_name").eq("id", true).maybeSingle();
    if (!config || !/^\d{16}$/.test(config.card_number || "") || !config.cardholder_name) {
      return json({ error: "اطلاعات کارت مقصد هنوز توسط مدیر تنظیم نشده است." }, 409);
    }
    const { data: plan, error: planError } = await db.from("subscription_plans")
      .select("id,price_irr,is_active,billing_interval").eq("id", planId).maybeSingle();
    const validPlan = planId === "premium"
      ? plan?.billing_interval === "month"
      : plan?.billing_interval === "none";
    if (planError || !plan || !plan.is_active || Number(plan.price_irr) <= 0 || !validPlan) {
      return json({ error: planId === "premium" ? "تعرفه اشتراک ویژه در دسترس نیست." : "تعرفه ساخت اختصاصی برنامه غذایی در دسترس نیست." }, 409);
    }
    const { data: existing } = await db.from("payment_transactions")
      .select("id,status").eq("user_id", user.id).eq("status", "pending")
      .eq("provider_response->>plan_id", planId).limit(1).maybeSingle();
    if (existing) return json({ error: "یک درخواست پرداخت در انتظار بررسی دارید.", transaction_id: existing.id }, 409);

    const { data: transaction, error: insertError } = await db.from("payment_transactions").insert({
      user_id: user.id,
      provider: "manual_card_transfer",
      idempotency_key: crypto.randomUUID(),
      amount_irr: Number(plan.price_irr),
      currency: "IRR",
      status: "pending",
      provider_response: {
        plan_id: plan.id,
        quoted_price_irr: Number(plan.price_irr),
        transfer_reference: reference,
        transfer_time: transferTime,
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
      },
    }).select("id,status,amount_irr,created_at").single();
    if (insertError) return json({ error: "ثبت درخواست پرداخت انجام نشد. دوباره تلاش کنید." }, 500);
    return json({ transaction, message: "درخواست ثبت شد؛ پس از بررسی و تأیید مدیر، اشتراک فعال می‌شود." });
  }

  if (!isAdmin) return json({ error: "این عملیات فقط برای مدیر مجاز است." }, 403);

  if (action === "save_config") {
    const cardNumber = String(body.card_number || "").replace(/[\s-]/g, "");
    const cardholderName = String(body.cardholder_name || "").trim().slice(0, 120);
    const instructions = String(body.instructions || "").trim().slice(0, 500);
    if (cardNumber && !/^\d{16}$/.test(cardNumber)) return json({ error: "شماره کارت باید ۱۶ رقم باشد؛ بدون فاصله وارد کنید." }, 400);
    if (cardNumber && !cardholderName) return json({ error: "نام صاحب کارت را وارد کنید." }, 400);
    const { error } = await db.from("payment_settings").upsert({
      id: true, card_number: cardNumber, cardholder_name: cardholderName,
      instructions: instructions || "پس از کارت‌به‌کارت، شماره پیگیری را ثبت کنید. اشتراک پس از بررسی و تأیید مدیر فعال می‌شود.",
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (error) return json({ error: "ذخیره تنظیمات کارت انجام نشد." }, 500);
    return json({ ok: true, enabled: /^\d{16}$/.test(cardNumber) && Boolean(cardholderName) });
  }

  if (action === "set_price" || action === "set_custom_nutrition_price" || action === "set_nutrition_consultation_price") {
    const toman = Number(body.price_toman);
    if (!Number.isSafeInteger(toman) || toman < 1000 || toman > 100000000) return json({ error: "مبلغ باید بین ۱٬۰۰۰ تا ۱۰۰٬۰۰۰٬۰۰۰ تومان باشد." }, 400);
    const planId = action === "set_custom_nutrition_price" ? "custom_nutrition" : action === "set_nutrition_consultation_price" ? "nutrition_consultation" : "premium";
    const { data: plan, error } = await db.from("subscription_plans").update({ price_irr: toman * 10, updated_at: new Date().toISOString() }).eq("id", planId).select("id,price_irr").single();
    if (error || !plan) return json({ error: planId === "premium" ? "ذخیره مبلغ اشتراک انجام نشد." : planId === "custom_nutrition" ? "ذخیره مبلغ ساخت اختصاصی برنامه غذایی انجام نشد." : "ذخیره مبلغ مشاوره هوشمند پیشرفته انجام نشد." }, 500);
    return json({ ok: true, plan_id: planId, price_toman: Math.round(Number(plan.price_irr) / 10) });
  }

  if (action === "grant_custom_nutrition_credit") {
    const email = String(body.email || "").trim().toLowerCase();
    const expiresAtInput = String(body.expires_at || "");
    const expiresAt = new Date(expiresAtInput + "T23:59:59.999Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAtInput) || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return json({ error: "تاریخ انقضا باید یک تاریخ معتبر در آینده باشد." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "ایمیل معتبر کاربر را وارد کنید." }, 400);
    let target = null;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: "جست‌وجوی کاربران انجام نشد." }, 500);
      target = (data.users || []).find((u) => (u.email || "").toLowerCase() === email) || null;
      if (target || (data.users || []).length < 1000) break;
    }
    if (!target) return json({ error: "کاربری با این ایمیل پیدا نشد؛ ابتدا باید در رستا ثبت‌نام کند." }, 404);
    const { data: credit, error } = await db.from("custom_nutrition_purchases").insert({ user_id: target.id, transaction_id: null, status: "paid", grant_source: "admin_complimentary", expires_at: expiresAt.toISOString() }).select("id,status,created_at,expires_at").single();
    if (error || !credit) return json({ error: "اعطای رایگان اعتبار برنامه غذایی انجام نشد." }, 500);
    return json({ ok: true, user: { email: target.email || email }, credit, message: "یک اعتبار رایگان ساخت برنامه غذایی اختصاصی اعطا شد." });
  }

  if (action === "grant_complimentary") {
    const email = String(body.email || "").trim().toLowerCase();
    const expiresAtInput = String(body.expires_at || "");
    const expiresAt = new Date(expiresAtInput + "T23:59:59.999Z");
    const planId = String(body.plan_id || "");
    if (!["premium", "trainer", "gym"].includes(planId)) return json({ error: "نوع دسترسی رایگان معتبر نیست." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "ایمیل معتبر کاربر را وارد کنید." }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAtInput) || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) return json({ error: "تاریخ انقضا باید یک تاریخ معتبر در آینده باشد." }, 400);
    let target = null;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: "جست‌وجوی کاربران انجام نشد." }, 500);
      target = (data.users || []).find((u) => (u.email || "").toLowerCase() === email) || null;
      if (target || (data.users || []).length < 1000) break;
    }
    if (!target) return json({ error: "کاربری با این ایمیل پیدا نشد؛ ابتدا باید در رستا ثبت‌نام کند." }, 404);
    const { data: current, error: currentError } = await db.from("subscriptions").select("id,ends_at").eq("user_id", target.id).eq("plan_id", planId).eq("status", "active");
    if (currentError) return json({ error: "بررسی اشتراک فعلی کاربر انجام نشد." }, 500);
    const now = new Date();
    const valid = (current || []).filter((s) => !s.ends_at || new Date(s.ends_at) > now);
    const start = now;
    const end = expiresAt;
    if (end <= start) return json({ error: "تاریخ انقضا باید بعد از زمان فعلی باشد." }, 400);
    if (valid.length) {
      const { error } = await db.from("subscriptions").update({ status: "expired", ends_at: now.toISOString(), updated_at: now.toISOString() }).in("id", valid.map((s) => s.id));
      if (error) return json({ error: "به‌روزرسانی اشتراک قبلی ناموفق بود." }, 500);
    }
    const { data: granted, error: grantError } = await db.from("subscriptions").insert({ user_id: target.id, plan_id: planId, status: "active", starts_at: start.toISOString(), ends_at: end.toISOString(), grant_source: "admin_complimentary", updated_at: now.toISOString() }).select("id,starts_at,ends_at").single();
    if (grantError) return json({ error: "اعطای اشتراک رایگان انجام نشد." }, 500);
    return json({ ok: true, user: { email: target.email || email, name: String(target.user_metadata?.full_name || target.user_metadata?.name || "") }, subscription: granted, plan_id: planId, expires_at: end.toISOString(), message: "دسترسی رایگان با موفقیت اعطا شد." });
  }

  if (action === "list_complimentary_grants") {
    const [{ data: subscriptions, error: subscriptionsError }, { data: credits, error: creditsError }, { data: userPage, error: usersError }] = await Promise.all([
      db.from("subscriptions").select("id,user_id,plan_id,starts_at,ends_at,created_at,grant_source").eq("grant_source", "admin_complimentary").order("created_at", { ascending: false }).limit(500),
      db.from("custom_nutrition_purchases").select("id,user_id,created_at,status,grant_source,expires_at").eq("grant_source", "admin_complimentary").order("created_at", { ascending: false }).limit(500),
      db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (subscriptionsError || creditsError || usersError) return json({ error: "دریافت سوابق اعطای رایگان انجام نشد." }, 500);
    const users = new Map((userPage.users || []).map((u) => [u.id, { email: u.email || "", name: String(u.user_metadata?.full_name || u.user_metadata?.name || "") }]));
    const planNames: Record<string, string> = { premium: "ورزش و رژیم غذایی پریمیوم", trainer: "اشتراک مربی (Trainer)", gym: "اشتراک باشگاه (Gym)" };
    const grants = [
      ...(subscriptions || []).map((s) => ({ id: s.id, user: users.get(s.user_id) || { email: "", name: "" }, item: planNames[s.plan_id] || s.plan_id, type: "subscription", created_at: s.created_at, starts_at: s.starts_at, ends_at: s.ends_at })),
      ...(credits || []).map((c) => ({ id: c.id, user: users.get(c.user_id) || { email: "", name: "" }, item: "یک اعتبار ساخت برنامه غذایی اختصاصی", type: "custom_nutrition", created_at: c.created_at, status: c.status, ends_at: c.expires_at })),
    ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return json({ grants });
  }

  if (action === "admin_list") {
    const { data: transactions, error } = await db.from("payment_transactions")
      .select("id,user_id,amount_irr,status,provider,created_at,verified_at,provider_response")
      .eq("provider", "manual_card_transfer").order("created_at", { ascending: false }).limit(100);
    if (error) return json({ error: "دریافت درخواست‌های پرداخت انجام نشد." }, 500);
    const { data: userPage, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return json({ error: "دریافت مشخصات کاربران انجام نشد." }, 500);
    const userMap = new Map((userPage.users || []).map((u) => [u.id, {
      email: u.email || "",
      name: String(u.user_metadata?.full_name || u.user_metadata?.name || ""),
    }]));
    return json({ transactions: (transactions || []).map((t) => ({
      ...t,
      user: userMap.get(t.user_id) || { email: "", name: "" },
    })) });
  }

  if (action === "review") {
    const transactionId = String(body.transaction_id || "");
    const approve = body.approve === true;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(transactionId)) {
      return json({ error: "شناسه درخواست نامعتبر است." }, 400);
    }
    const { data, error } = await db.rpc("review_manual_payment", {
      p_transaction_id: transactionId,
      p_approve: approve,
      p_admin_user_id: user.id,
    });
    if (error) return json({ error: error.message || "بررسی پرداخت انجام نشد." }, 409);
    return json({ result: data, message: approve ? "پرداخت تأیید شد و دسترسی خدمت خریداری‌شده فعال شد." : "درخواست پرداخت رد شد." });
  }

  return json({ error: "عملیات ناشناخته است." }, 400);
});
