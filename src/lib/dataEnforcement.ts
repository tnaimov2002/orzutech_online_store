const SUPABASE_PRODUCT_FIELDS = ['id', 'name_uz', 'name_ru', 'name_en', 'price', 'stock', 'category_id', 'created_at'];
const MOCK_PRODUCT_INDICATORS = ['mock', 'demo', 'test', 'sample', 'fake', 'dummy'];

export function validateSupabaseSource<T extends Record<string, unknown>>(
  data: T[] | null,
  tableName: string
): T[] {
  if (!data) {
    return [];
  }

  if (import.meta.env.DEV) {
    for (const item of data) {
      const itemStr = JSON.stringify(item).toLowerCase();
      const hasMockIndicator = MOCK_PRODUCT_INDICATORS.some(indicator => itemStr.includes(indicator));

      if (hasMockIndicator && tableName === 'products') {
        console.warn(
          `[DATA ENFORCEMENT WARNING] Potential mock/demo data detected in ${tableName}. ` +
          'All product data MUST come from Supabase database only.'
        );
      }
    }

    if (tableName === 'products' && data.length > 0) {
      const firstItem = data[0];
      const hasRequiredFields = SUPABASE_PRODUCT_FIELDS.some(field => field in firstItem);

      if (!hasRequiredFields) {
        console.error(
          `[DATA ENFORCEMENT ERROR] Products missing required Supabase fields. ` +
          'Data source may not be Supabase database.'
        );
      }
    }
  }

  return data;
}

export function assertSupabaseOnly(): void {
  if (import.meta.env.DEV) {
    const globalAny = globalThis as Record<string, unknown>;

    const forbiddenGlobals = ['mockProducts', 'demoProducts', 'cmsProducts', 'staticProducts'];

    for (const key of forbiddenGlobals) {
      if (key in globalAny) {
        throw new Error(
          `[DATA ENFORCEMENT VIOLATION] Forbidden global "${key}" detected. ` +
          'All product data MUST come from Supabase database only. ' +
          'Remove any mock, CMS, or static product sources immediately.'
        );
      }
    }
  }
}

export function logDataSource(source: 'supabase', tableName: string, count: number): void {
  if (import.meta.env.DEV && source !== 'supabase') {
    throw new Error(
      `[DATA ENFORCEMENT VIOLATION] Invalid data source "${source}" for ${tableName}. ` +
      'Only "supabase" is allowed as data source.'
    );
  }
}
