const MOCK_PRODUCT_INDICATORS = ['mock', 'demo', 'test', 'sample', 'fake', 'dummy'];

export function assertSupabaseOnly(): void {
  if (import.meta.env.DEV) {
    const globalAny = globalThis as Record<string, unknown>;

    const forbiddenGlobals = ['mockProducts', 'demoProducts', 'cmsProducts', 'staticProducts'];

    for (const key of forbiddenGlobals) {
      if (key in globalAny) {
        throw new Error(
          `[DATA ENFORCEMENT VIOLATION] Forbidden global "${key}" detected. ` +
          'All product data MUST come from the moysklad-sync endpoint only. ' +
          'Remove any mock, CMS, or static product sources immediately.'
        );
      }
    }

    console.info(
      '[DATA ENFORCEMENT] Product data source: moysklad-sync Edge Function. ' +
      'All product queries route through /functions/v1/moysklad-sync?read_only=true'
    );
  }
}

export function warnDirectSupabaseQuery(tableName: string): void {
  if (import.meta.env.DEV && tableName === 'products') {
    console.warn(
      `[DATA ENFORCEMENT WARNING] Direct Supabase query to "${tableName}" table detected. ` +
      'Products MUST be fetched from the moysklad-sync endpoint only. ' +
      'Use fetchProducts() from services/productService.ts instead.'
    );
  }
}

export function validateProductSource(products: unknown[], source: string): void {
  if (import.meta.env.DEV) {
    if (source !== 'moysklad-sync') {
      console.error(
        `[DATA ENFORCEMENT ERROR] Invalid product source: "${source}". ` +
        'Products MUST come from the moysklad-sync endpoint only.'
      );
    }

    if (Array.isArray(products) && products.length > 0) {
      const firstProduct = products[0] as Record<string, unknown>;
      const productStr = JSON.stringify(firstProduct).toLowerCase();
      const hasMockIndicator = MOCK_PRODUCT_INDICATORS.some(indicator => productStr.includes(indicator));

      if (hasMockIndicator) {
        console.warn(
          '[DATA ENFORCEMENT WARNING] Potential mock/demo data detected in products. ' +
          'All product data MUST come from the moysklad-sync endpoint only.'
        );
      }
    }
  }
}
