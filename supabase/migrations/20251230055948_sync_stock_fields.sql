/*
  # Sync Stock Fields
  
  1. Changes
    - Create trigger to keep stock and stock_quantity in sync
    - When stock is updated, update stock_quantity
    - When stock_quantity is updated, update stock
    
  2. Purpose
    - Ensure data consistency between legacy stock_quantity and new stock field
    - Frontend queries can use either field reliably
*/

CREATE OR REPLACE FUNCTION sync_stock_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stock IS NOT NULL AND NEW.stock > 0 AND (NEW.stock_quantity IS NULL OR NEW.stock_quantity = 0) THEN
      NEW.stock_quantity := NEW.stock;
    ELSIF NEW.stock_quantity IS NOT NULL AND NEW.stock_quantity > 0 AND (NEW.stock IS NULL OR NEW.stock = 0) THEN
      NEW.stock := NEW.stock_quantity;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.stock IS DISTINCT FROM OLD.stock THEN
      NEW.stock_quantity := NEW.stock;
    ELSIF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
      NEW.stock := NEW.stock_quantity;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_stock_fields ON products;

CREATE TRIGGER trigger_sync_stock_fields
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION sync_stock_fields();