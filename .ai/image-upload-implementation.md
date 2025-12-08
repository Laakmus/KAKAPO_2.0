# Implementacja Uploadu Zdjęć - KAKAPO

## Przegląd

System uploadu wielu zdjęć (do 5) dla ofert z automatyczną kompresją, generowaniem miniatur i placeholderem dla ofert bez zdjęć.

**Status: ✅ ZAIMPLEMENTOWANY**

## Utworzone Pliki

### 1. Migracje Bazy Danych

#### `supabase/migrations/20240101000007_storage_setup.sql`
Konfiguruje Supabase Storage bucket 'offers' z:
- Maksymalny rozmiar pliku: 10 MB
- Dozwolone formaty: JPG, PNG, WebP
- Publiczny dostęp do odczytu
- RLS policies dla bezpieczeństwa

#### `supabase/migrations/20240101000008_offer_images_table.sql`
Dodaje tabelę `offer_images` dla wielu zdjęć:
- Relacja jeden-do-wielu z tabelą `offers`
- Pole `order_index` dla sortowania (0 = główne zdjęcie)
- Automatyczne usuwanie zdjęć przy usuwaniu oferty (CASCADE)
- RLS policies dla bezpieczeństwa
- Trigger automatycznie aktualizujący `offers.image_url`

### 2. Typy TypeScript (`src/types.ts`)

Dodane typy:
```typescript
// Typy dla tabeli offer_images
export type OfferImageRow = Tables<'offer_images'>;
export type OfferImageInsert = TablesInsert<'offer_images'>;
export type OfferImageUpdate = TablesUpdate<'offer_images'>;

// DTO dla pojedynczego zdjęcia oferty
export type OfferImageDTO = {
  id: string;
  offer_id: string;
  image_url: string;
  thumbnail_url: string | null;
  order_index: number;
  created_at: string | null;
};

// Komendy API
export type AddOfferImagesCommand = {
  images: Array<{
    image_url: string;
    thumbnail_url?: string | null;
    order_index: number;
  }>;
};

export type ReorderImagesCommand = {
  images: Array<{
    id: string;
    order_index: number;
  }>;
};
```

Rozszerzone typy:
- `OfferDetailDTO` - dodano pola `images?: OfferImageDTO[]` i `images_count?: number`
- `OfferListItemDTO` - dodano pola `images_count?: number` i `thumbnail_url?: string | null`
- `OfferDetailViewModel` - dodano pola `images` i `images_count`

### 3. Schematy Walidacji (`src/schemas/offers.schema.ts`)

Dodane schematy:
```typescript
// Schema dla pojedynczego zdjęcia
export const offerImageSchema = z.object({
  image_url: z.string().url().max(2048),
  thumbnail_url: z.string().url().max(2048).nullable().optional(),
  order_index: z.number().int().min(0).max(4),
});

// Schema dla dodawania zdjęć
export const addOfferImagesSchema = z.object({
  images: z.array(offerImageSchema).min(1).max(5),
});

// Schema dla zmiany kolejności
export const reorderImagesSchema = z.object({
  images: z.array(reorderImageItemSchema).min(1).max(5),
});

// Schema dla parametru image_id
export const imageIdParamsSchema = z.object({
  offer_id: z.string().uuid(),
  image_id: z.string().uuid(),
});
```

### 4. Utility do Kompresji (`src/utils/image.ts`)

Zawiera funkcje:
- `compressImage()` - kompresja z zachowaniem proporcji
- `generateThumbnail()` - generowanie miniatur (400px)
- `validateImageFile()` - walidacja formatu i rozmiaru
- `validateImageFiles()` - walidacja tablicy plików (max 5)
- `uploadImageToStorage()` - upload pojedynczego pliku
- `uploadMultipleImages()` - upload wielu plików równolegle
- `deleteImageFromStorage()` - usuwanie pojedynczego pliku
- `deleteMultipleImages()` - usuwanie wielu plików

**Kompresja:**
- Maksymalna szerokość/wysokość: 1920px
- Jakość JPEG: 85%
- Zachowanie aspect ratio

**Walidacja:**
- Maksymalnie 5 plików na raz
- Każdy plik max 10 MB
- Dozwolone formaty: JPG, PNG, WebP

### 5. Serwis Ofert (`src/services/offer.service.ts`)

Dodane metody:
```typescript
// Pobiera wszystkie zdjęcia oferty posortowane po order_index
async getOfferImages(offerId: string): Promise<OfferImageDTO[]>

// Dodaje zdjęcia do oferty (max 5)
async addOfferImages(offerId: string, userId: string, command: AddOfferImagesCommand): Promise<OfferImageDTO[]>

// Zmienia kolejność zdjęć oferty
async updateImageOrder(offerId: string, userId: string, command: ReorderImagesCommand): Promise<OfferImageDTO[]>

// Usuwa pojedyncze zdjęcie z oferty
async deleteOfferImage(imageId: string, userId: string): Promise<boolean>

// Pobiera liczbę zdjęć dla oferty
async getOfferImagesCount(offerId: string): Promise<number>
```

