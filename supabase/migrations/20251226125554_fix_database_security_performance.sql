/*
  # Fix Database Security and Performance Issues

  1. Add Missing Foreign Key Indexes
    - category_audit_log.category_id
    - chat_operators.user_id
    - chat_sessions.product_id
    - order_items.product_id
    - orders.store_location_id
    - product_images.product_id
    - product_variants.product_id

  2. Fix Function Search Paths (Security)
    - Set immutable search_path for all functions

  3. Drop Unused Indexes
    - Various audit_logs indexes
    - Various category indexes
    - Various delivery indexes
    - Various chat indexes
    - Various AI indexes

  4. Clean Up Duplicate Permissive Policies
    - Remove redundant policies where admin policies overlap with public
*/

-- =============================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_category_audit_log_category_id 
  ON public.category_audit_log(category_id);

CREATE INDEX IF NOT EXISTS idx_chat_operators_user_id 
  ON public.chat_operators(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_product_id 
  ON public.chat_sessions(product_id);

CREATE INDEX IF NOT EXISTS idx_order_items_product_id 
  ON public.order_items(product_id);

CREATE INDEX IF NOT EXISTS idx_orders_store_location_id 
  ON public.orders(store_location_id);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id 
  ON public.product_images(product_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id 
  ON public.product_variants(product_id);

-- =============================================
-- 2. DROP UNUSED INDEXES
-- =============================================

DROP INDEX IF EXISTS idx_audit_logs_action_type;
DROP INDEX IF EXISTS idx_audit_logs_target_type;
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_performed_by;
DROP INDEX IF EXISTS idx_categories_path;
DROP INDEX IF EXISTS idx_categories_status;
DROP INDEX IF EXISTS idx_delivery_settings_region_code;
DROP INDEX IF EXISTS idx_delivery_settings_active;
DROP INDEX IF EXISTS idx_city_overrides_region;
DROP INDEX IF EXISTS idx_city_overrides_city;
DROP INDEX IF EXISTS idx_chat_sessions_status;
DROP INDEX IF EXISTS idx_chat_sessions_assigned_operator;
DROP INDEX IF EXISTS idx_ai_knowledge_embedding;
DROP INDEX IF EXISTS idx_ai_knowledge_type;
DROP INDEX IF EXISTS idx_ai_faq_active;
DROP INDEX IF EXISTS idx_ai_answer_history_session;
DROP INDEX IF EXISTS idx_ai_answer_history_approved;

-- =============================================
-- 3. FIX FUNCTION SEARCH PATHS (Security)
-- =============================================

-- Fix update_category_path function
CREATE OR REPLACE FUNCTION public.update_category_path()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_path TEXT;
  parent_level INTEGER;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path := NEW.id::TEXT;
    NEW.level := 0;
  ELSE
    SELECT path, level INTO parent_path, parent_level
    FROM categories WHERE id = NEW.parent_id;
    
    NEW.path := parent_path || '/' || NEW.id::TEXT;
    NEW.level := parent_level + 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix update_session_last_message function
CREATE OR REPLACE FUNCTION public.update_session_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE chat_sessions
  SET 
    last_message_at = NEW.created_at,
    unread_count = CASE 
      WHEN NEW.sender_type = 'visitor' THEN unread_count + 1
      ELSE unread_count
    END
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- Drop and recreate match_knowledge function with secure search_path
DROP FUNCTION IF EXISTS public.match_knowledge(vector, float, int);
DROP FUNCTION IF EXISTS public.match_knowledge(vector(384), double precision, integer);

CREATE FUNCTION public.match_knowledge(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content_type text,
  title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content_type::text,
    kb.title,
    kb.content,
    (1 - (kb.embedding <=> query_embedding))::float AS similarity
  FROM ai_knowledge_base kb
  WHERE 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =============================================
-- 4. CLEAN UP DUPLICATE POLICIES
-- =============================================

-- admin_users: Keep only "Admin can manage admin users" (more permissive)
DROP POLICY IF EXISTS "Admin can read admin users" ON public.admin_users;

-- ai_analytics: Keep "Authenticated users can manage analytics"
DROP POLICY IF EXISTS "Anyone can view analytics" ON public.ai_analytics;

-- ai_answer_history: Keep "Authenticated users can manage answer history" for SELECT
DROP POLICY IF EXISTS "Anyone can view answer history" ON public.ai_answer_history;

-- ai_faq: Keep "Authenticated users can manage FAQ"
DROP POLICY IF EXISTS "Anyone can view active FAQ" ON public.ai_faq;
-- Re-create a proper public read policy
DROP POLICY IF EXISTS "Public can view active FAQ" ON public.ai_faq;
CREATE POLICY "Public can view active FAQ"
  ON public.ai_faq
  FOR SELECT
  TO anon
  USING (is_active = true);

-- ai_knowledge_base: Keep "Authenticated users can manage knowledge"
DROP POLICY IF EXISTS "Anyone can view knowledge base" ON public.ai_knowledge_base;
-- Re-create public read policy
DROP POLICY IF EXISTS "Public can view knowledge base" ON public.ai_knowledge_base;
CREATE POLICY "Public can view knowledge base"
  ON public.ai_knowledge_base
  FOR SELECT
  TO anon
  USING (true);

-- ai_policies: Keep "Authenticated users can manage policies"
DROP POLICY IF EXISTS "Anyone can view active policies" ON public.ai_policies;
-- Re-create public read policy
DROP POLICY IF EXISTS "Public can view active policies" ON public.ai_policies;
CREATE POLICY "Public can view active policies"
  ON public.ai_policies
  FOR SELECT
  TO anon
  USING (is_active = true);

-- chat_operators: Keep "Authenticated users can manage operators"
DROP POLICY IF EXISTS "Anyone can view online operators" ON public.chat_operators;
-- Re-create public read policy for online operators only
DROP POLICY IF EXISTS "Public can view online operators" ON public.chat_operators;
CREATE POLICY "Public can view online operators"
  ON public.chat_operators
  FOR SELECT
  TO anon
  USING (status = 'online' AND is_active = true);

-- chat_quick_replies: Keep "Authenticated users can manage quick replies"
DROP POLICY IF EXISTS "Anyone can view active quick replies" ON public.chat_quick_replies;
-- Re-create public read policy
DROP POLICY IF EXISTS "Public can view active quick replies" ON public.chat_quick_replies;
CREATE POLICY "Public can view active quick replies"
  ON public.chat_quick_replies
  FOR SELECT
  TO anon
  USING (is_active = true);

-- chat_settings: Keep "Authenticated users can manage settings"
DROP POLICY IF EXISTS "Anyone can view chat settings" ON public.chat_settings;
-- Re-create public read policy
DROP POLICY IF EXISTS "Public can view chat settings" ON public.chat_settings;
CREATE POLICY "Public can view chat settings"
  ON public.chat_settings
  FOR SELECT
  TO anon
  USING (true);
