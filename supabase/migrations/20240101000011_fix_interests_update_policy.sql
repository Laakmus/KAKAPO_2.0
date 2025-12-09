-- Naprawa polityki UPDATE dla interests - umożliwienie mutual match
-- Migration: 20240101000011_fix_interests_update_policy

-- Problem: Gdy Osoba B wyraża zainteresowanie ofertą Osoby A (i tworzy się mutual match),
-- kod próbuje zaktualizować interest Osoby A (z PROPOSED na ACCEPTED).
-- Ale obecna polityka RLS pozwala tylko użytkownikom edytować swoje własne interesty
-- (gdzie user_id = auth.uid()), więc Osoba B nie może zaktualizować interesu Osoby A.
--
-- Rozwiązanie: Pozwól użytkownikom aktualizować interesty w ich własnych ofertach
-- (jako właściciel oferty). To umożliwi działanie logiki mutual match.

-- Usuń starą restrykcyjną politykę
DROP POLICY IF EXISTS interests_update_own ON interests;

-- Stwórz nową politykę, która pozwala:
-- 1. Użytkownikom edytować swoje własne interesty (user_id = auth.uid())
-- 2. Właścicielom ofert edytować interesty w ich ofertach (dla mutual match)
CREATE POLICY interests_update_own_or_offer_owner
  ON interests FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM offers
      WHERE offers.id = interests.offer_id
        AND offers.owner_id = auth.uid()
    )
  );

COMMENT ON POLICY interests_update_own_or_offer_owner ON interests IS 'Użytkownicy mogą edytować swoje interesty lub interesy w ich ofertach (dla mutual match)';
