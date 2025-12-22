import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItem {
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_info: string | null;
}

interface OrderEmailRequest {
  to: string;
  customerName: string;
  orderNumber: string;
  orderItems: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress: string | null;
  storeName: string | null;
  language: 'uz' | 'ru' | 'en';
}

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('uz-UZ').format(price);
};

const getTranslations = (lang: 'uz' | 'ru' | 'en') => {
  const translations = {
    uz: {
      subject: 'Buyurtma hisob-fakturasi - ORZUTECH',
      greeting: 'Hurmatli',
      thankYou: 'Buyurtmangiz uchun rahmat!',
      orderReceived: 'Buyurtmangiz muvaffaqiyatli qabul qilindi.',
      orderNumber: 'Buyurtma raqami',
      orderDetails: 'Buyurtma tafsilotlari',
      product: 'Mahsulot',
      quantity: 'Miqdor',
      price: 'Narx',
      subtotal: 'Oraliq jami',
      delivery: 'Yetkazib berish',
      free: 'Bepul',
      total: 'Jami summa',
      deliveryMethod: 'Yetkazib berish usuli',
      deliveryAddress: 'Yetkazib berish manzili',
      pickupStore: 'Olib ketish do\'koni',
      estimatedDelivery: 'Taxminiy yetkazib berish',
      bukharaDelivery: 'Buxoro shahriga - 24 soat ichida',
      otherRegions: 'Boshqa viloyatlarga - 48-72 soat ichida',
      pickupReady: 'Do\'konda tayyor bo\'ladi - 2-4 soat ichida',
      footer: 'Savollaringiz bo\'lsa, biz bilan bog\'laning',
      phone: 'Telefon',
      currency: 'so\'m',
    },
    ru: {
      subject: 'Счет-фактура заказа - ORZUTECH',
      greeting: 'Уважаемый(ая)',
      thankYou: 'Спасибо за ваш заказ!',
      orderReceived: 'Ваш заказ успешно принят.',
      orderNumber: 'Номер заказа',
      orderDetails: 'Детали заказа',
      product: 'Товар',
      quantity: 'Количество',
      price: 'Цена',
      subtotal: 'Промежуточный итог',
      delivery: 'Доставка',
      free: 'Бесплатно',
      total: 'Итого',
      deliveryMethod: 'Способ доставки',
      deliveryAddress: 'Адрес доставки',
      pickupStore: 'Магазин самовывоза',
      estimatedDelivery: 'Ориентировочная доставка',
      bukharaDelivery: 'По Бухаре - в течение 24 часов',
      otherRegions: 'По другим областям - 48-72 часа',
      pickupReady: 'Готовность в магазине - 2-4 часа',
      footer: 'Если у вас есть вопросы, свяжитесь с нами',
      phone: 'Телефон',
      currency: 'сум',
    },
    en: {
      subject: 'Order Invoice - ORZUTECH',
      greeting: 'Dear',
      thankYou: 'Thank you for your order!',
      orderReceived: 'Your order has been successfully received.',
      orderNumber: 'Order Number',
      orderDetails: 'Order Details',
      product: 'Product',
      quantity: 'Quantity',
      price: 'Price',
      subtotal: 'Subtotal',
      delivery: 'Delivery',
      free: 'Free',
      total: 'Total',
      deliveryMethod: 'Delivery Method',
      deliveryAddress: 'Delivery Address',
      pickupStore: 'Pickup Store',
      estimatedDelivery: 'Estimated Delivery',
      bukharaDelivery: 'Bukhara city - within 24 hours',
      otherRegions: 'Other regions - 48-72 hours',
      pickupReady: 'Ready at store - 2-4 hours',
      footer: 'If you have any questions, please contact us',
      phone: 'Phone',
      currency: 'UZS',
    },
  };
  return translations[lang];
};

