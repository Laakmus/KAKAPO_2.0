import type { Tables, TablesInsert, TablesUpdate } from './db/database.types';

// Generic pagination types used across list endpoints
export type PaginationParams = {
  page?: number;
  limit?: number;
};

export type Paginated<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

/* ============================
   Auth DTOs / Commands
   (Note: `auth.users` table is external to `public` schema in database.types.
    Commands here are intentionally aligned with API request shapes; responses
    include minimal user info returned by Supabase Auth.)
   ============================ */

export type RegisterUserCommand = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type LoginUserCommand = {
  email: string;
  password: string;
};

export type AuthTokensResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
  };
};

export type SignupResponseDTO = {
  user: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
  };
  message: string;
};

export type RegistrationFormValues = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type LoginFormValues = {
  email: string;
  password: string;
};

/* ============================
   Users DTOs / Commands
   (User row lives in `auth.users`. We model the API-facing shapes and indicate
    where server maps them to/from DB rows.)
   ============================ */

export type UserProfileDTO = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  active_offers_count: number;
};

export type UpdateUserCommand = Pick<UserProfileDTO, 'first_name' | 'last_name'>;

export type ProfileEditPayload = UpdateUserCommand;

export type DeleteAccountCommand = {
  password: string;
};

export type ProfilePageState = {
  profile: UserProfileDTO | null;
  isEditing: boolean;
  isDeleting: boolean;
  deleteDialogOpen: boolean;
  notification?: NotificationMessage;
  isLoading: boolean;
  error?: string;
};

export type ProfileStatsViewModel = {
  email: string;
  formattedCreatedAt: string;
  activeOffersCount: number;
};

export type PublicUserDTO = {
  id: string;
  first_name: string;
  last_name: string;
  active_offers_count: number;
};

// DTO dla oferty użytkownika (widok profilu innego użytkownika)
export type UserOfferDTO = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  city: string;
  created_at: string;
};

// Response dla listy ofert użytkownika
export type UserOffersResponse = {
  data: UserOfferDTO[];
};

// Stan widoku profilu użytkownika
export interface UserProfileState {
  profile: PublicUserDTO | null;
  offers: UserOfferDTO[];
  isLoadingProfile: boolean;
  isLoadingOffers: boolean;
  profileError: ApiError | null;
  offersError: ApiError | null;
}

// Błąd API z kodem i szczegółami
export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

/* ============================
   Offers DTOs / Commands
   Mapping: uses `public.offers` table types.
   - `Tables<'offers'>` resolves to the row shape for offers.
   - `TablesInsert<'offers'>` is used for creation command types.
   ============================ */

export type OfferRow = Tables<'offers'>;
export type OfferInsert = TablesInsert<'offers'>;
export type OfferUpdate = TablesUpdate<'offers'>;

// Offer images types
export type OfferImageRow = Tables<'offer_images'>;
export type OfferImageInsert = TablesInsert<'offer_images'>;
export type OfferImageUpdate = TablesUpdate<'offer_images'>;

/**
 * DTO for a single offer image
 */
export type OfferImageDTO = {
  id: string;
  offer_id: string;
  image_url: string;
  thumbnail_url: string | null;
  order_index: number;
  created_at: string | null;
};

/**
 * Command for adding images to an offer
 */
export type AddOfferImagesCommand = {
  images: Array<{
    image_url: string;
    thumbnail_url?: string | null;
    order_index: number;
  }>;
};

/**
 * Command for reordering images
 */
export type ReorderImagesCommand = {
  images: Array<{
    id: string;
    order_index: number;
  }>;
};

// Query params for listing offers
export type OffersListQuery = PaginationParams & {
  city?: string;
  sort?: 'created_at' | 'title';
  order?: 'asc' | 'desc';
};

// Item returned in listings (augmented with computed fields)
export type OfferListItemDTO = Pick<
  OfferRow,
  'id' | 'title' | 'description' | 'image_url' | 'city' | 'status' | 'created_at' | 'owner_id'
