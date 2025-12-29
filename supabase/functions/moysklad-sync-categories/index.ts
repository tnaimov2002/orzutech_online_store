import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LIMIT = 1000;
const BASE_URL = "https://api.moysklad.ru/api/remap/1.2/entity/productfolder";

function extractUuid(href) {
  if (typeof href !== "string") return null;
  const match = href.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  return match ? match[0] : null;
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
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    let offset = 0;
    let totalSize = null;
    let totalFetched = 0;
    let page = 1;
    const allRows = [];

    while (true) {
      const url = `${BASE_URL}?limit=${LIMIT}&offset=${offset}`;
      const requestStart = Date.now();

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${moyskladToken}`,
          Accept: "application/json;charset=utf-8",
        },
      });

      console.log(
        `[MOYSKLAD] Page ${page}: response received (${Date.now() - requestStart} ms)`,
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`[MOYSKLAD] Error ${res.status}:`, text);
        return new Response(
          JSON.stringify({
            error: `MoySklad error: ${res.status} ${text}`,
          }),
          { status: 502, headers: { "Content-Type": "application/json" } },
        );
      }

      const parseStart = Date.now();
      const data = await res.json();
      console.log(
        `[MOYSKLAD] Page ${page}: JSON parsed (${Date.now() - parseStart} ms)`,
      );

      const metaSize = data?.meta?.size;
      if (typeof metaSize === "number" && totalSize === null) {
        totalSize = metaSize;
      }

      const rows = Array.isArray(data?.rows) ? data.rows : [];
      totalFetched += rows.length;
      allRows.push(...rows);

      if (rows.length < LIMIT) {
        break;
      }

      if (totalSize !== null && totalFetched >= totalSize) {
        break;
      }

      offset += LIMIT;
      page += 1;
    }

    const payloadBase = allRows.map((row) => ({
      moysklad_id: row?.id,
      pathName: row?.pathName ?? null,
      code: row?.code ?? null,
      description: row?.description ?? null,
      name: row?.name,
      moysklad_parent_id: extractUuid(row?.productFolder?.meta?.href),
      updated: row?.updated ?? null,
      archived: row?.archived ?? null,
    }));

    const payloadWithoutParents = payloadBase.map((row) => ({
      ...row,
      moysklad_parent_id: null,
    }));

    if (payloadWithoutParents.length) {
      const { error } = await supabase
        .from("categories")
        .upsert(payloadWithoutParents, { onConflict: "moysklad_id" });

      if (error) {
        console.error("[DB] Upsert failed:", error);
        return new Response(
          JSON.stringify({ error: `DB upsert error: ${error.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const moyskladIds = payloadBase
      .map((row) => row.moysklad_id)
      .filter(Boolean);

    const { data: existingRows, error: existingError } = await supabase
      .from("categories")
      .select("moysklad_id");

    if (existingError) {
      console.error("[DB] Fetch failed:", existingError);
      return new Response(
        JSON.stringify({ error: `DB fetch error: ${existingError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const existingIds = (existingRows ?? [])
      .map((row) => row.moysklad_id)
      .filter(Boolean);
    const remoteIdSet = new Set(moyskladIds);
    const idsToDelete = existingIds.filter((id) => !remoteIdSet.has(id));

    if (idsToDelete.length) {
      const chunkSize = 500;
      for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        const { error: deleteError } = await supabase
          .from("categories")
          .delete()
          .in("moysklad_id", chunk);

        if (deleteError) {
          console.error("[DB] Delete failed:", deleteError);
          return new Response(
            JSON.stringify({ error: `DB delete error: ${deleteError.message}` }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      }
    }

    if (payloadBase.length) {
      const { error } = await supabase
        .from("categories")
        .upsert(payloadBase, { onConflict: "moysklad_id" });

      if (error) {
        console.error("[DB] Upsert failed:", error);
        return new Response(
          JSON.stringify({ error: `DB upsert error: ${error.message}` }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(
      JSON.stringify({ ok: true, synced: payloadBase.length }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[ERROR] Sync failed:", error);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
