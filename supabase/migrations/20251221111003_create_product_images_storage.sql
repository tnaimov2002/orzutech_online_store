/*
  # Create Storage for Product Images

  1. Storage Setup
    - Create `product-images` storage bucket
    - Set up public access policies for reading images
    - Restrict upload/delete to authenticated users only

  2. Security
    - Public read access for all images
    - Authenticated users can upload images
    - Only authenticated users can delete their uploads
    
  3. Configuration
    - Max file size: 5MB per image
    - Allowed file types: image/jpeg, image/png, image/webp
*/

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to product images
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Allow authenticated users to upload product images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to delete product images
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');