> & {
  owner_name?: string; // computed from `auth.users`
  interests_count: number;
  images_count?: number; // number of images for this offer
  thumbnail_url?: string | null; // thumbnail of main image for list views
};

export type OfferDetailDTO = OfferRow & {
  owner_name?: string;
  interests_count: number;
  is_interested?: boolean; // computed per-request (whether current user expressed interest)
  is_owner?: boolean; // computed per-request (whether current user is the owner)
  current_user_interest_id?: string; // ID of current user's interest record (for cancellation)
  images?: OfferImageDTO[]; // array of offer images (sorted by order_index)
  images_count?: number; // total number of images
};

// ViewModel types for Home/Offers list view
export type OfferListItemViewModel = OfferListItemDTO & {
  isOwnOffer: boolean;
  images_count?: number; // number of images for badge display
  thumbnail_url?: string | null; // thumbnail for list views
};

// ViewModel for offer detail page - enriched with UI-specific computed fields
export type OfferDetailViewModel = OfferDetailDTO & {
  statusLabel: string; // Human-readable status label
  formattedDate: string; // Formatted created_at date
  images?: OfferImageDTO[]; // array of offer images for gallery
  images_count?: number; // total number of images
};

export type OffersPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type OffersListResponseViewModel = {
  items: OfferListItemViewModel[];
  pagination: OffersPaginationMeta;
};

export type HomeFilterState = {
  city?: string;
  sort: 'created_at' | 'title';
  order: 'desc' | 'asc';
};

export type ApiErrorViewModel = ApiErrorResponse & {
  status: number;
};

// Commands for create/update offer - reuse DB Insert/Update shapes, but narrow to allowed fields
export type CreateOfferCommand = Pick<OfferInsert, 'title' | 'description' | 'image_url' | 'city'>;

// Partial allows updating only provided fields; owner_id not allowed to change via API
export type UpdateOfferCommand = Partial<Pick<OfferUpdate, 'title' | 'description' | 'image_url' | 'city' | 'status'>>;

// Responses for create/update offer include the created/updated offer and optional message
export type CreateOfferResponse = OfferDetailDTO & { message?: string };
export type UpdateOfferResponse = OfferDetailDTO & { message?: string; updated_at?: string };

/* ============================
   Interests DTOs / Commands
   Mapping: uses `public.interests` table types.
   - `Tables<'interests'>` is the persisted row representation.
   - API create accepts only `offer_id` (user_id is derived from auth context).
   ============================ */

export type InterestRow = Tables<'interests'>;
export type InterestInsert = TablesInsert<'interests'>;
export type InterestUpdate = TablesUpdate<'interests'>;

export type InterestListItemDTO = Pick<InterestRow, 'id' | 'offer_id' | 'user_id' | 'status' | 'created_at'> & {
  user_name?: string; // computed from `auth.users`
};

export type MyInterestDTO = InterestListItemDTO & {
  offer_title?: string;
  offer_owner?: string;
};

export type CreateInterestCommand = {
  // API requires only offer_id; server attaches auth.uid() => user_id when inserting InterestInsert
  offer_id: string;
};

export type CancelInterestCommand = {
  // No body required; path param interest_id identifies the record.
};

export type RealizeInterestCommand = {};
export type UnrealizeInterestCommand = {};
// Response when creating an interest; on mutual match `chat_id` may be present.
export type CreateInterestResponse = InterestListItemDTO & {
  message?: string;
  chat_id?: string | null;
};

// Types for Interest Toggle (Detail View)
export type InterestActionPayload = {
  offerId: string;
  interestId?: string;
  isInterested: boolean;
};

export type InterestActionState = {
  mutating: boolean;
  error?: string;
  successMessage?: string;
};

// Response when realizing an interest (single-party or final)
export type RealizeInterestResponse = InterestListItemDTO & {
  message?: string;
  realized_at?: string | null;
};

