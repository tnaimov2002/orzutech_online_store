interface OrderItem {
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  variant_info: string | null;
}

interface SendOrderEmailParams {
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

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  requiresSetup?: boolean;
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sendOrderConfirmationEmail = async (
  params: SendOrderEmailParams
): Promise<EmailResult> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration missing');
    return { success: false, error: 'Configuration error' };
  }

  const functionUrl = `${supabaseUrl}/functions/v1/send-order-email`;

  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Email sending failed:', result);
      return {
        success: false,
        error: result.error || 'Failed to send email',
        requiresSetup: result.requiresSetup,
      };
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error('Error sending order email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
};
