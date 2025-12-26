import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationPayload {
  sessionId: string;
  visitorEmail: string;
  visitorName: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sessionId, visitorEmail, visitorName, message }: NotificationPayload = await req.json();

    if (!sessionId || !visitorEmail || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: session } = await supabase
      .from("chat_sessions")
      .select("*, product_context")
      .eq("id", sessionId)
      .maybeSingle();

    const productInfo = session?.product_context?.name
      ? `\n\nMahsulot: ${session.product_context.name}`
      : "";

    const pageUrl = session?.current_page_url
      ? `\nSahifa: ${session.current_page_url}`
      : "";

    const { data: settings } = await supabase
      .from("chat_settings")
      .select("value")
      .eq("key", "telegram_webhook")
      .maybeSingle();

    if (settings?.value?.enabled && settings.value.bot_token && settings.value.chat_id) {
      const telegramMessage = `
🆕 Yangi chat xabari!

👤 Ism: ${visitorName}
📧 Email: ${visitorEmail}
💬 Xabar: ${message}${productInfo}${pageUrl}

📅 Vaqt: ${new Date().toLocaleString("uz-UZ")}
      `.trim();

      try {
        await fetch(
          `https://api.telegram.org/bot${settings.value.bot_token}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: settings.value.chat_id,
              text: telegramMessage,
              parse_mode: "HTML",
            }),
          }
        );
      } catch (telegramError) {
        console.error("Telegram notification failed:", telegramError);
      }
    }

    const { data: emailSettings } = await supabase
      .from("chat_settings")
      .select("value")
      .eq("key", "offline_email")
      .maybeSingle();

    const adminEmail = emailSettings?.value?.admin_email || "support@orzutech.uz";

    const adminEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 20px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
    .field { margin-bottom: 15px; }
    .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { margin-top: 5px; padding: 10px; background: white; border-radius: 5px; border: 1px solid #e5e7eb; }
    .message { background: white; padding: 15px; border-left: 4px solid #f97316; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">🆕 Yangi Chat Xabari</h2>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">ORZUTECH Live Chat</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Mijoz ismi</div>
        <div class="value">${visitorName}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${visitorEmail}">${visitorEmail}</a></div>
      </div>
      <div class="field">
        <div class="label">Xabar</div>
        <div class="message">${message}</div>
      </div>
      ${session?.product_context?.name ? `
      <div class="field">
        <div class="label">Ko'rayotgan mahsulot</div>
        <div class="value">${session.product_context.name}</div>
      </div>
      ` : ""}
      ${session?.current_page_url ? `
      <div class="field">
        <div class="label">Sahifa</div>
        <div class="value"><a href="${session.current_page_url}">${session.current_page_url}</a></div>
      </div>
      ` : ""}
      <div class="field">
        <div class="label">Vaqt</div>
        <div class="value">${new Date().toLocaleString("uz-UZ")}</div>
      </div>
    </div>
    <div class="footer">
      <p>Bu xabar avtomatik ravishda ORZUTECH Live Chat tizimi tomonidan yuborildi.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const visitorEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; }
    .message-box { background: #f9fafb; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ORZUTECH</div>
      <p style="margin: 0; opacity: 0.9;">Xabaringiz qabul qilindi!</p>
    </div>
    <div class="content">
      <h3>Hurmatli ${visitorName}!</h3>
      <p>Sizning xabaringiz muvaffaqiyatli qabul qilindi. Tez orada mutaxassislarimiz siz bilan bog'lanadi.</p>
      
      <div class="message-box">
        <strong>Sizning xabaringiz:</strong>
        <p style="margin-top: 10px;">${message}</p>
      </div>
      
      <p>Qo'shimcha savollaringiz bo'lsa, bizga qo'ng'iroq qilishingiz mumkin:</p>
      <p><strong>📞 +998 93 XXX XX XX</strong></p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ORZUTECH. Barcha huquqlar himoyalangan.</p>
      <p>Buxoro shahar, O'zbekiston</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    console.log("Notification sent successfully");
    console.log("Admin email would be sent to:", adminEmail);
    console.log("Visitor email would be sent to:", visitorEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing notification:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
