-- Naprawa polityki SELECT dla interests - umożliwienie widoczności liczby zainteresowanych
-- Migration: 20240101000012_fix_interests_select_policy

-- Problem: Użytkownicy nie widzą liczby zainteresowanych w ofertach innych użytkowników
-- na stronie /offers, ponieważ polityka RLS blokuje dostęp do tabeli interests.
-- Obecna polityka pozwala użytkownikom widzieć tylko:
--   1. Swoje własne interesty (user_id = auth.uid())
--   2. Interesty w ich ofertach (gdzie są właścicielem)
--
-- To blokuje serwis OfferService.listOffers() który próbuje pobrać liczbę
-- zainteresowanych dla każdej oferty poprzez COUNT na tabeli interests.
--
-- Zgodnie z PRD (US-003): "Liczba zainteresowanych wyświetlona na karcie" -
-- KAŻDY użytkownik powinien widzieć liczbę zainteresowanych w każdej ofercie.
--
-- Rozwiązanie: Zmodyfikuj politykę SELECT aby wszyscy zalogowani użytkownicy
-- mogli czytać wszystkie interests. To umożliwi wyświetlenie liczby zainteresowanych.

-- Usuń starą restrykcyjną politykę
DROP POLICY IF EXISTS interests_select_related ON interests;

-- Stwórz nową politykę, która pozwala wszystkim zalogowanym użytkownikom
-- czytać wszystkie interests (potrzebne do wyświetlenia interests_count)
CREATE POLICY interests_select_all
  ON interests FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY interests_select_all ON interests IS 'Wszyscy zalogowani użytkownicy mogą czytać interests (wymagane dla wyświetlenia interests_count na listach ofert)';