/* ============================
   Chats DTOs / Commands
   Mapping: uses `public.chats` table types.
   ============================ */

export type ChatRow = Tables<'chats'>;
export type ChatListItemDTO = Pick<ChatRow, 'id' | 'status' | 'created_at'> & {
  other_user: {
    id: string;
    name: string;
  };
  last_message?: {
    body: string;
    sender_id: string;
    created_at: string;
  } | null;
  unread_count?: number;
  /**
   * Read-only czat (np. gdy oferta powiązana z czatem została usunięta).
   */
  is_locked?: boolean;
};

export type ChatDetailDTO = Omit<ChatRow, 'user_a' | 'user_b'> & {
  user_a: { id: string; name: string };
  user_b: { id: string; name: string };
};

/**
 * ViewModel dla szczegółowego widoku czatu
 * Zawiera informacje o czacie, uczestnikach, statusach interesów i powiązanych ofertach
 */
export type ChatDetailsViewModel = {
  id: string;
  status: string;
  created_at: string;
  interest_id: string;
  other_interest_id?: string;
  current_user_id: string;
  current_interest_status: 'PROPOSED' | 'ACCEPTED' | 'REALIZED';
  other_interest_status?: 'PROPOSED' | 'ACCEPTED' | 'REALIZED';
  other_user: {
    id: string;
    name: string;
  };
  related_offers?: {
    my: OfferSummary;
    their: OfferSummary;
  };
  realized_at?: string | null;
  /**
   * Read-only czat (np. gdy oferta powiązana z czatem została usunięta).
   */
  is_locked?: boolean;
};

/**
 * ViewModel dla pojedynczej wiadomości z oznaczeniem własności
 */
export type MessageViewModel = MessageDTO & {
  isOwn: boolean;
};

/**
 * Response API dla listy wiadomości z paginacją
 */
export type ChatMessagesApiResponse = Paginated<MessageViewModel>;

/**
 * Podsumowanie oferty (ID + tytuł)
 */
export type OfferSummary = {
  id: string;
  title: string;
};

/**
 * Stan dotyczący realizacji wymiany (dla ChatStatusControls)
 */
export type InterestRealizationState = {
  can_realize: boolean;
  can_unrealize: boolean;
  other_confirmed: boolean;
  status: 'PROPOSED' | 'ACCEPTED' | 'REALIZED' | string;
  message?: string;
};

/**
 * Szczegółowy błąd API z dodatkowymi polami
 */
export type ApiErrorInfo = {
  code: string;
  message: string;
  field?: string;
};

/**
 * Wartości formularza wysyłania wiadomości
 */
export type SendMessageFormValues = {
  body: string;
};

/* ============================
   Chats View ViewModels
   (Typy dla widoku listy czatów /chats)
   ============================ */

/**
 * ViewModel dla elementu listy czatów (lewa kolumna)
 * Rozszerzenie ChatListItemDTO o pola obliczeniowe dla UI
 */
export type ChatSummaryViewModel = ChatListItemDTO & {
  formattedLastMessageAt: string; // Sformatowana data ostatniej wiadomości
  interestId?: string; // ID zainteresowania powiązanego z czatem
};

/**
 * ViewModel dla szczegółów czatu (prawa kolumna - nagłówek i kontekst)
 * Używany dla wyświetlenia informacji o uczestnikach i kontekście ofert
 */
export type ChatDetailViewModel = {
  chatId: string;
  status: string;
  created_at: string;
  /**
   * Read-only czat (np. gdy oferta powiązana z czatem została usunięta).
   */
  is_locked?: boolean;
  participants: {
    me: { id: string; name: string };
    other: { id: string; name: string };
  };
  offerContext?: {
    myOfferId: string;
    myOfferTitle: string;
    theirOfferId: string;
    theirOfferTitle: string;
  };
  interestId?: string;
  realizationStatus: 'ACCEPTED' | 'REALIZED' | 'PROPOSED';
};

