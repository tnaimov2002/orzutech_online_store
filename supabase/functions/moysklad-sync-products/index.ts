import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRICE_TYPE_ID = {
  "Цены для Онлайн заказов": "33a432af-9a7a-11ee-0a80-135e00112483",
  "Цена продажи": "5195afd0-a892-11ed-0a80-0d0500173e59",
} as const;

const PRODUCT_URL = "https://api.moysklad.ru/api/remap/1.2/entity/product";
const STOCK_URL = "https://api.moysklad.ru/api/remap/1.2/report/stock/all/current";
const BATCH_SIZE = 100;
const PROGRESS_UPDATE_INTERVAL = 10;

function extractUuid(href: string | undefined | null): string | null {
  if (typeof href !== "string") return null;
  const match = href.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  return match ? match[0] : null;
}

function getSalePrice(priceTypeId: string, salePrices: any[]): number | null {
  if (!priceTypeId || !Array.isArray(salePrices)) return null;
  const found = salePrices.find((sp) => sp?.priceType?.id === priceTypeId);
  const value = found?.value;
  return typeof value === "number" && Number.isFinite(value) ? value / 100 : null;
}

async function updateProgress(
  supabase: ReturnType<typeof createClient>,
  total: number,
  processed: number,
  status: string = "running",
  message: string | null = null
) {
  const percent = total > 0 ? Math.floor((processed / total) * 100) : 0;

  await supabase
    .from("sync_status")
    .upsert({
      entity: "products",
      status,
      total,
      processed,
      percent,
      message,
      updated_at: new Date().toISOString(),
      ...(status === "running" && processed === 0 ? { started_at: new Date().toISOString() } : {}),
      ...(status === "success" || status === "error" ? { finished_at: new Date().toISOString() } : {}),
    }, { onConflict: "entity" });
}

async function fetchProductCount(moyskladToken: string): Promise<number> {
  const url = `${PRODUCT_URL}?limit=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${moyskladToken}`,
      Accept: "application/json;charset=utf-8",
    },
  });

  if (!res.ok) {
    throw new Error(`MoySklad count error: ${res.status}`);
  }

  const data = await res.json();
  return data?.meta?.size || 0;
}

