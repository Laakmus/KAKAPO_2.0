-- KAKAPO Storage Setup - Bucket dla zdjęć ofert
-- Migration: 20240101000007_storage_setup

-- =============================================================================
-- STORAGE BUCKET: offers
-- =============================================================================
-- Bucket do przechowywania zdjęć ofert uploadowanych przez użytkowników

-- Tworzenie bucket'a 'offers'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'offers',
  'offers',
  true, -- publiczny dostęp do odczytu
  10485760, -- 10 MB w bajtach (10 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- =============================================================================
-- RLS POLICIES dla storage.objects
-- =============================================================================

-- Polityka 1: Wszyscy mogą czytać (wyświetlać) zdjęcia ofert
CREATE POLICY "Publiczny dostęp do odczytu zdjęć ofert"
ON storage.objects FOR SELECT
USING (bucket_id = 'offers');

-- Polityka 2: Tylko zalogowani użytkownicy mogą uploadować do swojego folderu
CREATE POLICY "Użytkownicy mogą uploadować do swojego folderu"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'offers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Polityka 3: Tylko właściciel może usuwać swoje pliki
CREATE POLICY "Użytkownicy mogą usuwać swoje pliki"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'offers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Polityka 4: Tylko właściciel może aktualizować swoje pliki
CREATE POLICY "Użytkownicy mogą aktualizować swoje pliki"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'offers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

