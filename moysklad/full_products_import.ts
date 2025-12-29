import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const MOYSKLAD_TOKEN = process.env.MOYSKLAD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

if (!MOYSKLAD_TOKEN) throw new Error("MOYSKLAD_TOKEN is missing");
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const LIMIT = 100;
const STOCK_URL =
  "https://api.moysklad.ru/api/remap/1.2/report/stock/all/current";

function extractUuid(href) {
  if (typeof href !== "string") return null;
  const match = href.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  return match ? match[0] : null;
}

/**
 * Finds a sale price value by price type id.
 * Mirrors: .salePrices[] | select(.priceType.id == "<id>") | .value
 *
 * @param {string} priceTypeId
 * @param {Array<any> | undefined | null} salePrices
 * @returns {number | null}
 */
function getSalePrice(priceTypeId, salePrices) {
  if (!priceTypeId || !Array.isArray(salePrices)) return null;

  const found = salePrices.find((sp) => sp?.priceType?.id === priceTypeId);

  const value = found?.value;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function upsertBatch(payload, page) {
  if (!payload.length) {
    console.log(`[DB] Page ${page}: nothing to upsert`);
    return;
  }

  console.log(`[DB] Page ${page}: upserting ${payload.length} products...`);

  const start = Date.now();
  const { error } = await supabase
    .from("products")
    .upsert(payload, { onConflict: "moysklad_id" });

  if (error) {
    console.error("[DB] Upsert failed:", error);
    throw new Error(`DB upsert error: ${error.message}`);
  }

  console.log(`[DB] Page ${page}: upsert complete (${Date.now() - start} ms)`);
}

async function syncProducts() {
  console.log("[INIT] Starting product sync");
  console.log("[INIT] Supabase URL:", SUPABASE_URL);

  let offset = 0;
  let totalSize = null;
  let totalFetched = 0;
  let page = 1;

  while (true) {
    console.log(
      `\n[MOYSKLAD] Page ${page}: requesting products (limit=${LIMIT}, offset=${offset})`,
    );

    const requestStart = Date.now();

    const url = `https://api.moysklad.ru/api/remap/1.2/entity/product?expand=images&limit=${LIMIT}&offset=${offset}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${MOYSKLAD_TOKEN}`,
        Accept: "application/json;charset=utf-8",
      },
    });

    console.log(
      `[MOYSKLAD] Page ${page}: response received (${Date.now() - requestStart} ms)`,
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`[MOYSKLAD] Error ${res.status}:`, text);
      throw new Error(`MoySklad error: ${res.status} ${text}`);
    }

    const parseStart = Date.now();
    const data = await res.json();
    console.log(
      `[MOYSKLAD] Page ${page}: JSON parsed (${Date.now() - parseStart} ms)`,
    );

    const metaSize = data?.meta?.size;
    if (typeof metaSize === "number" && totalSize === null) {
      totalSize = metaSize;
      console.log(`[MOYSKLAD] Total products reported: ${totalSize}`);
    }

    const rows = Array.isArray(data?.rows) ? data.rows : [];
    console.log(`[MOYSKLAD] Page ${page}: received ${rows.length} products`);

    const payload = rows.map((p) => ({
      moysklad_id: p.id,
      category_id: extractUuid(p?.productFolder?.meta?.href),
      name: p.name,
      description: p.description ?? null,
      price: getSalePrice(
        PRICE_TYPE_ID["Цены для Онлайн заказов"],
        p?.salePrices,
      ),
      image: p.images?.rows ?? [],
    }));

    await upsertBatch(payload, page);

    totalFetched += rows.length;
    offset += LIMIT;

    console.log(
      `[PROGRESS] Fetched ${totalFetched}/${totalSize ?? "?"} products`,
    );

    if (rows.length < LIMIT) {
      console.log("[DONE] Last page detected (rows < limit)");
      break;
    }

    if (totalSize !== null && offset >= totalSize) {
      console.log("[DONE] Offset >= total size");
      break;
    }

    page++;
  }

  console.log("\n[SUCCESS] Product sync complete");
  console.log(
    JSON.stringify(
      {
        ok: true,
        synced: totalFetched,
        total: totalSize ?? totalFetched,
        limit: LIMIT,
      },
      null,
      2,
    ),
  );
}

async function syncStocks() {
  console.log("\n[INIT] Starting stock sync");

  const requestStart = Date.now();
  const res = await fetch(STOCK_URL, {
    headers: {
      Authorization: `Bearer ${MOYSKLAD_TOKEN}`,
      Accept: "application/json;charset=utf-8",
    },
  });

  console.log(
    `[MOYSKLAD] Stock response received (${Date.now() - requestStart} ms)`,
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`[MOYSKLAD] Stock error ${res.status}:`, text);
    throw new Error(`MoySklad stock error: ${res.status} ${text}`);
  }

  const parseStart = Date.now();
  const data = await res.json();
  console.log(`[MOYSKLAD] Stock JSON parsed (${Date.now() - parseStart} ms)`);

  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data?.rows)
      ? data.rows
      : [];

  console.log(`[MOYSKLAD] Received ${rows.length} stock rows`);

  if (!rows.length) {
    console.log("[DONE] No stock rows to update");
    return;
  }

  const updates = rows.map((row) => ({
    moysklad_id: row?.assortmentId,
    stock: row?.stock,
  }));

  const updateStart = Date.now();
  const { error } = await supabase.rpc("update_products_stock", {
    payload: updates,
  });

  if (error) {
    console.error("[DB] Stock update failed:", error);
    throw new Error(`DB stock update error: ${error.message}`);
  }

  console.log(`[SUCCESS] Stock sync complete (${Date.now() - updateStart} ms)`);
}

let productError = null;

try {
  await syncProducts();
} catch (error) {
  productError = error instanceof Error ? error : new Error(String(error));
  console.error("[PRODUCT] Sync failed:", productError);
}

try {
  await syncStocks();
} catch (error) {
  const stockError = error instanceof Error ? error : new Error(String(error));
  console.error("[STOCK] Sync failed:", stockError);
  throw stockError;
}

if (productError) {
  throw productError;
}
