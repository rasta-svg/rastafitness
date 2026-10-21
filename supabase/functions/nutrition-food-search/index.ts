import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function nutrient(foodNutrients: any[] = [], ids: number[], names: string[]) {
  const found = foodNutrients.find((n) => {
    const id = Number(n.nutrientId ?? n.nutrient?.id ?? n.nutrientNumber);
    const name = String(n.nutrientName ?? n.nutrient?.name ?? "").toLowerCase();
    return ids.includes(id) || names.some((x) => name.includes(x));
  });
  if (!found || typeof found.value !== "number") return null;
  return { value: found.value, unit: found.unitName ?? found.nutrient?.unitName ?? null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "AUTH_REQUIRED" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!supabaseUrl || !supabaseKey) return json({ error: "SUPABASE_AUTH_NOT_CONFIGURED" }, 503);

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "AUTH_REQUIRED" }, 401);

  const apiKey = Deno.env.get("USDA_FDC_API_KEY");
  if (!apiKey) {
    return json({
      error: "USDA_API_KEY_MISSING",
      message: "برای جستجوی علمی مواد غذایی، مدیر پروژه باید کلید USDA FoodData Central را در Secrets تابع با نام USDA_FDC_API_KEY ثبت کند. هیچ کلیدی نباید در کد یا APK قرار گیرد.",
    }, 503);
  }

  let body: { query?: unknown };
  try { body = await req.json(); } catch { return json({ error: "INVALID_JSON" }, 400); }
  const query = typeof body.query === "string" ? body.query.trim().slice(0, 100) : "";
  if (query.length < 2) return json({ error: "QUERY_TOO_SHORT", message: "نام غذا را با حداقل دو نویسه وارد کنید." }, 400);

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", apiKey);
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ query, pageSize: 10, dataType: ["Foundation", "SR Legacy", "Survey (FNDDS)"] }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return json({ error: "USDA_UNAVAILABLE", message: "ارتباط با پایگاه داده USDA برقرار نشد؛ کمی بعد دوباره تلاش کنید." }, 502);
  }
  if (!upstream.ok) {
    return json({
      error: upstream.status === 429 ? "USDA_RATE_LIMIT" : "USDA_REQUEST_FAILED",
      message: upstream.status === 429 ? "محدودیت موقت درخواست‌های USDA؛ بعداً دوباره تلاش کنید." : "جستجوی USDA ناموفق بود.",
    }, upstream.status === 429 ? 429 : 502);
  }

  const result = await upstream.json();
  const foods = (Array.isArray(result.foods) ? result.foods : []).map((f: any) => {
    const nutrients = f.foodNutrients ?? [];
    return {
      fdc_id: f.fdcId,
      description: f.description ?? "",
      data_type: f.dataType ?? null,
      food_category: f.foodCategory ?? null,
      brand_owner: f.brandOwner ?? null,
      basis_grams: 100,
      energy_kcal: nutrient(nutrients, [1008, 2047, 2048, 208], ["energy"])?.value ?? null,
      protein_g: nutrient(nutrients, [1003, 203], ["protein"])?.value ?? null,
      carbohydrate_g: nutrient(nutrients, [1005, 205], ["carbohydrate, by difference", "carbohydrate"])?.value ?? null,
      fat_g: nutrient(nutrients, [1004, 204], ["total lipid", "total fat"])?.value ?? null,
      fiber_g: nutrient(nutrients, [1079, 291], ["fiber, total dietary", "dietary fiber"])?.value ?? null,
      calcium_mg: nutrient(nutrients, [1087, 301], ["calcium, ca", "calcium"])?.value ?? null,
      sodium_mg: nutrient(nutrients, [1093, 307], ["sodium, na", "sodium"])?.value ?? null,
      source: "USDA FoodData Central",
      source_url: "https://fdc.nal.usda.gov/food/" + f.fdcId,
      data_quality: "source_import_pending_review",
      warning: "مقادیر منبع رسمی هستند، اما نام/حالت پخت/اندازه سهم و مواد حساسیت‌زا باید پیش از استفاده در رژیم بررسی شوند.",
    };
  });
  return json({ source: "USDA FoodData Central", count: foods.length, foods });
});
