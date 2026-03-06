-- ==========================================
-- TABLA DE REPORTES DE CARTAS NO ENCONTRADAS
-- ==========================================
-- Cuando el OCR detecta un código válido (formato correcto)
-- pero la carta no existe en nuestra tabla `cards`,
-- el usuario puede reportarlo para que lo revisemos.

create table if not exists public.card_reports (
  id uuid default gen_random_uuid() primary key,
  
  -- Qué código se intentó escanear
  card_code text not null,
  
  -- Quién lo reportó
  user_id uuid references public.profiles(id),
  
  -- Contexto
  is_alt_art boolean default false,    -- Si estaba en modo AA
  source text default 'scanner',       -- 'scanner' o 'manual'
  
  -- Estado del reporte
  status text default 'pending',       -- 'pending', 'resolved', 'dismissed'
  resolved_at timestamp with time zone,
  admin_notes text,
  
  created_at timestamp with time zone default now()
);

-- Índice para buscar reportes por código (ver si ya existe)
create index if not exists idx_card_reports_code on public.card_reports(card_code);

-- Índice para el admin panel (ver pendientes)
create index if not exists idx_card_reports_status on public.card_reports(status);

-- RLS: usuarios pueden insertar y ver sus propios reportes
alter table public.card_reports enable row level security;

create policy "Users can insert reports"
  on public.card_reports for insert
  with check (auth.uid() = user_id);

create policy "Users can view own reports"
  on public.card_reports for select
  using (auth.uid() = user_id);

-- Admins pueden ver y actualizar todos (requiere role check)
-- create policy "Admins can manage all reports"
--   on public.card_reports for all
--   using (
--     exists (
--       select 1 from public.profiles
--       where id = auth.uid() and subscription_tier = 'admin'
--     )
--   );