const generateEmailHtml = (data: OrderEmailRequest): string => {
  const t = getTranslations(data.language);
  
  const itemsHtml = data.orderItems.map(item => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.product_image ? `<img src="${item.product_image}" alt="${item.product_name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />` : ''}
          <div>
            <p style="margin: 0; font-weight: 600; color: #111827;">${item.product_name}</p>
            ${item.variant_info ? `<p style="margin: 4px 0 0; font-size: 14px; color: #6b7280;">${item.variant_info}</p>` : ''}
          </div>
        </div>
      </td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">x${item.quantity}</td>
      <td style="padding: 16px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">${formatPrice(item.total_price)} ${t.currency}</td>
    </tr>
  `).join('');

  const estimatedDelivery = data.deliveryType === 'delivery'
    ? (data.deliveryAddress?.toLowerCase().includes('buxoro') || data.deliveryAddress?.toLowerCase().includes('bukhara')
      ? t.bukharaDelivery
      : t.otherRegions)
    : t.pickupReady;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">ORZUTECH</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Electronics Store</p>
    </div>
    
    <div style="background: white; padding: 32px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2 style="margin: 0 0 8px; color: #111827; font-size: 24px;">${t.thankYou}</h2>
        <p style="margin: 0; color: #6b7280;">${t.orderReceived}</p>
      </div>
      
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #9a3412;">
          <strong>${t.orderNumber}:</strong>
          <span style="font-size: 18px; font-weight: bold; color: #ea580c; margin-left: 8px;">${data.orderNumber}</span>
        </p>
      </div>
      
      <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; border-bottom: 2px solid #f3f4f6; padding-bottom: 12px;">${t.orderDetails}</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 12px 16px; text-align: left; font-size: 14px; color: #6b7280; font-weight: 600;">${t.product}</th>
            <th style="padding: 12px 16px; text-align: center; font-size: 14px; color: #6b7280; font-weight: 600;">${t.quantity}</th>
            <th style="padding: 12px 16px; text-align: right; font-size: 14px; color: #6b7280; font-weight: 600;">${t.price}</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: #6b7280;">${t.subtotal}</span>
          <span style="font-weight: 600; color: #111827;">${formatPrice(data.subtotal)} ${t.currency}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <span style="color: #6b7280;">${t.delivery}</span>
          <span style="font-weight: 600; color: #22c55e;">${t.free}</span>
        </div>
        <div style="border-top: 2px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between;">
          <span style="font-size: 18px; font-weight: bold; color: #111827;">${t.total}</span>
          <span style="font-size: 20px; font-weight: bold; color: #ea580c;">${formatPrice(data.total)} ${t.currency}</span>
        </div>
      </div>
      
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h4 style="margin: 0 0 12px; color: #166534; font-size: 16px;">${t.deliveryMethod}</h4>
        ${data.deliveryType === 'delivery' && data.deliveryAddress ? `
          <p style="margin: 0 0 8px; color: #15803d;"><strong>${t.deliveryAddress}:</strong></p>
          <p style="margin: 0 0 12px; color: #166534;">${data.deliveryAddress}</p>
        ` : ''}
        ${data.deliveryType === 'pickup' && data.storeName ? `
          <p style="margin: 0 0 8px; color: #15803d;"><strong>${t.pickupStore}:</strong></p>
          <p style="margin: 0 0 12px; color: #166534;">${data.storeName}</p>
        ` : ''}
        <p style="margin: 0; color: #15803d;"><strong>${t.estimatedDelivery}:</strong> ${estimatedDelivery}</p>
      </div>
      
      <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${t.footer}</p>
        <p style="margin: 0; color: #111827; font-weight: 600;">${t.phone}: +998 65 221 00 00</p>
        <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">ORZUTECH - Electronics Store</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const data: OrderEmailRequest = await req.json();

    if (!data.to || !data.orderNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service not configured',
          requiresSetup: true 
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const t = getTranslations(data.language);
    const htmlContent = generateEmailHtml(data);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ORZUTECH <orders@orzutech.uz>',
        to: [data.to],
        subject: t.subject,
        html: htmlContent,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Email sending failed:', emailResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: emailResult.message || 'Failed to send email',
          details: emailResult 
        }),
        {
          status: emailResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResult.id,
        message: 'Email sent successfully' 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-order-email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
