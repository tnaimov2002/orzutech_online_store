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

const cyrillicUzbekChars = /[ўқғҳ]/i;
const cyrillicPattern = /[а-яА-ЯёЁ]/;
const latinPattern = /[a-zA-Z]/;
const uzbekLatinSpecial = /[oʻgʻ]|o'|g'/i;

function detectLanguageAndScript(text: string): DetectedLanguage {
  const cleanText = text.replace(/[\d\s\p{P}]/gu, '');
  
  if (cyrillicUzbekChars.test(cleanText)) {
    return { language: 'uz', script: 'cyrillic' };
  }
  
  const cyrillicCount = (cleanText.match(/[а-яА-ЯёЁ]/g) || []).length;
  const latinCount = (cleanText.match(/[a-zA-Z]/g) || []).length;
  
  if (cyrillicCount > latinCount) {
    const uzbekWords = ['salom', 'rahmat', 'kerak', 'bormi', 'qancha', 'necha', 'mahsulot', 'narx', 'yetkazish'];
    const russianWords = ['привет', 'спасибо', 'нужно', 'есть', 'сколько', 'товар', 'цена', 'доставка', 'здравствуйте'];
    
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
    const hasUzbek = uzbekLatinWords.some(w => textLower.includes(w)) || uzbekLatinSpecial.test(text);
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

async function findMatchingFAQ(
  supabase: any,
  message: string,
  lang: DetectedLanguage
): Promise<string | null> {
  const { data: faqs } = await supabase
    .from('ai_faq')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (!faqs || faqs.length === 0) return null;

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
  limit: number = 5
): Promise<any[]> {
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  
  let queryBuilder = supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      price,
      discount_percent,
      stock_quantity,
      specifications,
      categories(name)
    `)
    .eq('is_active', true)
    .gt('stock_quantity', 0);

  if (searchTerms.length > 0) {
    const searchPattern = searchTerms.join(' | ');
    queryBuilder = queryBuilder.or(`name.ilike.%${searchTerms[0]}%,description.ilike.%${searchTerms[0]}%`);
  }

  const { data: products } = await queryBuilder.limit(limit);
  return products || [];
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
  lang: DetectedLanguage,
  context?: string
): string {
  if (products.length === 0) {
    const noProductsMsg = {
      uz: { latin: "Kechirasiz, so'rovingizga mos mahsulot topilmadi. Boshqa mahsulotlarni ko'rishni xohlaysizmi?", cyrillic: "Кечирасиз, сўровингизга мос маҳсулот топилмади. Бошқа маҳсулотларни кўришни хоҳлайсизми?" },
      ru: "Извините, по вашему запросу товары не найдены. Хотите посмотреть другие товары?",
      en: "Sorry, no products found matching your query. Would you like to see other products?"
    };
    if (lang.language === 'uz') {
      return noProductsMsg.uz[lang.script || 'latin'];
    }
    return noProductsMsg[lang.language];
  }

  const headers = {
    uz: { latin: "Sizga quyidagi mahsulotlarni tavsiya qilaman:", cyrillic: "Сизга қуйидаги маҳсулотларни тавсия қиламан:" },
    ru: "Рекомендую вам следующие товары:",
    en: "I recommend the following products:"
  };

  let response = lang.language === 'uz' 
    ? headers.uz[lang.script || 'latin']
    : headers[lang.language];
  response += "\n\n";

  products.forEach((product, index) => {
    const finalPrice = product.discount_percent 
      ? Math.round(product.price * (1 - product.discount_percent / 100))
      : product.price;
    
    const priceFormatted = finalPrice.toLocaleString('uz-UZ');
    const categoryName = product.categories?.name || '';
    
    response += `${index + 1}. **${product.name}**\n`;
    response += `   ${priceFormatted} so'm`;
    if (product.discount_percent) {
      response += lang.language === 'uz' 
        ? (lang.script === 'cyrillic' ? ` (-${product.discount_percent}% чегирма)` : ` (-${product.discount_percent}% chegirma)`)
        : lang.language === 'ru' ? ` (-${product.discount_percent}% скидка)` : ` (-${product.discount_percent}% off)`;
    }
    response += "\n\n";
  });

  const cta = {
    uz: { latin: "Qaysi biri haqida ko'proq ma'lumot olishni xohlaysiz?", cyrillic: "Қайси бири ҳақида кўпроқ маълумот олишни хоҳлайсиз?" },
    ru: "О каком товаре хотите узнать подробнее?",
    en: "Which one would you like to know more about?"
  };

  response += lang.language === 'uz' 
    ? cta.uz[lang.script || 'latin']
    : cta[lang.language];

  return response;
}

