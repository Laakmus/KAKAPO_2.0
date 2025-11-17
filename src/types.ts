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

/* ============================
   Users DTOs / Commands
   (User row lives in `auth.users`. We model the API-facing shapes and indicate
    where server maps them to/from DB rows.)
   ============================ */

export type UserProfileDTO = {
  id: string;
  first_name: string;
  last_name: string;
  created_at?: string;
};

export type UpdateUserCommand = Pick<UserProfileDTO, 'first_name' | 'last_name'>;

export type DeleteAccountCommand = {
  password: string;
};

export type PublicUserDTO = {
  id: string;
  first_name: string;
  last_name: string;
  active_offers_count: number;
};

/* ============================
   Offers DTOs / Commands
   Mapping: uses `public.offers` table types.
   - `Tables<'offers'>` resolves to the row shape for offers.
   - `TablesInsert<'offers'>` is used for creation command types.
   ============================ */

export type OfferRow = Tables<'offers'>;
export type OfferInsert = TablesInsert<'offers'>;
export type OfferUpdate = TablesUpdate<'offers'>;

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
};

export type OfferDetailDTO = OfferRow & {
  owner_name?: string;
  interests_count: number;
  is_interested?: boolean; // computed per-request (whether current user expressed interest)
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
};

export type ChatDetailDTO = ChatRow & {
  user_a: { id: string; name: string };
  user_b: { id: string; name: string };
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
