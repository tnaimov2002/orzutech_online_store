import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  sessionId: string;
  message: string;
  productContext?: {
    id: string;
    name: string;
    price?: number;
    category?: string;
  };
}

interface DetectedLanguage {
  language: 'uz' | 'ru' | 'en';
  script: 'latin' | 'cyrillic' | null;
}

const cyrillicUzbekChars = /[\u045e\u049b\u0493\u04b3]/i;
const cyrillicPattern = /[\u0430-\u044f\u0410-\u042f\u0451\u0401]/;

function detectLanguageAndScript(text: string): DetectedLanguage {
  const cleanText = text.replace(/[\d\s\p{P}]/gu, '');
  
  if (cyrillicUzbekChars.test(cleanText)) {
    return { language: 'uz', script: 'cyrillic' };
  }
  
  const cyrillicCount = (cleanText.match(/[\u0430-\u044f\u0410-\u042f\u0451\u0401]/g) || []).length;
  const latinCount = (cleanText.match(/[a-zA-Z]/g) || []).length;
  
  if (cyrillicCount > latinCount) {
    const russianWords = ['\u043f\u0440\u0438\u0432\u0435\u0442', '\u0441\u043f\u0430\u0441\u0438\u0431\u043e', '\u043d\u0443\u0436\u043d\u043e', '\u0435\u0441\u0442\u044c', '\u0441\u043a\u043e\u043b\u044c\u043a\u043e', '\u0442\u043e\u0432\u0430\u0440', '\u0446\u0435\u043d\u0430', '\u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430', '\u0437\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435'];
    const textLower = text.toLowerCase();
    const hasRussian = russianWords.some(w => textLower.includes(w));
    
    if (hasRussian) {
      return { language: 'ru', script: 'cyrillic' };
    }
    return { language: 'uz', script: 'cyrillic' };
  }
  
  if (latinCount > 0) {
    const uzbekLatinWords = ['salom', 'rahmat', 'kerak', 'bormi', 'qancha', 'necha', 'mahsulot', 'narx', 'yetkazish', 'sotib', 'olish', 'kafolat', 'tolov'];
    const englishWords = ['hello', 'thanks', 'need', 'have', 'much', 'product', 'price', 'delivery', 'warranty', 'payment', 'buy', 'how'];
    
    const textLower = text.toLowerCase();
    const hasUzbek = uzbekLatinWords.some(w => textLower.includes(w));
    const hasEnglish = englishWords.some(w => textLower.includes(w));
    
    if (hasUzbek && !hasEnglish) {
      return { language: 'uz', script: 'latin' };
    }
    if (hasEnglish && !hasUzbek) {
      return { language: 'en', script: null };
    }
    return { language: 'uz', script: 'latin' };
  }
  
  return { language: 'uz', script: 'latin' };
}

function getLocalizedContent(item: any, field: string, lang: DetectedLanguage): string {
  const langSuffix = lang.language === 'uz' ? '_uz' : lang.language === 'ru' ? '_ru' : '_en';
  return item[`${field}${langSuffix}`] || item[field] || item[`${field}_uz`] || '';
}

function getProductName(product: any, lang: DetectedLanguage): string {
  if (lang.language === 'ru') return product.name_ru || product.name_uz;
  if (lang.language === 'en') return product.name_en || product.name_uz;
  return product.name_uz;
}

async function findMatchingFAQ(
  supabase: any,
  message: string,
  lang: DetectedLanguage
): Promise<string | null> {
  const { data: faqs, error } = await supabase
    .from('ai_faq')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error || !faqs || faqs.length === 0) return null;

  const messageLower = message.toLowerCase();
  
  for (const faq of faqs) {
    const patterns = faq.question_patterns || [];
    const matchFound = patterns.some((pattern: string) => 
      messageLower.includes(pattern.toLowerCase())
    );
    
    if (matchFound) {
      return getLocalizedContent(faq, 'answer', lang);
    }
  }
  
  return null;
}

async function searchProducts(
  supabase: any,
  query: string,
  lang: DetectedLanguage,
  limit: number = 3
): Promise<any[]> {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  if (searchTerms.length === 0) {
    const { data } = await supabase
      .from('products')
      .select('id, name_uz, name_ru, name_en, price, original_price, stock_quantity, categories(name_uz, name_ru)')
      .gt('stock_quantity', 0)
      .order('is_popular', { ascending: false })
      .limit(limit);
    return data || [];
  }

  const searchTerm = searchTerms[0];
  const { data, error } = await supabase
    .from('products')
    .select('id, name_uz, name_ru, name_en, price, original_price, stock_quantity, categories(name_uz, name_ru)')
    .gt('stock_quantity', 0)
    .or(`name_uz.ilike.%${searchTerm}%,name_ru.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%`)
    .limit(limit);

  if (error) {
    console.error('Product search error:', error);
    return [];
  }
  return data || [];
}

