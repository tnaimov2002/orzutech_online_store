# Moysklad Integration

## Edge Functions (Supabase)

All Edge Functions are deployed at `https://uewatoihvlsltyxeized.supabase.co`:

| Function | URL | Purpose |
|----------|-----|---------|
| **moysklad-sync** | `/functions/v1/moysklad-sync` | Main product sync + read endpoint |
| **moysklad-sync-categories** | `/functions/v1/moysklad-sync-categories` | Category hierarchy sync |
| **handle-product-delete** | `/functions/v1/handle-product-delete` | Product deletion webhook handler |

## Product Data Flow

```
Frontend/Admin Panel
        |
        v
/functions/v1/moysklad-sync?read_only=true
        |
        v
Returns products from Supabase DB
```

## Full Sync (Manual)

The script `moysklad/full_products_import.ts` is used only for initial database setup:

1. Create `.env` with `MOYSKLAD_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
2. Run from project root:

```bash
npx ts-node moysklad/full_products_import.ts
```

## API Usage

### Fetch All Products (Read Only)
```bash
curl "https://uewatoihvlsltyxeized.supabase.co/functions/v1/moysklad-sync?read_only=true"
```

### Fetch Single Product
```bash
curl "https://uewatoihvlsltyxeized.supabase.co/functions/v1/moysklad-sync?read_only=true&product_id=UUID"
```

### Fetch Products by Category
```bash
curl "https://uewatoihvlsltyxeized.supabase.co/functions/v1/moysklad-sync?read_only=true&category_id=UUID"
```

### Trigger Full Sync (from MoySklad)
```bash
curl "https://uewatoihvlsltyxeized.supabase.co/functions/v1/moysklad-sync"
```

### Sync Categories
```bash
curl "https://uewatoihvlsltyxeized.supabase.co/functions/v1/moysklad-sync-categories"
```

## Webhook Setup (Product Deletion)

Create webhook in MoySklad:

```bash
curl --compressed -X POST \
  https://api.moysklad.ru/api/remap/1.2/entity/webhook \
  -H "Authorization: Bearer $MOYSKLAD_TOKEN" \
  -H "Accept-Encoding: gzip" \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://uewatoihvlsltyxeized.supabase.co/functions/v1/handle-product-delete",
    "action": "DELETE",
    "entityType": "product"
   }'
```

List all webhooks:

```bash
curl --compressed -X GET \
  https://api.moysklad.ru/api/remap/1.2/entity/webhook \
  -H "Authorization: Bearer $MOYSKLAD_TOKEN" \
  -H "Accept-Encoding: gzip"
```
