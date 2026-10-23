import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: cors });
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const auth = req.headers.get("Authorization");
  if (!url || !anon || !auth) return new Response(JSON.stringify({ error: "authentication_required" }), { status: 401, headers: cors });
  const supabase = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new Response(JSON.stringify({ error: "invalid_session" }), { status: 401, headers: cors });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: cors }); }
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
  const mode = ["general", "meal_ideas", "food_substitution", "plan_review"].includes(String(body.mode)) ? String(body.mode) : "general";
  if (!message) return new Response(JSON.stringify({ error: "message_required" }), { status: 400, headers: cors });
  const flags: string[] = [];
  if (/(سریع لاغر|گرسنگی شدید|روزه.{0,8}(طولانی|چند روز)|استفراغ|ملین|خودکشی|آسیب به خود)/i.test(message)) flags.push("sensitive_request");
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: "ai_provider_not_configured",
      message: "زیرساخت استاد تغذیه آماده است، اما کلید امن سرویس هوش مصنوعی هنوز در Secrets سرور ثبت نشده است. تا آن زمان می‌توانم فقط راهنمایی عمومی و غیرشخصی ارائه کنم.",
      safety_flags: flags
    }), { status: 503, headers: cors });
  }
  const system = `تو استاد تغذیه رستا فیتنس هستی. به فارسی پاسخ بده، روشن و عملی باش. تشخیص یا درمان پزشکی نده و کالری یا مقادیر غذایی را قطعی اعلام نکن مگر داده معتبر داشته باشی. اگر کاربر زیر ۱۸ سال است یا بارداری/بیماری/اختلال خوردن مطرح است، رژیم محدودکننده و هدف کاهش وزن تهاجمی نده و ارجاع به متخصص را توصیه کن. آلرژی را جدی بگیر و هیچ غذای حساسیت‌زا را به عنوان جایگزین پیشنهاد نده. به جای توصیه خطرناک، گزینه ایمن و متعادل بده. درخواست کاربر: حالت=${mode}.`;
  let answer = "";
  try {
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini", temperature: 0.4, max_tokens: 900, messages: [{ role: "system", content: system }, { role: "user", content: message }] })
    });
    if (!completion.ok) return new Response(JSON.stringify({ error: "ai_provider_error", status: completion.status }), { status: 502, headers: cors });
    const result = await completion.json();
    answer = String(result.choices?.[0]?.message?.content || "").trim();
  } catch {
    return new Response(JSON.stringify({ error: "ai_temporarily_unavailable" }), { status: 502, headers: cors });
  }
  if (!answer) return new Response(JSON.stringify({ error: "empty_ai_response" }), { status: 502, headers: cors });
  return new Response(JSON.stringify({ answer, mode, safety_flags: flags }), { status: 200, headers: cors });
});