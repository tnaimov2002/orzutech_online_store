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
const LIMIT = 100;

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

async function fetchAllProducts(moyskladToken: string): Promise<any[]> {
  const allProducts: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${PRODUCT_URL}?order=updated,desc&limit=${LIMIT}&offset=${offset}&expand=images`;
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
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    allProducts.push(...rows);

    const totalSize = data?.meta?.size || 0;
    offset += LIMIT;
    hasMore = offset < totalSize && rows.length === LIMIT;

    console.log(`[MOYSKLAD] Fetched ${allProducts.length}/${totalSize} products`);
  }

  return allProducts;
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

  try {
    const url = new URL(req.url);
    const readOnly = url.searchParams.get("read_only") === "true";
    const productId = url.searchParams.get("product_id");
    const categoryId = url.searchParams.get("category_id");
    const isNew = url.searchParams.get("is_new") === "true";
    const isPopular = url.searchParams.get("is_popular") === "true";
    const isDiscount = url.searchParams.get("is_discount") === "true";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase env vars" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        },
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { persistSession: false },
    });

    if (readOnly) {
      let query = supabase
        .from("products")
        .select("*, product_images(*), category:categories(*)")
        .gt("stock", 0)
        .order("created_at", { ascending: false });

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

    const moyskladToken = Deno.env.get("MOYSKLAD_TOKEN");
    const missing: string[] = [];

    if (!moyskladToken) missing.push("MOYSKLAD_TOKEN");

    if (missing.length) {
      return new Response(
        JSON.stringify({ error: `Missing env vars: ${missing.join(", ")}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        },
      );
    }

    await supabase
      .from("sync_status")
      .upsert({
        entity: "products",
        status: "in_progress",
        message: "Sync started",
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "entity" });

    console.log("[MOYSKLAD] Fetching stock data...");
    const stockById = await fetchStock(moyskladToken!);
    console.log(`[MOYSKLAD] Stock data received for ${stockById.size} items`);

    console.log("[MOYSKLAD] Fetching products...");
    const allProducts = await fetchAllProducts(moyskladToken!);
    console.log(`[MOYSKLAD] Total products fetched: ${allProducts.length}`);

    const { data: categoryMap } = await supabase
      .from("categories")
      .select("id, moysklad_id")
      .not("moysklad_id", "is", null);

    const categoryLookup = new Map(
      (categoryMap || []).map((c: any) => [c.moysklad_id, c.id])
    );

    const productsWithStock: any[] = [];
    const productsToRemove: string[] = [];

    for (const p of allProducts) {
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
    }

    console.log(`[SYNC] Products with stock > 0: ${productsWithStock.length}`);
    console.log(`[SYNC] Products to remove (stock = 0): ${productsToRemove.length}`);

    if (productsWithStock.length > 0) {
      const productPayload = productsWithStock.map(({ _images, ...rest }) => rest);

      const { error: upsertError } = await supabase
        .from("products")
        .upsert(productPayload, { onConflict: "moysklad_id" });

      if (upsertError) {
        console.error("[DB] Product upsert failed:", upsertError);
        return new Response(
          JSON.stringify({ error: `DB upsert error: ${upsertError.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          },
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

    const allMoyskladIds = new Set(allProducts.map(p => p.id));
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

    const { data: finalProducts } = await supabase
      .from("products")
      .select("*, product_images(*), category:categories(*)")
      .gt("stock", 0)
      .order("created_at", { ascending: false });

    const syncMessage = `Synced ${productsWithStock.length} products, removed ${productsToRemove.length} (zero stock), ${orphanedProducts.length} (orphaned)`;
    await supabase
      .from("sync_status")
      .upsert({
        entity: "products",
        status: "success",
        message: syncMessage,
        records_synced: productsWithStock.length,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "entity" });

    return new Response(
      JSON.stringify({
        ok: true,
        synced: productsWithStock.length,
        removed_zero_stock: productsToRemove.length,
        removed_orphaned: orphanedProducts.length,
        products: finalProducts || [],
        last_sync_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ERROR] Sync failed:", error);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseServiceRoleKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false },
      });
      await supabase
        .from("sync_status")
        .upsert({
          entity: "products",
          status: "error",
          message: String(error),
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "entity" });
    }

    return new Response(
      JSON.stringify({ error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      },
    );
  }
});