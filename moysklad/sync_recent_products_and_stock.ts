import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRICE_TYPE_ID = {
  "Цены для Онлайн заказов": "33a432af-9a7a-11ee-0a80-135e00112483",
  "Цена продажи": "5195afd0-a892-11ed-0a80-0d0500173e59",
  "Цена продажи 8%": "e817a62d-f0d9-11ee-0a80-09c1000e8d97",
  "Цена продажи 10%": "4aec5efd-aa20-11ed-0a80-026d00219b07",
  "Цена продажи 12%": "bda00bcb-b056-11ed-0a80-034b002a02f4",
  "Цена продажи 15%": "58e04505-ab93-11ed-0a80-0cad003e067b",
  "Цена со скидкой": "e817a742-f0d9-11ee-0a80-09c1000e8d98",
  "Минимальная цена +5": "e6c203d7-0621-11f0-0a80-00660017e910",
  "Цена продажи +10": "e6c20556-0621-11f0-0a80-00660017e911",
  "Цена продажи +20": "e6c20678-0621-11f0-0a80-00660017e912",
  "Цена Рассрочки 92%": "e6c20777-0621-11f0-0a80-00660017e913",
} as const;

const PRODUCT_URL =
  "https://api.moysklad.ru/api/remap/1.2/entity/product?order=updated,desc&limit=100&expand=images";
const STOCK_URL =
  "https://api.moysklad.ru/api/remap/1.2/report/stock/all/current";

function extractUuid(href) {
  if (typeof href !== "string") return null;
  const match = href.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  return match ? match[0] : null;
}

function getSalePrice(priceTypeId, salePrices) {
  if (!priceTypeId || !Array.isArray(salePrices)) return null;

  const found = salePrices.find((sp) => sp?.priceType?.id === priceTypeId);
  const value = found?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

serve(async () => {
  const moyskladToken = Deno.env.get("MOYSKLAD_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const missing = [];

  if (!moyskladToken) missing.push("MOYSKLAD_TOKEN");
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  if (missing.length) {
    return new Response(
      JSON.stringify({
        error: `Missing env vars: ${missing.join(", ")}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const stockRequestStart = Date.now();
    const stockRes = await fetch(STOCK_URL, {
      headers: {
        Authorization: `Bearer ${moyskladToken}`,
        Accept: "application/json;charset=utf-8",
      },
    });

    console.log(
      `[MOYSKLAD] Stock response received (${Date.now() - stockRequestStart} ms)`,
    );

    if (!stockRes.ok) {
      const text = await stockRes.text();
      console.error(`[MOYSKLAD] Stock error ${stockRes.status}:`, text);
      return new Response(
        JSON.stringify({
          error: `MoySklad stock error: ${stockRes.status} ${text}`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const stockParseStart = Date.now();
    const stockData = await stockRes.json();
    console.log(
      `[MOYSKLAD] Stock JSON parsed (${Date.now() - stockParseStart} ms)`,
    );

    const stockRows = Array.isArray(stockData)
      ? stockData
      : Array.isArray(stockData?.rows)
        ? stockData.rows
        : [];

    const stockById = new Map(
      stockRows.map((row) => [row?.assortmentId, row?.stock]),
    );

    const productRequestStart = Date.now();
    const res = await fetch(PRODUCT_URL, {
      headers: {
        Authorization: `Bearer ${moyskladToken}`,
        Accept: "application/json;charset=utf-8",
      },
    });

    console.log(
      `[MOYSKLAD] Product response received (${Date.now() - productRequestStart} ms)`,
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[MOYSKLAD] Product error ${res.status}:`, text);
      return new Response(
        JSON.stringify({
          error: `MoySklad product error: ${res.status} ${text}`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    const parseStart = Date.now();
    const data = await res.json();
    console.log(
      `[MOYSKLAD] Product JSON parsed (${Date.now() - parseStart} ms)`,
    );

    const rows = Array.isArray(data?.rows) ? data.rows : [];
    console.log(`[MOYSKLAD] Received ${rows.length} products`);

    const payload = rows.map((p) => {
      const stock = stockById.get(p.id);
      const base = {
        moysklad_id: p.id,
        category_id: extractUuid(p?.productFolder?.meta?.href),
        name: p.name,
        description: p.description ?? null,
        price: getSalePrice(
          PRICE_TYPE_ID["Цены для Онлайн заказов"],
          p?.salePrices,
        ),
        image: p.images?.rows ?? [],
      };

      if (typeof stock === "number" && Number.isFinite(stock)) {
        return { ...base, stock };
      }

      return base;
    });

    if (!payload.length) {
      return new Response(JSON.stringify({ ok: true, upserted: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const start = Date.now();
    const { error } = await supabase
      .from("products")
      .upsert(payload, { onConflict: "moysklad_id" });

    if (error) {
      console.error("[DB] Upsert failed:", error);
      return new Response(
        JSON.stringify({ error: `DB upsert error: ${error.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`[DB] Upsert complete (${Date.now() - start} ms)`);

    const stockUpdates = stockRows.map((row) => ({
      moysklad_id: row?.assortmentId,
      stock: row?.stock,
    }));

    if (stockUpdates.length) {
      const stockUpdateStart = Date.now();
      const { error: stockError } = await supabase.rpc(
        "update_products_stock",
        { payload: stockUpdates },
      );

      if (stockError) {
        console.error("[DB] Stock update failed:", stockError);
        return new Response(
          JSON.stringify({
            error: `DB stock update error: ${stockError.message}`,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      console.log(
        `[DB] Stock update complete (${Date.now() - stockUpdateStart} ms)`,
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        upserted: payload.length,
        stock_updates: stockUpdates.length,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ERROR] Update failed:", error);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
