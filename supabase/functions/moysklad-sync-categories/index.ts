import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LIMIT = 1000;
const BASE_URL = "https://api.moysklad.ru/api/remap/1.2/entity/productfolder";

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

    const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { persistSession: false },
    });

    let offset = 0;
    let totalSize: number | null = null;
    let totalFetched = 0;
    let page = 1;
    const allRows: any[] = [];

    while (true) {
      const url = `${BASE_URL}?limit=${LIMIT}&offset=${offset}`;
      const requestStart = Date.now();

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${moyskladToken}`,
          Accept: "application/json;charset=utf-8",
        },
      });

      console.log(`[MOYSKLAD] Page ${page}: response received (${Date.now() - requestStart} ms)`);

      if (!res.ok) {
        const text = await res.text();
        console.error(`[MOYSKLAD] Error ${res.status}:`, text);
        return new Response(
          JSON.stringify({ error: `MoySklad error: ${res.status} ${text}` }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          },
        );
      }

      const data = await res.json();
      const metaSize = data?.meta?.size;
      if (typeof metaSize === "number" && totalSize === null) {
        totalSize = metaSize;
      }

      const rows = Array.isArray(data?.rows) ? data.rows : [];
      totalFetched += rows.length;
      allRows.push(...rows);

      if (rows.length < LIMIT) break;
      if (totalSize !== null && totalFetched >= totalSize) break;

      offset += LIMIT;
      page += 1;
    }

    console.log(`[MOYSKLAD] Total categories fetched: ${allRows.length}`);

    const payloadBase = allRows.map((row: any) => ({
      moysklad_id: row?.id,
      moysklad_parent_id: extractUuid(row?.productFolder?.meta?.href),
      name_uz: row?.name || "",
      name_ru: row?.name || "",
      name_en: row?.name || "",
      description: row?.description ?? null,
      status: row?.archived ? "hidden" : "active",
      updated_at: new Date().toISOString(),
    }));

    if (payloadBase.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payloadWithoutParents = payloadBase.map((row) => ({
      ...row,
      moysklad_parent_id: null,
    }));

    const { error: firstUpsertError } = await supabase
      .from("categories")
      .upsert(payloadWithoutParents, { onConflict: "moysklad_id" });

    if (firstUpsertError) {
      console.error("[DB] First upsert failed:", firstUpsertError);
      return new Response(
        JSON.stringify({ error: `DB upsert error: ${firstUpsertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        },
      );
    }

    const { error: secondUpsertError } = await supabase
      .from("categories")
      .upsert(payloadBase, { onConflict: "moysklad_id" });

    if (secondUpsertError) {
      console.error("[DB] Second upsert failed:", secondUpsertError);
      return new Response(
        JSON.stringify({ error: `DB upsert error: ${secondUpsertError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        },
      );
    }

    const { error: resolveError } = await supabase.rpc("resolve_category_parents");
    if (resolveError) {
      console.error("[DB] Parent resolution failed:", resolveError);
    }

    const moyskladIds = payloadBase.map((row) => row.moysklad_id).filter(Boolean);
    const { data: existingRows, error: existingError } = await supabase
      .from("categories")
      .select("moysklad_id")
      .not("moysklad_id", "is", null);

    if (existingError) {
      console.error("[DB] Fetch failed:", existingError);
      return new Response(
        JSON.stringify({ error: `DB fetch error: ${existingError.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        },
      );
    }

    const existingIds = (existingRows ?? []).map((row: any) => row.moysklad_id).filter(Boolean);
    const remoteIdSet = new Set(moyskladIds);
    const idsToDelete = existingIds.filter((id: string) => !remoteIdSet.has(id));

    if (idsToDelete.length > 0) {
      const chunkSize = 500;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error: deleteError } = await supabase
          .from("categories")
          .delete()
          .in("moysklad_id", chunk);

        if (deleteError) {
          console.error("[DB] Delete failed:", deleteError);
        }
      }
      console.log(`[DB] Deleted ${idsToDelete.length} categories no longer in MoySklad`);
    }

    await supabase
      .from("sync_status")
      .upsert({
        entity: "categories",
        last_sync_at: new Date().toISOString(),
        status: "success",
        message: `Synced ${payloadBase.length} categories, deleted ${idsToDelete.length}`,
        records_synced: payloadBase.length,
        updated_at: new Date().toISOString(),
      }, { onConflict: "entity" });

    return new Response(
      JSON.stringify({
        ok: true,
        synced: payloadBase.length,
        deleted: idsToDelete.length
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
          entity: "categories",
          last_sync_at: new Date().toISOString(),
          status: "error",
          message: String(error),
          updated_at: new Date().toISOString(),
        }, { onConflict: "entity" });
    }

    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      },
    );
  }
});