/**
 * ViewModel dla pojedynczej wiadomości w widoku czatu
 * Rozszerzenie MessageViewModel o pola obliczeniowe
 */
export type ChatMessageViewModel = MessageViewModel & {
  formattedTime: string; // Sformatowany czas utworzenia (np. "12:34" lub "wczoraj")
};

/**
 * Kontekst akcji realizacji wymiany
 * Używany przez ChatActionsPane do wyświetlenia przycisków realizacji
 */
export type InterestActionContext = {
  interestId: string;
  otherUserName: string;
  offerTitle: string;
  realizationStatus: 'PROPOSED' | 'ACCEPTED' | 'REALIZED';
};

/**
 * Główny stan widoku czatów
 * Używany przez hook useChatsViewState
 */
export type ChatsViewState = {
  // Lista czatów
  chats: ChatSummaryViewModel[];
  isLoadingChats: boolean;
  chatsError?: ApiErrorViewModel;

  // Wybrany czat
  selectedChatId?: string;
  selectedChat?: ChatDetailViewModel;

  // Wiadomości wybranego czatu
  messages: ChatMessageViewModel[];
  isLoadingMessages: boolean;
  messagesError?: ApiErrorViewModel;

  // Kontekst akcji realizacji
  interestContext?: InterestActionContext;

  // Stany akcji (wysyłanie wiadomości, realizacja)
  isSending: boolean;
  isRealizing: boolean;
  isUnrealizing: boolean;

  // Błędy
  actionError?: ApiErrorViewModel;
};

/* ============================
   Messages DTOs / Commands
   Mapping: uses `public.messages` table types.
   - CreateMessageCommand uses DB Insert shape except chat_id and sender_id are derived (path + auth)
   ============================ */

export type MessageRow = Tables<'messages'>;
export type MessageInsert = TablesInsert<'messages'>;

export type MessageDTO = Pick<MessageRow, 'id' | 'chat_id' | 'sender_id' | 'body' | 'created_at'> & {
  sender_name?: string; // computed from `auth.users`
};

export type CreateMessageCommand = {
  body: string;
};

/* ============================
   Exchange History DTOs
   Mapping: uses `public.exchange_history` table types.
   API returns enriched records (copies of titles + other user info).
   ============================ */

export type ExchangeHistoryRow = Tables<'exchange_history'>;

export type ExchangeHistoryItemDTO = Pick<
  ExchangeHistoryRow,
  | 'id'
  | 'realized_at'
  | 'offer_a_id'
  | 'offer_a_title'
  | 'offer_b_id'
  | 'offer_b_title'
  | 'user_a'
  | 'user_b'
  | 'chat_id'
> & {
  other_user: {
    id: string;
    name: string;
  };
  my_offer: { id: string; title: string };
  their_offer: { id: string; title: string };
};

/* ============================
   Common API error envelope
   ============================ */
export type ApiErrorDetail = {
  field?: string;
  value?: unknown;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail;
  };
};

export type ApiFieldError = {
  field?: string;
  value?: unknown;
  message: string;
};

export type NotificationType = 'success' | 'error';

export type NotificationMessage = {
  type: NotificationType;
  text: string;
};

export type LoginNotificationMessage = NotificationMessage & {
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
};

export type UseSignupState = {
  isLoading: boolean;
  notification?: NotificationMessage;
};

export type UseLoginState = {
  isLoading: boolean;
  notification?: LoginNotificationMessage;
};

/* ============================
   Notes on type strategy
   - Where possible we reuse DB types via `Tables`, `TablesInsert`, `TablesUpdate`.
   - Commands that accept only partial/derived input (e.g. CreateInterestCommand,
     CreateMessageCommand) intentionally pick a minimal subset of the DB Insert
     shape because server populates auth-derived fields (user_id, sender_id).
  - Response DTOs frequently augment DB rows with computed fields (owner_name,
    interests_count, is_interested) which are not stored on the row but are
    derived by queries or server logic.
  ============================ */