async function fetchProductsBatch(moyskladToken: string, offset: number): Promise<any[]> {
  const url = `${PRODUCT_URL}?order=updated,desc&limit=${BATCH_SIZE}&offset=${offset}&expand=images`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${moyskladToken}`,
      Accept: "application/json;charset=utf-8",
    },
  });

  if (!res.ok) {
    throw new Error(`MoySklad product error: ${res.status}`);
  }

  const data = await res.json();
  return Array.isArray(data?.rows) ? data.rows : [];
}

async function fetchStock(moyskladToken: string): Promise<Map<string, number>> {
  const res = await fetch(STOCK_URL, {
    headers: {
      Authorization: `Bearer ${moyskladToken}`,
      Accept: "application/json;charset=utf-8",
    },
  });

  if (!res.ok) {
    throw new Error(`MoySklad stock error: ${res.status}`);
  }

  const stockData = await res.json();
  const stockRows = Array.isArray(stockData) ? stockData : Array.isArray(stockData?.rows) ? stockData.rows : [];

  return new Map(stockRows.map((row: any) => [row?.assortmentId, row?.stock || 0]));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const moyskladToken = Deno.env.get("MOYSKLAD_TOKEN");

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase env vars" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const url = new URL(req.url);
  const readOnly = url.searchParams.get("read_only") === "true";

  if (readOnly) {
    const productId = url.searchParams.get("product_id");
    const categoryId = url.searchParams.get("category_id");
    const isNew = url.searchParams.get("is_new") === "true";
    const isPopular = url.searchParams.get("is_popular") === "true";
    const isDiscount = url.searchParams.get("is_discount") === "true";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    if (productId) {
      const { data: product } = await supabase
        .from("products")
        .select("*, product_images(*), category:categories(*)")
        .eq("id", productId)
        .maybeSingle();

      return new Response(
        JSON.stringify({ ok: true, product }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let query = supabase
      .from("products")
      .select("*, product_images(*), category:categories(*)")
      .gt("stock", 0)
      .order("created_at", { ascending: false });

    if (categoryId) {
      const { data: allCategories } = await supabase
        .from("categories")
        .select("id, parent_id");

      const getAllDescendants = (parentId: string): string[] => {
        const ids = [parentId];
        const children = (allCategories || []).filter((c: any) => c.parent_id === parentId);
        for (const child of children) {
          ids.push(...getAllDescendants(child.id));
        }
        return ids;
      };

      const categoryIds = getAllDescendants(categoryId);
      query = query.in("category_id", categoryIds);
    }

    if (isNew) query = query.eq("is_new", true);
    if (isPopular) query = query.eq("is_popular", true);
    if (isDiscount) query = query.eq("is_discount", true).not("original_price", "is", null);
    if (limit) query = query.limit(limit);

    const { data: products } = await query;

    return new Response(
      JSON.stringify({ ok: true, products: products || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (!moyskladToken) {
    return new Response(
      JSON.stringify({ error: "Missing MOYSKLAD_TOKEN env var" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    console.log("[SYNC] Starting product sync...");

    const totalProducts = await fetchProductCount(moyskladToken);
    console.log(`[SYNC] Total products in MoySklad: ${totalProducts}`);

    await updateProgress(supabase, totalProducts, 0, "running", "Starting sync...");

    console.log("[SYNC] Fetching stock data...");
    const stockById = await fetchStock(moyskladToken);
    console.log(`[SYNC] Stock data received for ${stockById.size} items`);

    const { data: categoryMap } = await supabase
      .from("categories")
      .select("id, moysklad_id")
      .not("moysklad_id", "is", null);

    const categoryLookup = new Map(
      (categoryMap || []).map((c: any) => [c.moysklad_id, c.id])
    );

    const productsWithStock: any[] = [];
    const productsToRemove: string[] = [];
    let processedCount = 0;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await fetchProductsBatch(moyskladToken, offset);

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      for (const p of batch) {
        const stock = stockById.get(p.id) || 0;
        const moyskladCategoryId = extractUuid(p?.productFolder?.meta?.href);
        const categoryId = moyskladCategoryId ? categoryLookup.get(moyskladCategoryId) : null;

        if (stock > 0) {
          const imageRows = p.images?.rows || [];
          const imageUrls = imageRows
            .filter((img: any) => img?.meta?.downloadHref)
            .map((img: any) => ({
              url: img.meta.downloadHref,
              filename: img.filename || "image.jpg",
            }));

          productsWithStock.push({
            moysklad_id: p.id,
            name_uz: p.name || "",
            name_ru: p.name || "",
            name_en: p.name || "",
            description_uz: p.description || "",
            description_ru: p.description || "",
            description_en: p.description || "",
            price: getSalePrice(PRICE_TYPE_ID["Цены для Онлайн заказов"], p?.salePrices) ||
                   getSalePrice(PRICE_TYPE_ID["Цена продажи"], p?.salePrices) || 0,
            category_id: categoryId,
            stock: stock,
            sku: p.code || null,
            brand: p.attributes?.find((a: any) => a.name === "Бренд")?.value?.name || null,
            updated_at: new Date().toISOString(),
            _images: imageUrls,
          });
        } else {
          productsToRemove.push(p.id);
        }

        processedCount++;

        if (processedCount % PROGRESS_UPDATE_INTERVAL === 0) {
          await updateProgress(
            supabase,
            totalProducts,
            processedCount,
            "running",
            `Processing products... ${processedCount}/${totalProducts}`
          );
        }
      }

      offset += BATCH_SIZE;
      hasMore = batch.length === BATCH_SIZE && offset < totalProducts;

      console.log(`[SYNC] Processed ${processedCount}/${totalProducts} products`);
    }

    await updateProgress(
      supabase,
      totalProducts,
      processedCount,
      "running",
      "Saving products to database..."
    );

    console.log(`[SYNC] Products with stock > 0: ${productsWithStock.length}`);
    console.log(`[SYNC] Products to remove (stock = 0): ${productsToRemove.length}`);

    if (productsWithStock.length > 0) {
      const productPayload = productsWithStock.map(({ _images, ...rest }) => rest);

      const { error: upsertError } = await supabase
        .from("products")
        .upsert(productPayload, { onConflict: "moysklad_id" });

      if (upsertError) {
        console.error("[DB] Product upsert failed:", upsertError);
        await updateProgress(supabase, totalProducts, processedCount, "error", `DB upsert error: ${upsertError.message}`);
        return new Response(
          JSON.stringify({ error: `DB upsert error: ${upsertError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: insertedProducts } = await supabase
        .from("products")
        .select("id, moysklad_id")
        .in("moysklad_id", productsWithStock.map(p => p.moysklad_id));

      const productIdMap = new Map(
        (insertedProducts || []).map((p: any) => [p.moysklad_id, p.id])
      );

      for (const product of productsWithStock) {
        const productId = productIdMap.get(product.moysklad_id);
        if (!productId || !product._images?.length) continue;

        const { data: existingImages } = await supabase
          .from("product_images")
          .select("id")
          .eq("product_id", productId);

        if ((existingImages?.length || 0) === 0) {
          const imageRecords = product._images.map((img: any, index: number) => ({
            product_id: productId,
            image_url: img.url,
            is_primary: index === 0,
            sort_order: index,
          }));

          await supabase.from("product_images").insert(imageRecords);
        }
      }
    }

    if (productsToRemove.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < productsToRemove.length; i += chunkSize) {
        const chunk = productsToRemove.slice(i, i + chunkSize);

        const { data: productsToDelete } = await supabase
          .from("products")
          .select("id")
          .in("moysklad_id", chunk);

        if (productsToDelete?.length) {
          const productIds = productsToDelete.map((p: any) => p.id);
          await supabase.from("product_images").delete().in("product_id", productIds);
          await supabase.from("products").delete().in("moysklad_id", chunk);
        }
      }
      console.log(`[DB] Removed ${productsToRemove.length} products with zero stock`);
    }

    const { data: existingMoyskladProducts } = await supabase
      .from("products")
      .select("moysklad_id")
      .not("moysklad_id", "is", null);

    const allMoyskladIds = new Set(productsWithStock.map(p => p.moysklad_id).concat(productsToRemove));
    const orphanedProducts = (existingMoyskladProducts || [])
      .filter((p: any) => !allMoyskladIds.has(p.moysklad_id))
      .map((p: any) => p.moysklad_id);

    if (orphanedProducts.length > 0) {
      const { data: productsToDelete } = await supabase
        .from("products")
        .select("id")
        .in("moysklad_id", orphanedProducts);

      if (productsToDelete?.length) {
        const productIds = productsToDelete.map((p: any) => p.id);
        await supabase.from("product_images").delete().in("product_id", productIds);
        await supabase.from("products").delete().in("moysklad_id", orphanedProducts);
      }
      console.log(`[DB] Removed ${orphanedProducts.length} orphaned products`);
    }

    const syncMessage = `Synced ${productsWithStock.length} products, removed ${productsToRemove.length} (zero stock), ${orphanedProducts.length} (orphaned)`;

    await supabase
      .from("sync_status")
      .upsert({
        entity: "products",
        status: "success",
        total: totalProducts,
        processed: totalProducts,
        percent: 100,
        message: syncMessage,
        records_synced: productsWithStock.length,
        last_sync_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "entity" });

    console.log("[SYNC] Product sync completed successfully");

    return new Response(
      JSON.stringify({
        ok: true,
        synced: productsWithStock.length,
        removed_zero_stock: productsToRemove.length,
        removed_orphaned: orphanedProducts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ERROR] Sync failed:", error);

    await supabase
      .from("sync_status")
      .upsert({
        entity: "products",
        status: "error",
        message: String(error),
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "entity" });

    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});