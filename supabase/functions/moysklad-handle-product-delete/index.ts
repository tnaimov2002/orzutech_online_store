import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function extractUuid(href) {
  if (typeof href !== "string") return null;
  const match = href.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  return match ? match[0] : null;
}

serve(async (req) => {
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

  let payload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error("[WEBHOOK] Invalid JSON:", error);
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const events = Array.isArray(payload?.events) ? payload.events : [];
  const ids = events
    .filter(
      (event) => event?.action === "DELETE" && event?.meta?.type === "product",
    )
    .map((event) => extractUuid(event?.meta?.href))
    .filter(Boolean);

  if (!ids.length) {
    return new Response(JSON.stringify({ ok: true, deleted: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase
    .from("products")
    .delete()
    .in("moysklad_id", Array.from(new Set(ids)));

  if (error) {
    console.error("[DB] Delete failed:", error);
    return new Response(
      JSON.stringify({ error: `DB delete error: ${error.message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify({ ok: true, deleted: ids.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
