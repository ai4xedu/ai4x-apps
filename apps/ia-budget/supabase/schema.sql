-- Relevé IA — schéma Supabase (V2 : compte + synchronisation multi-appareils)
--
-- Principe de confidentialité : seuls les AGRÉGATS mensuels quittent le
-- navigateur. Aucun contenu de conversation, aucun titre, aucun texte.
-- Le MVP fonctionne sans Supabase (localStorage) ; ce schéma prépare la
-- synchronisation optionnelle et l'e-mail mensuel de rappel.

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  monthly_budget_eur numeric not null default 30,
  theme_names jsonb not null default '{}'::jsonb,
  reminder_email_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists monthly_reports (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null, -- "2026-07"
  cost_eur numeric not null,
  input_tokens bigint not null,
  output_tokens bigint not null,
  conversations integer not null,
  messages integer not null,
  themes jsonb not null,          -- [{themeId, costEur, conversations, tokens}]
  providers jsonb not null,       -- [{provider, costEur, conversations, tokens}]
  recommendations jsonb not null, -- sorties du moteur local (texte + économie)
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table profiles enable row level security;

alter table monthly_reports enable row level security;

create policy "own profile" on profiles for all using (auth.uid () = id)
with
  check (auth.uid () = id);

create policy "own reports" on monthly_reports for all using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

-- File d'attente du rappel mensuel ("votre bilan vous attend") — traitée par
-- une Edge Function planifiée le 1er de chaque mois.
create table if not exists reminder_log (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null,
  sent_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table reminder_log enable row level security;

create policy "own reminders" on reminder_log for
select
  using (auth.uid () = user_id);
