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

## Edge Functions (Supabase)

Все Edge функции находятся в `supabase/functions/`.

`moysklad-sync-products` — обновляет последние 100 товаров и затем все остатки.
Запускается по крону через Supabase (Cron extension).

`moysklad-sync-categories` — синхронизирует категории.

`moysklad-handle-product-delete` — вебхук на удаление товаров.

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

## Вебхук удаления

Функция: `supabase/functions/moysklad-handle-product-delete`.
Вебхук в МойСклад должен указывать на URL этой функции и отправлять `DELETE`
события по товарам.

Создать вебхук

```bash
curl --compressed -X POST \
  https://api.moysklad.ru/api/remap/1.2/entity/webhook \
  -H "Authorization: Bearer $MOYSKLAD_TOKEN" \
  -H "Accept-Encoding: gzip" \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "https://YOUR_PROJECT.supabase.co/functions/v1/moysklad-handle-product-delete",
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
