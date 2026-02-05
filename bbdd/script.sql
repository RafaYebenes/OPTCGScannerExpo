-- ==========================================
-- 1. ENUMS (Tipos de datos personalizados)
-- ==========================================
create type user_tier as enum ('free', 'pro', 'admin');
create type card_condition as enum ('Mint', 'Near Mint', 'Excellent', 'Good', 'Light Played', 'Played', 'Poor');

-- ==========================================
-- 2. PERFILES (Usuarios)
-- ==========================================
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  
  -- NUEVO: Nivel de suscripción
  subscription_tier user_tier default 'free',
  subscription_status text default 'active', -- 'active', 'canceled', 'past_due'
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  constraint username_length check (char_length(username) >= 3)
);

-- ==========================================
-- 3. EXPANSIONES (Sets)
-- ==========================================
create table public.sets (
  code text primary key, -- 'OP01'
  name text not null,    -- 'Romance Dawn'
  release_date date,
  icon_url text
);

-- ==========================================
-- 4. CATÁLOGO DE CARTAS (Card List)
-- ==========================================
create table public.cards (
  id uuid default gen_random_uuid() primary key,
  
  code text not null,           -- 'OP01-001' (Se repite en variantes)
  set_code text references public.sets(code),
  
  name text not null,           -- 'Roronoa Zoro'
  color text,                   -- 'Red'
  type text,                    -- 'Leader', 'Character'
  rarity text,                  -- 'L', 'SR', 'SEC'
  attribute text,               -- 'Slash', 'Strike'
  power integer,
  counter integer,
  
  -- VARIANTES (Importante para coleccionistas)
  variant text default 'Normal', -- 'Normal', 'Parallel', 'Manga', 'Winner Promo'
  image_url text,               
  
  -- PRECIOS (Se actualizan externamente)
  market_price_eur numeric default 0,
  market_price_usd numeric default 0,
  
  updated_at timestamp with time zone default now()
);

-- Índice para buscar rápido por el código que lee el OCR
create index idx_cards_code on public.cards(code);

-- ==========================================
-- 5. COLECCIÓN DEL USUARIO
-- ==========================================
create table public.user_collection (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  card_id uuid references public.cards(id) not null,
  
  quantity integer default 1,
  
  -- Estado de la carta física
  condition card_condition default 'Near Mint',
  language text default 'English', -- 'English', 'Japanese'
  
  is_foil boolean default false,
  is_graded boolean default false, -- Si es una carta gradeada (PSA/BGS)
  grading_company text,            -- 'PSA', 'BGS'
  grading_score numeric,           -- 10, 9.5
  
  purchase_price numeric,          -- Para calcular ganancias/pérdidas (Función PRO)
  
  scanned_at timestamp with time zone default now(),
  notes text
);

-- ==========================================
-- 6. SEGURIDAD (RLS)
-- ==========================================

-- Habilitar seguridad en todas las tablas
alter table public.profiles enable row level security;
alter table public.sets enable row level security;
alter table public.cards enable row level security;
alter table public.user_collection enable row level security;

-- POLÍTICAS

-- Profiles: Cada uno ve y edita el suyo. Todos pueden ver perfiles básicos (para social).
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Sets y Cards: Todo el mundo puede leer (Catálogo Público)
create policy "Public read access to sets" on public.sets for select using (true);
create policy "Public read access to cards" on public.cards for select using (true);

-- Collection: Solo el dueño toca sus cartas
create policy "Users can view own collection" on public.user_collection
  for select using (auth.uid() = user_id);
create policy "Users can insert own collection" on public.user_collection
  for insert with check (auth.uid() = user_id);
create policy "Users can update own collection" on public.user_collection
  for update using (auth.uid() = user_id);
create policy "Users can delete own collection" on public.user_collection
  for delete using (auth.uid() = user_id);

-- ==========================================
-- 7. TRIGGER AUTOMÁTICO (Crear Perfil)
-- ==========================================
-- Esto crea una entrada en 'profiles' automáticamente cuando alguien se registra
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, subscription_tier)
  values (new.id, new.raw_user_meta_data->>'username', 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();