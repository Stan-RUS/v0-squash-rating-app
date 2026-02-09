-- Squash Club Rating System - Database Schema

-- 1. Players table (linked to auth.users)
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  bio text,
  rating integer not null default 1500,
  matches_count integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  calibration_matches_count integer not null default 0,
  last_match_at timestamptz,
  status_active text not null default 'active' check (status_active in ('active', 'na')),
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now()
);

create unique index if not exists players_user_id_idx on public.players(user_id);
create index if not exists players_rating_idx on public.players(rating desc);
create index if not exists players_name_idx on public.players(name);

-- 2. Matches table
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references public.players(id),
  player_b_id uuid not null references public.players(id),
  created_by_player_id uuid not null references public.players(id),
  match_type text not null default 'friendly' check (match_type in ('friendly', 'ladder', 'league', 'tournament_group', 'tournament_playoffs', 'final')),
  format text not null default 'bo3' check (format in ('bo3')),
  score_a_games integer not null,
  score_b_games integer not null,
  games_details jsonb,
  played_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected', 'disputed', 'voided')),
  confirm_deadline_at timestamptz,
  rating_a_at_time integer,
  rating_b_at_time integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_not_self check (player_a_id != player_b_id),
  constraint matches_bo3_score check (
    (score_a_games = 2 and score_b_games in (0, 1)) or
    (score_b_games = 2 and score_a_games in (0, 1))
  )
);

create index if not exists matches_player_a_idx on public.matches(player_a_id);
create index if not exists matches_player_b_idx on public.matches(player_b_id);
create index if not exists matches_status_idx on public.matches(status);
create index if not exists matches_played_at_idx on public.matches(played_at desc);

-- 3. Match confirmations table
create table if not exists public.match_confirmations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  responder_player_id uuid not null references public.players(id),
  action text not null check (action in ('confirm', 'reject', 'dispute')),
  comment text,
  proposed_score_a integer,
  proposed_score_b integer,
  proposed_games_details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists match_confirmations_match_idx on public.match_confirmations(match_id);

-- 4. Rating history table
create table if not exists public.rating_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  rating_before integer not null,
  rating_after integer not null,
  delta integer not null,
  created_at timestamptz not null default now()
);

create index if not exists rating_history_player_idx on public.rating_history(player_id);
create index if not exists rating_history_match_idx on public.rating_history(match_id);
create index if not exists rating_history_created_idx on public.rating_history(created_at desc);

-- 5. Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('match_pending', 'match_confirmed', 'match_rejected', 'match_disputed', 'dispute_resolved', 'reminder_pending')),
  title text not null,
  body text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, read);

-- 6. Audit log table
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_entity_idx on public.audit_log(entity_type, entity_id);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);

-- 7. Rating settings table (singleton row for admin config)
create table if not exists public.rating_settings (
  id integer primary key default 1 check (id = 1),
  starting_rating integer not null default 1500,
  k_calibration integer not null default 40,
  k_normal integer not null default 24,
  k_veteran integer not null default 16,
  calibration_matches integer not null default 10,
  veteran_matches integer not null default 50,
  veteran_rating integer not null default 1800,
  weight_friendly numeric(3,1) not null default 1.0,
  weight_ladder numeric(3,1) not null default 1.1,
  weight_league numeric(3,1) not null default 1.2,
  weight_tournament_group numeric(3,1) not null default 1.3,
  weight_tournament_playoffs numeric(3,1) not null default 1.5,
  weight_final numeric(3,1) not null default 1.7,
  anti_boost_threshold integer not null default 250,
  anti_boost_strong_wins numeric(3,1) not null default 0.6,
  anti_boost_strong_loses numeric(3,1) not null default 1.3,
  inactivity_days integer not null default 45,
  return_k_multiplier numeric(3,2) not null default 1.20,
  return_matches integer not null default 5,
  max_match_age_days integer not null default 7,
  anti_duplicate_hours integer not null default 6,
  pending_expiry_days integer not null default 14,
  updated_at timestamptz not null default now()
);

-- Insert default settings
insert into public.rating_settings (id) values (1) on conflict (id) do nothing;

-- ========================
-- Row Level Security
-- ========================

-- Players RLS
alter table public.players enable row level security;

create policy "players_select_all" on public.players
  for select using (true);

create policy "players_insert_own" on public.players
  for insert with check (auth.uid() = user_id);

create policy "players_update_own" on public.players
  for update using (
    auth.uid() = user_id
    or exists (select 1 from public.players p where p.user_id = auth.uid() and p.role = 'admin')
  );

-- Matches RLS
alter table public.matches enable row level security;

create policy "matches_select_all" on public.matches
  for select using (true);

create policy "matches_insert_player" on public.matches
  for insert with check (
    exists (select 1 from public.players p where p.id = created_by_player_id and p.user_id = auth.uid())
  );

create policy "matches_update_involved" on public.matches
  for update using (
    exists (
      select 1 from public.players p
      where p.user_id = auth.uid()
      and (p.id = player_a_id or p.id = player_b_id or p.role = 'admin')
    )
  );

-- Match confirmations RLS
alter table public.match_confirmations enable row level security;

create policy "confirmations_select_all" on public.match_confirmations
  for select using (true);

create policy "confirmations_insert_responder" on public.match_confirmations
  for insert with check (
    exists (select 1 from public.players p where p.id = responder_player_id and p.user_id = auth.uid())
  );

-- Rating history RLS
alter table public.rating_history enable row level security;

create policy "rating_history_select_all" on public.rating_history
  for select using (true);

create policy "rating_history_insert_system" on public.rating_history
  for insert with check (
    exists (select 1 from public.players p where p.user_id = auth.uid())
  );

-- Notifications RLS
alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

create policy "notifications_insert_any" on public.notifications
  for insert with check (
    exists (select 1 from public.players p where p.user_id = auth.uid())
  );

-- Audit log RLS
alter table public.audit_log enable row level security;

create policy "audit_select_admin" on public.audit_log
  for select using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.role = 'admin')
  );

create policy "audit_insert_any" on public.audit_log
  for insert with check (
    exists (select 1 from public.players p where p.user_id = auth.uid())
  );

-- Rating settings RLS
alter table public.rating_settings enable row level security;

create policy "settings_select_all" on public.rating_settings
  for select using (true);

create policy "settings_update_admin" on public.rating_settings
  for update using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.role = 'admin')
  );

-- ========================
-- Trigger: auto-create player on signup
-- ========================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.players (user_id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ========================
-- Trigger: auto-update updated_at on matches
-- ========================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists matches_updated_at on public.matches;

create trigger matches_updated_at
  before update on public.matches
  for each row
  execute function public.update_updated_at();
