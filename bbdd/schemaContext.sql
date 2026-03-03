-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  set_code text,
  name text NOT NULL,
  color text,
  type text,
  rarity text,
  attribute text,
  power integer,
  counter integer,
  variant text DEFAULT 'Normal'::text,
  image_url text,
  market_price_eur numeric DEFAULT 0,
  market_price_usd numeric DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  cost text,
  effect text,
  feature text,
  CONSTRAINT cards_pkey PRIMARY KEY (id),
  CONSTRAINT cards_set_code_fkey FOREIGN KEY (set_code) REFERENCES public.sets(code)
);
CREATE TABLE public.deck_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL,
  card_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 4),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT deck_cards_pkey PRIMARY KEY (id),
  CONSTRAINT deck_cards_deck_id_fkey FOREIGN KEY (deck_id) REFERENCES public.decks(id),
  CONSTRAINT deck_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id)
);
CREATE TABLE public.decks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'Nuevo mazo'::text,
  leader_card_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT decks_pkey PRIMARY KEY (id),
  CONSTRAINT decks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT decks_leader_card_id_fkey FOREIGN KEY (leader_card_id) REFERENCES public.cards(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE CHECK (char_length(username) >= 3),
  avatar_url text,
  subscription_tier USER-DEFINED DEFAULT 'free'::user_tier,
  subscription_status text DEFAULT 'active'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.sets (
  code text NOT NULL,
  name text NOT NULL,
  release_date date,
  icon_url text,
  CONSTRAINT sets_pkey PRIMARY KEY (code)
);
CREATE TABLE public.user_collection (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  card_id uuid NOT NULL,
  quantity integer DEFAULT 1,
  condition USER-DEFINED DEFAULT 'Near Mint'::card_condition,
  language text DEFAULT 'English'::text,
  is_foil boolean DEFAULT false,
  is_graded boolean DEFAULT false,
  grading_company text,
  grading_score numeric,
  purchase_price numeric,
  scanned_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT user_collection_pkey PRIMARY KEY (id),
  CONSTRAINT user_collection_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT user_collection_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.cards(id)
);