function generateGreeting(lang: DetectedLanguage, operatorStatus: string): string {
  const greetings = {
    uz: {
      latin: `Salom! Men ORZUTECH sun'iy intellekt yordamchisiman. ${operatorStatus === 'offline' ? 'Hozir operatorlar band. ' : ''}Sizga qanday yordam bera olaman?`,
      cyrillic: `Салом! Мен ORZUTECH сунъий интеллект ёрдамчисиман. ${operatorStatus === 'offline' ? 'Ҳозир операторлар банд. ' : ''}Сизга қандай ёрдам бера оламан?`
    },
    ru: `Здравствуйте! Я AI-помощник ORZUTECH. ${operatorStatus === 'offline' ? 'Сейчас операторы заняты. ' : ''}Чем могу помочь?`,
    en: `Hello! I'm ORZUTECH AI assistant. ${operatorStatus === 'offline' ? 'Operators are currently busy. ' : ''}How can I help you?`
  };

  if (lang.language === 'uz') {
    return greetings.uz[lang.script || 'latin'];
  }
  return greetings[lang.language];
}

function generateUncertainResponse(lang: DetectedLanguage): string {
  const responses = {
    uz: {
      latin: "Aniqlashtirib beraman. Iltimos, biroz kuting yoki operatorimiz bilan bog'lanishni xohlaysizmi?",
      cyrillic: "Аниқлаштириб бераман. Илтимос, бироз кутинг ёки операторимиз билан боғланишни хоҳлайсизми?"
    },
    ru: "Уточню информацию. Пожалуйста, подождите или хотите связаться с оператором?",
    en: "Let me clarify that. Please wait a moment or would you like to speak with an operator?"
  };

  if (lang.language === 'uz') {
    return responses.uz[lang.script || 'latin'];
  }
  return responses[lang.language];
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

  const productKeywords = ['noutbuk', 'kompyuter', 'telefon', 'laptop', 'computer', 'phone', 'iphone', 'samsung', 'arzon', 'дешевый', 'ноутбук', 'компьютер', 'телефон', 'mahsulot', 'товар', 'product', 'sotib', 'купить', 'buy', 'kerak', 'нужно', 'need'];
  const isProductQuery = productKeywords.some(kw => messageLower.includes(kw));

  if (isProductQuery) {
    const products = await searchProducts(supabase, message, 3);
    sources.push('products');
    return { response: generateProductRecommendation(products, lang), sources };
  }

  if (productContext?.id) {
    const { data: product } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', productContext.id)
      .maybeSingle();

    if (product) {
      sources.push('product_context');
      const finalPrice = product.discount_percent 
        ? Math.round(product.price * (1 - product.discount_percent / 100))
        : product.price;

      const productInfo = {
        uz: {
          latin: `"${product.name}" haqida: Narxi ${finalPrice.toLocaleString('uz-UZ')} so'm. ${product.stock_quantity > 0 ? 'Mavjud.' : 'Hozircha mavjud emas.'} Sotib olishga yordam beraymi?`,
          cyrillic: `"${product.name}" ҳақида: Нархи ${finalPrice.toLocaleString('uz-UZ')} сўм. ${product.stock_quantity > 0 ? 'Мавжуд.' : 'Ҳозирча мавжуд эмас.'} Сотиб олишга ёрдам берайми?`
        },
        ru: `О товаре "${product.name}": Цена ${finalPrice.toLocaleString('uz-UZ')} сум. ${product.stock_quantity > 0 ? 'В наличии.' : 'Нет в наличии.'} Помочь с покупкой?`,
        en: `About "${product.name}": Price ${finalPrice.toLocaleString('uz-UZ')} UZS. ${product.stock_quantity > 0 ? 'In stock.' : 'Out of stock.'} Would you like help purchasing?`
      };

      if (lang.language === 'uz') {
        return { response: productInfo.uz[lang.script || 'latin'], sources };
      }
      return { response: productInfo[lang.language], sources };
    }
  }

  const policyKeywords = {
    warranty: ['kafolat', 'гарантия', 'warranty', 'garantiya'],
    returns: ['qaytarish', 'возврат', 'return', 'almashish', 'обмен'],
    privacy: ['maxfiylik', 'конфиденциальность', 'privacy']
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
      cyrillic: "Тушундим. Сизга қуйидаги мавзуларда ёрдам бера оламан:\n\n- Маҳсулотлар ва нархлар\n- Етказиб бериш\n- Кафолат ва қайтариш\n- Тўлов усуллари\n- Дўкон манзили\n\nҚандай савол бор?"
    },
    ru: "Понял. Могу помочь по следующим темам:\n\n- Товары и цены\n- Доставка\n- Гарантия и возврат\n- Способы оплаты\n- Адрес магазина\n\nКакой у вас вопрос?",
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
        JSON.stringify({ error: "Missing required fields" }),
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

    await supabase.rpc('increment_ai_analytics', {}).catch(() => {});

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
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
