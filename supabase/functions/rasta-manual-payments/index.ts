import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://rasta-svg.github.io",
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

  if (action === "config") {
    const { data, error } = await db.from("payment_settings")
      .select("card_number,cardholder_name,instructions").eq("id", true).maybeSingle();
    if (error) return json({ error: "دریافت اطلاعات کارت ممکن نشد." }, 500);
    const { data: plan } = await db.from("subscription_plans").select("price_irr").eq("id", "premium").maybeSingle();
    return json({ config: data ? {
      card_number: data.card_number || "",
      cardholder_name: data.cardholder_name || "",
      instructions: data.instructions || "",
      enabled: /^\d{16}$/.test(data.card_number || "") && Boolean(data.cardholder_name),
      price_toman: Math.round(Number(plan?.price_irr || 0) / 10),
    } : { card_number: "", cardholder_name: "", instructions: "", enabled: false, price_toman: Math.round(Number(plan?.price_irr || 0) / 10) } });
  }

  if (action === "submit") {
    const planId = String(body.plan_id || "");
    const reference = String(body.transfer_reference || "").trim().slice(0, 100);
    const transferTime = String(body.transfer_time || "").trim().slice(0, 80);
    if (planId !== "premium") return json({ error: "در حال حاضر فقط اشتراک ویژه ورزشکار قابل خرید است." }, 400);
    if (reference.length < 3) return json({ error: "شماره پیگیری یا شناسه واریز را وارد کنید." }, 400);
    const { data: config } = await db.from("payment_settings").select("card_number,cardholder_name").eq("id", true).maybeSingle();
    if (!config || !/^\d{16}$/.test(config.card_number || "") || !config.cardholder_name) {
      return json({ error: "اطلاعات کارت مقصد هنوز توسط مدیر تنظیم نشده است." }, 409);
    }
    const { data: plan, error: planError } = await db.from("subscription_plans")
      .select("id,price_irr,is_active,billing_interval").eq("id", "premium").maybeSingle();
    if (planError || !plan || !plan.is_active || Number(plan.price_irr) <= 0 || plan.billing_interval !== "month") {
      return json({ error: "تعرفه اشتراک ویژه در دسترس نیست." }, 409);
    }
    const { data: existing } = await db.from("payment_transactions")
      .select("id,status").eq("user_id", user.id).eq("status", "pending").limit(1).maybeSingle();
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

  if (action === "set_price") {
    const toman = Number(body.price_toman);
    if (!Number.isSafeInteger(toman) || toman < 1000 || toman > 100000000) return json({ error: "مبلغ باید بین ۱٬۰۰۰ تا ۱۰۰٬۰۰۰٬۰۰۰ تومان باشد." }, 400);
    const { data: plan, error } = await db.from("subscription_plans").update({ price_irr: toman * 10, updated_at: new Date().toISOString() }).eq("id", "premium").select("id,price_irr").single();
    if (error || !plan) return json({ error: "ذخیره مبلغ اشتراک انجام نشد." }, 500);
    return json({ ok: true, price_toman: Math.round(Number(plan.price_irr) / 10) });
  }

  if (action === "grant_complimentary") {
    const email = String(body.email || "").trim().toLowerCase();
    const days = Number(body.days ?? 30);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "ایمیل معتبر کاربر را وارد کنید." }, 400);
    if (!Number.isInteger(days) || days < 1 || days > 3650) return json({ error: "مدت اشتراک باید بین ۱ تا ۳۶۵۰ روز باشد." }, 400);
    let target = null;
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) return json({ error: "جست‌وجوی کاربران انجام نشد." }, 500);
      target = (data.users || []).find((u) => (u.email || "").toLowerCase() === email) || null;
      if (target || (data.users || []).length < 1000) break;
    }
    if (!target) return json({ error: "کاربری با این ایمیل پیدا نشد؛ ابتدا باید در رستا ثبت‌نام کند." }, 404);
    const { data: current, error: currentError } = await db.from("subscriptions").select("id,ends_at").eq("user_id", target.id).eq("status", "active");
    if (currentError) return json({ error: "بررسی اشتراک فعلی کاربر انجام نشد." }, 500);
    const now = new Date();
    const valid = (current || []).filter((s) => !s.ends_at || new Date(s.ends_at) > now);
    const latestEnd = valid.reduce((max, s) => Math.max(max, s.ends_at ? new Date(s.ends_at).getTime() : now.getTime()), now.getTime());
    const start = new Date(Math.max(now.getTime(), latestEnd));
    const end = new Date(start.getTime() + days * 86400000);
    if (valid.length) {
      const { error } = await db.from("subscriptions").update({ status: "expired", ends_at: now.toISOString(), updated_at: now.toISOString() }).in("id", valid.map((s) => s.id));
      if (error) return json({ error: "به‌روزرسانی اشتراک قبلی ناموفق بود." }, 500);
    }
    const { data: granted, error: grantError } = await db.from("subscriptions").insert({ user_id: target.id, plan_id: "premium", status: "active", starts_at: start.toISOString(), ends_at: end.toISOString(), updated_at: now.toISOString() }).select("id,starts_at,ends_at").single();
    if (grantError) return json({ error: "اعطای اشتراک رایگان انجام نشد." }, 500);
    return json({ ok: true, user: { email: target.email || email, name: String(target.user_metadata?.full_name || target.user_metadata?.name || "") }, subscription: granted, days, message: "اشتراک رایگان ویژه با موفقیت اعطا شد." });
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
    return json({ result: data, message: approve ? "پرداخت تأیید شد و اشتراک ۳۰ روزه فعال شد." : "درخواست پرداخت رد شد." });
  }

  return json({ error: "عملیات ناشناخته است." }, 400);
});