Zaktualizowane metody:
- `getOfferById()` - teraz pobiera również zdjęcia oferty
- `listOffers()` - pobiera `images_count` i `thumbnail_url` dla każdej oferty
- `getMyOffers()` - pobiera `images_count` i `thumbnail_url`

### 6. Endpointy API

#### `GET /api/offers/{offer_id}/images`
Pobiera wszystkie zdjęcia oferty.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "offer_id": "uuid",
      "image_url": "https://...",
      "thumbnail_url": "https://...",
      "order_index": 0,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `POST /api/offers/{offer_id}/images`
Dodaje zdjęcia do oferty (wymaga autoryzacji jako właściciel).

**Request Body:**
```json
{
  "images": [
    {
      "image_url": "https://...",
      "thumbnail_url": "https://...",
      "order_index": 0
    }
  ]
}
```

**Response 201:**
```json
{
  "data": [...],
  "message": "Dodano 3 zdjęć"
}
```

**Błędy:**
- 401 Unauthorized - brak autoryzacji
- 403 Forbidden - nie właściciel oferty
- 404 Not Found - oferta nie istnieje
- 422 Unprocessable Entity - przekroczono limit 5 zdjęć

#### `PUT /api/offers/{offer_id}/images/reorder`
Zmienia kolejność zdjęć (wymaga autoryzacji jako właściciel).

**Request Body:**
```json
{
  "images": [
    { "id": "uuid", "order_index": 0 },
    { "id": "uuid", "order_index": 1 }
  ]
}
```

#### `DELETE /api/offers/{offer_id}/images/{image_id}`
Usuwa pojedyncze zdjęcie (wymaga autoryzacji jako właściciel).

**Response 200:**
```json
{
  "success": true,
  "message": "Zdjęcie zostało usunięte"
}
```

### 7. Komponenty React

#### `src/components/ImagePlaceholder.tsx`
- Komponent placeholder "Brak zdjęcia" (styl OLX)
- Komponent `OfferImage` z automatycznym fallback
- Obsługa miniatur dla list ofert

#### `src/components/ImageUpload.tsx`
- Input do wyboru wielu plików z komputera (max 5)
- **Automatyczne ustawienie sesji Supabase przed uploadem** (rozwiązuje błędy RLS)
- Walidacja przed uploadem (format, rozmiar, liczba)
- Podgląd wszystkich wybranych zdjęć w galerii
- Loading state podczas uploadu
- Obsługa błędów
- Przycisk usuwania pojedynczego zdjęcia
- Zmiana kolejności zdjęć (przyciski ←/→)
- Oznaczenie głównego zdjęcia (badge "Główne")

**Ważne:** Komponent używa `useAuth()` do pobrania tokenu i ustawienia sesji na kliencie Supabase:
```typescript
const ensureAuthSession = useCallback(async () => {
  const refreshToken = localStorage.getItem('refresh_token') || '';
  await supabaseClient.auth.setSession({
    access_token: token,
    refresh_token: refreshToken,
  });
}, [token]);
```

#### `src/components/OfferCard.tsx`
- Wyświetla główne zdjęcie oferty z miniaturą
- **Badge z liczbą zdjęć** (ikona + liczba, widoczny gdy > 1 zdjęcie)
- Używa `images_count` i `thumbnail_url` z DTO

#### `src/components/OfferDetailPanel.tsx`
- **Pełna galeria zdjęć** z nawigacją:
  - Nawigacja strzałkami (poprzednie/następne)
  - Obsługa klawiatury (← →)
  - Miniatury nawigacyjne pod głównym zdjęciem
  - Licznik zdjęć (np. "2 / 5")
  - Highlight aktywnej miniatury
- Fallback do pojedynczego zdjęcia jeśli brak tablicy `images`

#### `src/components/OfferDetailsPanel.tsx`
- Panel boczny z podglądem oferty
- Badge z liczbą zdjęć

#### `src/components/OfferForm.tsx`
- Formularz tworzenia nowej oferty
- Zintegrowany z `ImageUpload` dla wielu zdjęć
- Po utworzeniu oferty zapisuje zdjęcia przez API `/api/offers/{id}/images`

#### `src/components/OfferEditForm.tsx`
- Formularz edycji oferty
- Ładuje istniejące zdjęcia z API przy montowaniu
- Obsługuje dodawanie/usuwanie/zmianę kolejności zdjęć
- Zapisuje zmiany przez API

## Struktura Plików w Storage

