-- Tabela dla przechowywania wielu zdjęć oferty
CREATE TABLE offer_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  image_url VARCHAR(2048) NOT NULL,
  thumbnail_url VARCHAR(2048) NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_offer_order UNIQUE(offer_id, order_index)
);

-- Indeksy dla szybszego pobierania zdjęć
CREATE INDEX idx_offer_images_offer_id ON offer_images(offer_id);
CREATE INDEX idx_offer_images_order ON offer_images(offer_id, order_index);

-- Włącz RLS
ALTER TABLE offer_images ENABLE ROW LEVEL SECURITY;

-- Policy: Wszyscy mogą przeglądać zdjęcia
CREATE POLICY "Public read access" ON offer_images
  FOR SELECT USING (true);

-- Policy: Właściciel oferty może dodawać zdjęcia
CREATE POLICY "Users can insert own offer images" ON offer_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = offer_images.offer_id
      AND offers.owner_id = auth.uid()
    )
  );

-- Policy: Właściciel może usuwać swoje zdjęcia
CREATE POLICY "Users can delete own offer images" ON offer_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = offer_images.offer_id
      AND offers.owner_id = auth.uid()
    )
  );

-- Policy: Właściciel może aktualizować kolejność zdjęć
CREATE POLICY "Users can update own offer images" ON offer_images
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = offer_images.offer_id
      AND offers.owner_id = auth.uid()
    )
  );

-- Trigger: Automatyczna aktualizacja offers.image_url gdy zmienia się główne zdjęcie
CREATE OR REPLACE FUNCTION update_offer_main_image()
RETURNS TRIGGER AS $$
BEGIN
  -- Jeśli to główne zdjęcie (order_index = 0)
  IF NEW.order_index = 0 THEN
    UPDATE offers
    SET image_url = NEW.image_url
    WHERE id = NEW.offer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offer_main_image
  AFTER INSERT OR UPDATE ON offer_images
  FOR EACH ROW
  EXECUTE FUNCTION update_offer_main_image();

-- Trigger: Jeśli główne zdjęcie zostanie usunięte, ustaw następne jako główne
CREATE OR REPLACE FUNCTION reorder_images_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Jeśli usunięto główne zdjęcie (order_index = 0)
  IF OLD.order_index = 0 THEN
    -- Zmniejsz order_index wszystkich pozostałych zdjęć
    UPDATE offer_images
    SET order_index = order_index - 1
    WHERE offer_id = OLD.offer_id
    AND order_index > 0;

    -- Zaktualizuj offers.image_url na nowe główne zdjęcie (jeśli istnieje)
    UPDATE offers
    SET image_url = (
      SELECT image_url FROM offer_images
      WHERE offer_id = OLD.offer_id
      AND order_index = 0
      LIMIT 1
    )
    WHERE id = OLD.offer_id;
  ELSE
    -- Jeśli usunięto inne zdjęcie, zmniejsz order_index zdjęć po nim
    UPDATE offer_images
    SET order_index = order_index - 1
    WHERE offer_id = OLD.offer_id
    AND order_index > OLD.order_index;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reorder_images_after_delete
  AFTER DELETE ON offer_images
  FOR EACH ROW
  EXECUTE FUNCTION reorder_images_after_delete();