async function getPolicyInfo(
  supabase: any,
  policyType: string,
  lang: DetectedLanguage
): Promise<string | null> {
  const { data: policy } = await supabase
    .from('ai_policies')
    .select('*')
    .eq('policy_type', policyType)
    .eq('is_active', true)
    .maybeSingle();

  if (!policy) return null;
  return getLocalizedContent(policy, 'content', lang);
}

function generateProductRecommendation(
  products: any[],
  lang: DetectedLanguage
): string {
  if (products.length === 0) {
    const noProductsMsg = {
      uz: { latin: "Kechirasiz, so'rovingizga mos mahsulot topilmadi. Boshqa mahsulotlarni ko'rishni xohlaysizmi?", cyrillic: "\u041a\u0435\u0447\u0438\u0440\u0430\u0441\u0438\u0437, \u0441\u045e\u0440\u043e\u0432\u0438\u043d\u0433\u0438\u0437\u0433\u0430 \u043c\u043e\u0441 \u043c\u0430\u04b3\u0441\u0443\u043b\u043e\u0442 \u0442\u043e\u043f\u0438\u043b\u043c\u0430\u0434\u0438." },
      ru: "\u0418\u0437\u0432\u0438\u043d\u0438\u0442\u0435, \u043f\u043e \u0432\u0430\u0448\u0435\u043c\u0443 \u0437\u0430\u043f\u0440\u043e\u0441\u0443 \u0442\u043e\u0432\u0430\u0440\u044b \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b.",
      en: "Sorry, no products found matching your query."
    };
    if (lang.language === 'uz') {
      return noProductsMsg.uz[lang.script || 'latin'];
    }
    return noProductsMsg[lang.language];
  }

  const headers = {
    uz: { latin: "Sizga quyidagi mahsulotlarni tavsiya qilaman:", cyrillic: "\u0421\u0438\u0437\u0433\u0430 \u049b\u0443\u0439\u0438\u0434\u0430\u0433\u0438 \u043c\u0430\u04b3\u0441\u0443\u043b\u043e\u0442\u043b\u0430\u0440\u043d\u0438 \u0442\u0430\u0432\u0441\u0438\u044f \u049b\u0438\u043b\u0430\u043c\u0430\u043d:" },
    ru: "\u0420\u0435\u043a\u043e\u043c\u0435\u043d\u0434\u0443\u044e \u0432\u0430\u043c \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u0435 \u0442\u043e\u0432\u0430\u0440\u044b:",
    en: "I recommend the following products:"
  };

  let response = lang.language === 'uz' 
    ? headers.uz[lang.script || 'latin']
    : headers[lang.language];
  response += "\n\n";

  products.forEach((product, index) => {
    const hasDiscount = product.original_price && product.original_price > product.price;
    const discountPercent = hasDiscount ? Math.round((1 - product.price / product.original_price) * 100) : 0;
    const productName = getProductName(product, lang);
    const priceFormatted = Number(product.price).toLocaleString('uz-UZ');
    
    response += `${index + 1}. ${productName}\n`;
    response += `   ${priceFormatted} so'm`;
    if (discountPercent > 0) {
      response += lang.language === 'uz' 
        ? (lang.script === 'cyrillic' ? ` (-${discountPercent}% \u0447\u0435\u0433\u0438\u0440\u043c\u0430)` : ` (-${discountPercent}% chegirma)`)
        : lang.language === 'ru' ? ` (-${discountPercent}% \u0441\u043a\u0438\u0434\u043a\u0430)` : ` (-${discountPercent}% off)`;
    }
    response += "\n\n";
  });

  const cta = {
    uz: { latin: "Qaysi biri haqida ko'proq ma'lumot olishni xohlaysiz?", cyrillic: "\u049a\u0430\u0439\u0441\u0438 \u0431\u0438\u0440\u0438 \u04b3\u0430\u049b\u0438\u0434\u0430 \u043a\u045e\u043f\u0440\u043e\u049b \u043c\u0430\u044a\u043b\u0443\u043c\u043e\u0442 \u043e\u043b\u0438\u0448\u043d\u0438 \u0445\u043e\u04b3\u043b\u0430\u0439\u0441\u0438\u0437?" },
    ru: "\u041e \u043a\u0430\u043a\u043e\u043c \u0442\u043e\u0432\u0430\u0440\u0435 \u0445\u043e\u0442\u0438\u0442\u0435 \u0443\u0437\u043d\u0430\u0442\u044c \u043f\u043e\u0434\u0440\u043e\u0431\u043d\u0435\u0435?",
    en: "Which one would you like to know more about?"
  };

  response += lang.language === 'uz' 
    ? cta.uz[lang.script || 'latin']
    : cta[lang.language];

  return response;
}

