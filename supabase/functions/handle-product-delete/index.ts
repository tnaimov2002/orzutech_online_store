import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractUuid(href: string | undefined | null): string | null {
  if (typeof href !== "string") return null;
  const match = href.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  return match ? match[0] : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const moyskladToken = Deno.env.get("MOYSKLAD_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const missing: string[] = [];

    if (!moyskladToken) missing.push("MOYSKLAD_TOKEN");
    if (!supabaseUrl) missing.push("SUPABASE_URL");
    if (!supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    if (missing.length) {
      return new Response(
        JSON.stringify({ error: `Missing env vars: ${missing.join(", ")}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        },
      );
    }

    let payload;
    try {
      payload = await req.json();
    } catch {
      console.error("[WEBHOOK] Invalid JSON");
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        },
      );
    }

    const events = Array.isArray(payload?.events) ? payload.events : [];
    const productDeleteIds = events
      .filter((event: any) => event?.action === "DELETE" && event?.meta?.type === "product")
      .map((event: any) => extractUuid(event?.meta?.href))
      .filter(Boolean);

    const categoryDeleteIds = events
      .filter((event: any) => event?.action === "DELETE" && event?.meta?.type === "productfolder")
      .map((event: any) => extractUuid(event?.meta?.href))
      .filter(Boolean);

    if (productDeleteIds.length === 0 && categoryDeleteIds.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, deleted_products: 0, deleted_categories: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { persistSession: false },
    });

    let deletedProducts = 0;
    let deletedCategories = 0;

    if (productDeleteIds.length > 0) {
      const uniqueProductIds = Array.from(new Set(productDeleteIds));

      const { data: productsToDelete } = await supabase
        .from("products")
        .select("id")
        .in("moysklad_id", uniqueProductIds);

      if (productsToDelete?.length) {
        const productIds = productsToDelete.map((p: any) => p.id);

        await supabase.from("product_images").delete().in("product_id", productIds);

        const { error } = await supabase
          .from("products")
          .delete()
          .in("moysklad_id", uniqueProductIds);

        if (error) {
          console.error("[DB] Product delete failed:", error);
        } else {
          deletedProducts = uniqueProductIds.length;
          console.log(`[DB] Deleted ${deletedProducts} products`);
        }
      }
    }

    if (categoryDeleteIds.length > 0) {
      const uniqueCategoryIds = Array.from(new Set(categoryDeleteIds));

      const { error } = await supabase
        .from("categories")
        .delete()
        .in("moysklad_id", uniqueCategoryIds);

      if (error) {
        console.error("[DB] Category delete failed:", error);
      } else {
        deletedCategories = uniqueCategoryIds.length;
        console.log(`[DB] Deleted ${deletedCategories} categories`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        deleted_products: deletedProducts,
        deleted_categories: deletedCategories
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ERROR] Delete handler failed:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      },
    );
  }
});