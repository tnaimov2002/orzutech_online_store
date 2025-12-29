# Moysklad

## Первый импорт (инициализация БД)

Скрипт `moysklad/full_products_import.ts` используется только при создании
пустой базы.

1. Создайте `.env` с `MOYSKLAD_TOKEN`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`.
2. Запустите из корня проекта:

```bash
node moysklad/full_products_import.ts
```

## Регулярная синхронизация (Edge Function)

`moysklad/sync_recent_products_and_stock.ts` — Supabase Edge Function.
Ее нужно задеплоить и запускать по крону через Supabase (Cron extension).
Функция обновляет последние 100 товаров и затем обновляет все остатки через RPC
ниже.

```sql
create or replace function public.update_products_stock(payload jsonb)
returns void
language sql
as $$
  update products p
  set stock = v.stock
  from jsonb_to_recordset(payload) as v(moysklad_id uuid, stock numeric)
  where p.moysklad_id = v.moysklad_id;
$$;
```

## Вебхук

`supabase functions deploy handle-product-delete --no-verify-jwt`

Создать вебхук

```bash
curl --compressed -X POST \
  https://api.moysklad.ru/api/remap/1.2/entity/webhook \
  -H "Authorization: Bearer $MOYSKLAD_TOKEN" \
  -H "Accept-Encoding: gzip" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://webhook.site/97060ff7-e688-47b3-bfbe-6fd6a05538d7",
    "action": "DELETE",
    "entityType": "product"
   }'
```

Получить все вебхуки

```bash
curl --compressed -X GET \
  https://api.moysklad.ru/api/remap/1.2/entity/webhook \
  -H "Authorization: Bearer $MOYSKLAD_TOKEN" \
  -H "Accept-Encoding: gzip" \
  -H 'Content-Type: application/json' | jq '.rows[] | select(.action == "DELETE")'
```

Удалить вебхук

```bash
curl --compressed -X DELETE \
  "https://api.moysklad.ru/api/remap/1.2/entity/webhook/{}" \
  -H "Authorization: Bearer $MOYSKLAD_TOKEN" \
  -H "Accept-Encoding: gzip"
```
