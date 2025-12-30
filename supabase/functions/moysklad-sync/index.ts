import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
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

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const url = new URL(req.url);
    const productId = url.searchParams.get("product_id");
    const categoryId = url.searchParams.get("category_id");
    const isNew = url.searchParams.get("is_new") === "true";
    const isPopular = url.searchParams.get("is_popular") === "true";
    const isDiscount = url.searchParams.get("is_discount") === "true";
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : null;

    if (productId) {
      const { data: product, error } = await supabase
        .from("products")
        .select("*, product_images(*), category:categories(*)")
        .eq("id", productId)
        .maybeSingle();

      if (error) {
        return new Response(
          JSON.stringify({ ok: false, error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

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
        const children = (allCategories || []).filter((c: { id: string; parent_id: string | null }) => c.parent_id === parentId);
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

    const { data: products, error } = await query;

    if (error) {
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: syncStatus } = await supabase
      .from("sync_status")
      .select("last_sync_at, records_synced")
      .eq("entity", "products")
      .maybeSingle();

    return new Response(
      JSON.stringify({
        ok: true,
        products: products || [],
        last_sync_at: syncStatus?.last_sync_at || null,
        synced: syncStatus?.records_synced || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ERROR] Read failed:", error);

    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      },
    );
  }
});