async function generateAIResponse(
  supabase: any,
  message: string,
  lang: DetectedLanguage,
  productContext?: any
): Promise<{ response: string; sources: string[] }> {
  const sources: string[] = [];
  const messageLower = message.toLowerCase();

  const faqAnswer = await findMatchingFAQ(supabase, message, lang);
  if (faqAnswer) {
    sources.push('faq');
    return { response: faqAnswer, sources };
  }

  const productKeywords = ['noutbuk', 'kompyuter', 'telefon', 'laptop', 'computer', 'phone', 'iphone', 'samsung', 'arzon', '\u0434\u0435\u0448\u0435\u0432\u044b\u0439', '\u043d\u043e\u0443\u0442\u0431\u0443\u043a', '\u043a\u043e\u043c\u043f\u044c\u044e\u0442\u0435\u0440', '\u0442\u0435\u043b\u0435\u0444\u043e\u043d', 'mahsulot', '\u0442\u043e\u0432\u0430\u0440', 'product', 'sotib', '\u043a\u0443\u043f\u0438\u0442\u044c', 'buy', 'kerak', '\u043d\u0443\u0436\u043d\u043e', 'need', 'narx', 'price', '\u0446\u0435\u043d\u0430'];
  const isProductQuery = productKeywords.some(kw => messageLower.includes(kw));

  if (isProductQuery) {
    const products = await searchProducts(supabase, message, lang, 3);
    sources.push('products');
    return { response: generateProductRecommendation(products, lang), sources };
  }

  if (productContext?.id) {
    const { data: product } = await supabase
      .from('products')
      .select('*, categories(name_uz, name_ru)')
      .eq('id', productContext.id)
      .maybeSingle();

    if (product) {
      sources.push('product_context');
      const productName = getProductName(product, lang);
      const priceFormatted = Number(product.price).toLocaleString('uz-UZ');

      const productInfo = {
        uz: {
          latin: `"${productName}" haqida: Narxi ${priceFormatted} so'm. ${product.stock_quantity > 0 ? 'Mavjud.' : 'Hozircha mavjud emas.'} Sotib olishga yordam beraymi?`,
          cyrillic: `"${productName}" \u04b3\u0430\u049b\u0438\u0434\u0430: \u041d\u0430\u0440\u0445\u0438 ${priceFormatted} \u0441\u045e\u043c. ${product.stock_quantity > 0 ? '\u041c\u0430\u0432\u0436\u0443\u0434.' : '\u04b2\u043e\u0437\u0438\u0440\u0447\u0430 \u043c\u0430\u0432\u0436\u0443\u0434 \u044d\u043c\u0430\u0441.'} \u0421\u043e\u0442\u0438\u0431 \u043e\u043b\u0438\u0448\u0433\u0430 \u0451\u0440\u0434\u0430\u043c \u0431\u0435\u0440\u0430\u0439\u043c\u0438?`
        },
        ru: `\u041e \u0442\u043e\u0432\u0430\u0440\u0435 "${productName}": \u0426\u0435\u043d\u0430 ${priceFormatted} \u0441\u0443\u043c. ${product.stock_quantity > 0 ? '\u0412 \u043d\u0430\u043b\u0438\u0447\u0438\u0438.' : '\u041d\u0435\u0442 \u0432 \u043d\u0430\u043b\u0438\u0447\u0438\u0438.'} \u041f\u043e\u043c\u043e\u0447\u044c \u0441 \u043f\u043e\u043a\u0443\u043f\u043a\u043e\u0439?`,
        en: `About "${productName}": Price ${priceFormatted} UZS. ${product.stock_quantity > 0 ? 'In stock.' : 'Out of stock.'} Would you like help purchasing?`
      };

      if (lang.language === 'uz') {
        return { response: productInfo.uz[lang.script || 'latin'], sources };
      }
      return { response: productInfo[lang.language], sources };
    }
  }

  const policyKeywords = {
    warranty: ['kafolat', '\u0433\u0430\u0440\u0430\u043d\u0442\u0438\u044f', 'warranty', 'garantiya'],
    returns: ['qaytarish', '\u0432\u043e\u0437\u0432\u0440\u0430\u0442', 'return', 'almashish', '\u043e\u0431\u043c\u0435\u043d'],
    privacy: ['maxfiylik', '\u043a\u043e\u043d\u0444\u0438\u0434\u0435\u043d\u0446\u0438\u0430\u043b\u044c\u043d\u043e\u0441\u0442\u044c', 'privacy']
  };

  for (const [policyType, keywords] of Object.entries(policyKeywords)) {
    if (keywords.some(kw => messageLower.includes(kw))) {
      const policyContent = await getPolicyInfo(supabase, policyType, lang);
      if (policyContent) {
        sources.push(`policy_${policyType}`);
        return { response: policyContent, sources };
      }
    }
  }

  const generalResponses = {
    uz: {
      latin: "Tushundim. Sizga quyidagi mavzularda yordam bera olaman:\n\n- Mahsulotlar va narxlar\n- Yetkazib berish\n- Kafolat va qaytarish\n- To'lov usullari\n- Do'kon manzili\n\nQanday savol bor?",
      cyrillic: "\u0422\u0443\u0448\u0443\u043d\u0434\u0438\u043c. \u0421\u0438\u0437\u0433\u0430 \u049b\u0443\u0439\u0438\u0434\u0430\u0433\u0438 \u043c\u0430\u0432\u0437\u0443\u043b\u0430\u0440\u0434\u0430 \u0451\u0440\u0434\u0430\u043c \u0431\u0435\u0440\u0430 \u043e\u043b\u0430\u043c\u0430\u043d:\n\n- \u041c\u0430\u04b3\u0441\u0443\u043b\u043e\u0442\u043b\u0430\u0440 \u0432\u0430 \u043d\u0430\u0440\u0445\u043b\u0430\u0440\n- \u0415\u0442\u043a\u0430\u0437\u0438\u0431 \u0431\u0435\u0440\u0438\u0448\n- \u041a\u0430\u0444\u043e\u043b\u0430\u0442 \u0432\u0430 \u049b\u0430\u0439\u0442\u0430\u0440\u0438\u0448\n- \u0422\u045e\u043b\u043e\u0432 \u0443\u0441\u0443\u043b\u043b\u0430\u0440\u0438\n- \u0414\u045e\u043a\u043e\u043d \u043c\u0430\u043d\u0437\u0438\u043b\u0438\n\n\u049a\u0430\u043d\u0434\u0430\u0439 \u0441\u0430\u0432\u043e\u043b \u0431\u043e\u0440?"
    },
    ru: "\u041f\u043e\u043d\u044f\u043b. \u041c\u043e\u0433\u0443 \u043f\u043e\u043c\u043e\u0447\u044c \u043f\u043e \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0438\u043c \u0442\u0435\u043c\u0430\u043c:\n\n- \u0422\u043e\u0432\u0430\u0440\u044b \u0438 \u0446\u0435\u043d\u044b\n- \u0414\u043e\u0441\u0442\u0430\u0432\u043a\u0430\n- \u0413\u0430\u0440\u0430\u043d\u0442\u0438\u044f \u0438 \u0432\u043e\u0437\u0432\u0440\u0430\u0442\n- \u0421\u043f\u043e\u0441\u043e\u0431\u044b \u043e\u043f\u043b\u0430\u0442\u044b\n- \u0410\u0434\u0440\u0435\u0441 \u043c\u0430\u0433\u0430\u0437\u0438\u043d\u0430\n\n\u041a\u0430\u043a\u043e\u0439 \u0443 \u0432\u0430\u0441 \u0432\u043e\u043f\u0440\u043e\u0441?",
    en: "I understand. I can help you with:\n\n- Products and prices\n- Delivery\n- Warranty and returns\n- Payment methods\n- Store location\n\nWhat's your question?"
  };

  sources.push('general');
  if (lang.language === 'uz') {
    return { response: generalResponses.uz[lang.script || 'latin'], sources };
  }
  return { response: generalResponses[lang.language], sources };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sessionId, message, productContext }: ChatRequest = await req.json();

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lang = detectLanguageAndScript(message);

    const { response, sources } = await generateAIResponse(
      supabase,
      message,
      lang,
      productContext
    );

    await supabase.from('ai_answer_history').insert({
      session_id: sessionId,
      user_message: message,
      ai_response: response,
      language: lang.language,
      script: lang.script,
      knowledge_sources: sources,
    });

    return new Response(
      JSON.stringify({
        success: true,
        response,
        language: lang.language,
        script: lang.script,
        sources,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("AI Chat error:", error);
    
    const errorResponse = {
      uz: "Kechirasiz, xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
      ru: "\u0418\u0437\u0432\u0438\u043d\u0438\u0442\u0435, \u043f\u0440\u043e\u0438\u0437\u043e\u0448\u043b\u0430 \u043e\u0448\u0438\u0431\u043a\u0430. \u041f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430, \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0435 \u0440\u0430\u0437.",
      en: "Sorry, an error occurred. Please try again."
    };
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        response: errorResponse.uz
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