```
offers/
├── {user_id_1}/
│   ├── 1234567890-abc123.jpg         (oryginał skompresowany)
│   ├── 1734567890-thumb-xyz456.jpg   (miniatura)
│   └── ...
├── {user_id_2}/
│   └── ...
```

## Flow Użytkownika

1. **Wybór plików:**
   - Użytkownik klika "Wybierz zdjęcia"
   - Wybiera do 5 plików jednocześnie
   - Frontend waliduje format, rozmiar i liczbę plików

2. **Upload:**
   - Komponent `ImageUpload` ustawia sesję Supabase (token + refresh_token)
   - Każdy plik jest kompresowany (max 1920px, jakość 85%)
   - Generowana jest miniatura (400px)
   - Pliki uploadowane równolegle do Supabase Storage

3. **Zarządzanie zdjęciami:**
   - Usuwanie pojedynczego zdjęcia
   - Zmiana kolejności (przyciski ←/→)
   - Badge "Główne" na pierwszym zdjęciu

4. **Zapisanie oferty:**
   - URL głównego zdjęcia zapisywany w `offers.image_url`
   - Wszystkie zdjęcia zapisywane w tabeli `offer_images`

5. **Wyświetlanie:**
   - Na liście ofert: miniatura + badge z liczbą
   - W szczegółach: galeria z nawigacją

## Bezpieczeństwo

### RLS Policies (Row Level Security)

**Storage (`storage.objects`):**
1. **SELECT:** Wszyscy mogą czytać (publiczne zdjęcia)
2. **INSERT:** Tylko zalogowani do swojego folderu (`auth.uid()::text = foldername[1]`)
3. **DELETE:** Tylko właściciel może usuwać
4. **UPDATE:** Tylko właściciel może aktualizować

**Tabela `offer_images`:**
1. **SELECT:** Publiczny odczyt
2. **INSERT:** Tylko właściciel oferty
3. **DELETE:** Tylko właściciel oferty
4. **UPDATE:** Tylko właściciel oferty

### Walidacja
- **Frontend:** Format, rozmiar przed uploadem
- **Storage:** Bucket enforces mime types i file size limit
- **Backend API:** Walidacja Zod w endpointach

## Optymalizacje

### Kompresja
- Obrazy kompresowane do max 1920px
- Jakość JPEG: 85%
- Miniatury: 400px

### Lazy Loading
- `OfferImage` używa `loading="lazy"`

### Caching
- Storage URLs: cache-control: 3600s

## Troubleshooting

### Problem: "Upload failed: new row violates row-level security policy"
**Rozwiązanie:** Komponent `ImageUpload` musi ustawić sesję na kliencie Supabase przed uploadem. Upewnij się, że:
1. Token jest dostępny z `useAuth()`
2. `refresh_token` jest zapisany w localStorage
3. Wywołujesz `supabaseClient.auth.setSession()` przed uploadem

### Problem: "Upload failed: not authorized"
**Rozwiązanie:** Sprawdź czy użytkownik jest zalogowany i token jest ważny.

### Problem: "Image size exceeds limit"
**Rozwiązanie:** Plik jest większy niż 10MB. Użytkownik musi wybrać mniejszy plik.

### Problem: Zdjęcie nie wyświetla się
**Rozwiązanie:** Sprawdź:
1. Czy URL jest poprawny
2. Czy bucket jest publiczny
3. Czy plik istnieje w Storage
4. Console DevTools dla błędów CORS/network

## Pliki Źródłowe

### Backend/API
- `src/services/offer.service.ts` - metody serwisu
- `src/pages/api/offers/[offer_id]/images/index.ts` - GET/POST
- `src/pages/api/offers/[offer_id]/images/reorder.ts` - PUT
- `src/pages/api/offers/[offer_id]/images/[image_id].ts` - DELETE
- `src/schemas/offers.schema.ts` - schematy walidacji

### Frontend/Komponenty
- `src/components/ImageUpload.tsx` - komponent uploadu
- `src/components/ImagePlaceholder.tsx` - placeholder i OfferImage
- `src/components/OfferCard.tsx` - karta oferty z badge
- `src/components/OfferDetailPanel.tsx` - galeria w szczegółach
- `src/components/OfferDetailsPanel.tsx` - panel boczny
- `src/components/OfferForm.tsx` - formularz nowej oferty
- `src/components/OfferEditForm.tsx` - formularz edycji

### Typy i Utility
- `src/types.ts` - typy TypeScript
- `src/utils/image.ts` - kompresja i upload

### Migracje
- `supabase/migrations/20240101000007_storage_setup.sql` - Storage bucket
- `supabase/migrations/20240101000008_offer_images_table.sql` - tabela offer_images

## Zasoby

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Image Compression Best Practices](https://web.dev/fast/#optimize-your-images)
