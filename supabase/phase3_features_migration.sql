-- =============================================================================
-- FITORA — Migration Phase 3 : parrainage, géolocalisation, réseaux sociaux,
--                                présence client
-- =============================================================================
-- À exécuter dans l'éditeur SQL Supabase, APRÈS schema.sql + migration.sql.
-- Conçue pour être rejouée sans risque (create if not exists / or replace
-- partout où c'est possible). N'affecte aucune donnée existante, ne supprime
-- aucune table/colonne, ne modifie aucune policy existante.
--
-- Contenu :
--   0. Éléments en attente des étapes précédentes (notifications, Storage)
--   1. profiles      : code de parrainage, parrain, dernière activité connue
--   2. customer_locations : position GPS avec consentement explicite
--   3. shop_settings : liens réseaux sociaux + règles de récompense parrainage
--   4. affiliate_rewards : traçabilité des récompenses attribuées
--   5. Trigger d'attribution automatique de récompense (sécurisé, non
--      contournable côté client)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0a. Notifications — autorise un client à supprimer SES notifications
--     ciblées uniquement (jamais les diffusions générales). Additif : ne
--     modifie ni ne supprime aucune policy existante.
-- -----------------------------------------------------------------------------
drop policy if exists "Un client supprime ses notifications personnelles" on notifications;
create policy "Un client supprime ses notifications personnelles"
  on notifications for delete
  using (scope = 'customer' and customer_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 0b. Supabase Storage — bucket public pour les visuels de la boutique
--     (image hero, etc.), lecture publique / écriture admin uniquement.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('shop-assets', 'shop-assets', true)
on conflict (id) do nothing;

drop policy if exists "Lecture publique des visuels boutique" on storage.objects;
create policy "Lecture publique des visuels boutique"
  on storage.objects for select
  using (bucket_id = 'shop-assets');

drop policy if exists "Admin gère les visuels boutique" on storage.objects;
create policy "Admin gère les visuels boutique"
  on storage.objects for all
  using (bucket_id = 'shop-assets' and is_admin())
  with check (bucket_id = 'shop-assets' and is_admin());

-- -----------------------------------------------------------------------------
-- 0c. Realtime — nécessaire pour la synchro instantanée de l'image hero.
--     Décommentez la ligne suivante pour l'activer (une fois suffit) :
-- -----------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.shop_settings;


-- -----------------------------------------------------------------------------
-- 1. profiles — parrainage + présence
-- -----------------------------------------------------------------------------

alter table profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references profiles (id) on delete set null,
  add column if not exists last_seen_at timestamptz;

-- Empêche un client de se parrainer lui-même au niveau base de données
-- (garde-fou supplémentaire, en plus du contrôle applicatif).
alter table profiles
  drop constraint if exists profiles_no_self_referral;
alter table profiles
  add constraint profiles_no_self_referral check (referred_by is null or referred_by <> id);

create or replace function generate_referral_code()
returns text as $$
declare
  candidate text;
  exists_already boolean;
begin
  loop
    -- 8 caractères alphanumériques majuscules, lisibles à l'oral/au clavier.
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    select exists(select 1 from profiles where referral_code = candidate) into exists_already;
    exit when not exists_already;
  end loop;
  return candidate;
end;
$$ language plpgsql volatile;

-- Backfill : les comptes déjà créés avant cette migration n'ont pas de code.
update profiles set referral_code = generate_referral_code() where referral_code is null;

-- Étend la création automatique de profil (déjà en place) pour générer un
-- code de parrainage et attribuer le parrain si un code valide a été transmis
-- à l'inscription (voir authService.signUp -> options.data.referral_code).
create or replace function handle_new_user()
returns trigger as $$
declare
  v_referrer_id uuid;
  v_submitted_code text;
begin
  v_submitted_code := nullif(trim(new.raw_user_meta_data ->> 'referral_code'), '');

  if v_submitted_code is not null then
    select id into v_referrer_id
    from profiles
    where referral_code = upper(v_submitted_code)
    limit 1;
  end if;

  insert into public.profiles (id, first_name, last_name, email, phone, role, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'customer',
    generate_referral_code(),
    -- Un code invalide/inconnu est simplement ignoré (pas de parrain), on
    -- ne bloque jamais l'inscription pour ça. v_referrer_id est déjà distinct
    -- de new.id à ce stade puisque new.id n'existe pas encore dans profiles.
    v_referrer_id
  );
  return new;
end;
$$ language plpgsql security definer;

-- Protège referral_code / referred_by contre toute modification directe par
-- le client via la policy "modifie son propre profil" (qui n'a pas de
-- clause WITH CHECK). Sans ce trigger, un client pourrait s'auto-attribuer
-- un parrain après coup ou changer son propre code. Force aussi
-- last_seen_at à l'heure serveur réelle plutôt que la valeur envoyée par le
-- client (utilisé pour le "ping" de présence, voir plus bas).
create or replace function protect_profile_sensitive_fields()
returns trigger as $$
begin
  if not is_admin() then
    if new.referral_code is distinct from old.referral_code then
      new.referral_code := old.referral_code;
    end if;
    if new.referred_by is distinct from old.referred_by then
      new.referred_by := old.referred_by;
    end if;
  end if;

  if new.last_seen_at is distinct from old.last_seen_at then
    new.last_seen_at := now();
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_protect_sensitive_fields on profiles;
create trigger profiles_protect_sensitive_fields
  before update on profiles
  for each row execute procedure protect_profile_sensitive_fields();


-- -----------------------------------------------------------------------------
-- 2. customer_locations — position GPS, uniquement avec consentement explicite
-- -----------------------------------------------------------------------------
-- Table séparée de "profiles" (plutôt que des colonnes en plus) pour garder
-- une frontière nette : seule cette table contient des coordonnées GPS
-- précises, ce qui simplifie l'audit de sécurité et évite qu'une requête
-- anodine sur "profiles" ne remonte accidentellement une position.

create table if not exists customer_locations (
  customer_id uuid primary key references profiles (id) on delete cascade,
  consent boolean not null default false,
  latitude double precision,
  longitude double precision,
  accuracy_meters numeric,
  updated_at timestamptz not null default now()
);

alter table customer_locations enable row level security;

-- Retire les coordonnées dès que le consentement est retiré, et force le
-- timestamp serveur (jamais une valeur envoyée par le client) : évite qu'un
-- client ne puisse falsifier "la dernière mise à jour" ou laisser une
-- position périmée visible après avoir retiré son accord.
create or replace function guard_customer_location()
returns trigger as $$
begin
  if new.consent is false then
    new.latitude := null;
    new.longitude := null;
    new.accuracy_meters := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists customer_locations_guard on customer_locations;
create trigger customer_locations_guard
  before insert or update on customer_locations
  for each row execute procedure guard_customer_location();

drop policy if exists "Un client gère sa propre position" on customer_locations;
create policy "Un client gère sa propre position"
  on customer_locations for all
  using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid() or is_admin());
-- Remarque : la clause USING autorise techniquement l'admin à modifier la
-- ligne, mais l'application n'expose aucune fonctionnalité d'écriture admin
-- sur cette table — seul le client authentifié modifie sa propre position
-- depuis son navigateur (geolocation API). L'admin est en lecture seule
-- côté interface.


-- -----------------------------------------------------------------------------
-- 3. shop_settings — réseaux sociaux + règles de récompense parrainage
-- -----------------------------------------------------------------------------

alter table shop_settings
  add column if not exists social_links jsonb not null default '{}'::jsonb,
  add column if not exists affiliate_enabled boolean not null default false,
  add column if not exists affiliate_reward_type text not null default 'fixed'
    check (affiliate_reward_type in ('percentage', 'fixed')),
  add column if not exists affiliate_reward_value numeric(12, 2) not null default 0
    check (affiliate_reward_value >= 0),
  add column if not exists affiliate_min_order_total numeric(12, 2) not null default 0
    check (affiliate_min_order_total >= 0),
  add column if not exists affiliate_reward_expires_days int not null default 30
    check (affiliate_reward_expires_days > 0);

-- affiliate_enabled reste à false par défaut : voir le rapport d'audit,
-- l'activation en production nécessite une confirmation explicite du
-- propriétaire de la boutique avant de passer cette valeur à true.


-- -----------------------------------------------------------------------------
-- 4. affiliate_rewards — traçabilité des récompenses de parrainage
-- -----------------------------------------------------------------------------

create table if not exists affiliate_rewards (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles (id) on delete cascade,
  referred_customer_id uuid not null references profiles (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  discount_code_id uuid references discount_codes (id) on delete set null,
  reward_type text not null check (reward_type in ('percentage', 'fixed')),
  amount numeric(12, 2) not null,
  status text not null default 'issued' check (status in ('issued', 'cancelled')),
  created_at timestamptz not null default now(),
  -- Empêche toute double récompense pour une même commande, y compris en
  -- cas de rejeu concurrent du trigger.
  unique (order_id)
);

create index if not exists affiliate_rewards_referrer_idx on affiliate_rewards (referrer_id);

alter table affiliate_rewards enable row level security;

drop policy if exists "Un parrain voit ses propres récompenses" on affiliate_rewards;
create policy "Un parrain voit ses propres récompenses"
  on affiliate_rewards for select
  using (referrer_id = auth.uid() or is_admin());

drop policy if exists "Admin gère les récompenses de parrainage" on affiliate_rewards;
create policy "Admin gère les récompenses de parrainage"
  on affiliate_rewards for all
  using (is_admin())
  with check (is_admin());
-- Aucune policy INSERT/UPDATE pour un client normal : les récompenses sont
-- exclusivement créées par le trigger security definer ci-dessous, jamais
-- directement par le client. C'est la garantie principale contre la fraude.


-- -----------------------------------------------------------------------------
-- 5. Attribution automatique et sécurisée de la récompense
-- -----------------------------------------------------------------------------
-- Se déclenche uniquement quand une commande passe au statut "delivered"
-- (livrée) — le point le plus sûr pour éviter de récompenser une commande
-- ensuite annulée/remboursée. Ce choix par défaut est documenté dans le
-- rapport d'audit et peut être changé si vous préférez un autre statut
-- (ex. "paid"), mais "delivered" est le plus prudent.
--
-- Tout est calculé côté serveur à partir de shop_settings et de la commande
-- réelle en base : aucune donnée envoyée par le navigateur n'intervient dans
-- le calcul du montant de la récompense.

create or replace function generate_discount_code_string()
returns text as $$
declare
  candidate text;
  exists_already boolean;
begin
  loop
    candidate := 'PARRAIN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    select exists(select 1 from discount_codes where code = candidate) into exists_already;
    exit when not exists_already;
  end loop;
  return candidate;
end;
$$ language plpgsql volatile;

create or replace function award_affiliate_reward()
returns trigger as $$
declare
  v_referrer_id uuid;
  v_settings record;
  v_discount_id uuid;
begin
  -- Ne déclenche l'attribution que lors d'une transition VERS "delivered".
  if new.status <> 'delivered' or (old.status is not distinct from new.status) then
    return new;
  end if;

  select referred_by into v_referrer_id from profiles where id = new.customer_id;

  -- Client non parrainé : rien à faire.
  if v_referrer_id is null then
    return new;
  end if;

  -- Garde-fou anti auto-parrainage (déjà bloqué à l'inscription, vérifié
  -- une seconde fois ici par prudence).
  if v_referrer_id = new.customer_id then
    return new;
  end if;

  select affiliate_enabled, affiliate_reward_type, affiliate_reward_value,
         affiliate_min_order_total, affiliate_reward_expires_days
    into v_settings
    from shop_settings where id = 1;

  if v_settings.affiliate_enabled is not true then
    return new;
  end if;

  if new.total < v_settings.affiliate_min_order_total then
    return new;
  end if;

  -- Empêche toute double récompense pour la même commande (ex. si la
  -- commande repasse un jour par "delivered" une seconde fois).
  if exists (select 1 from affiliate_rewards where order_id = new.id) then
    return new;
  end if;

  insert into discount_codes (code, type, value, customer_id, max_uses, used_count, expires_at, created_by)
  values (
    generate_discount_code_string(),
    v_settings.affiliate_reward_type,
    v_settings.affiliate_reward_value,
    v_referrer_id,
    1,
    0,
    now() + (v_settings.affiliate_reward_expires_days || ' days')::interval,
    null
  )
  returning id into v_discount_id;

  insert into affiliate_rewards (referrer_id, referred_customer_id, order_id, discount_code_id, reward_type, amount, status)
  values (v_referrer_id, new.customer_id, new.id, v_discount_id, v_settings.affiliate_reward_type, v_settings.affiliate_reward_value, 'issued');

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists orders_award_affiliate_reward on orders;
create trigger orders_award_affiliate_reward
  after update of status on orders
  for each row execute procedure award_affiliate_reward();


-- -----------------------------------------------------------------------------
-- 6. Fonction d'agrégats parrainage (lecture) — RPC sécurisée
-- -----------------------------------------------------------------------------
-- Un client ne peut pas lire les lignes "profiles" d'autres clients (RLS),
-- donc impossible de compter directement "mes filleuls" depuis le frontend.
-- Cette fonction renvoie uniquement des agrégats sur les filleuls de
-- l'appelant (auth.uid()), jamais leurs données personnelles individuelles.
create or replace function get_my_affiliate_summary()
returns table (
  referral_code text,
  registrations_count bigint,
  confirmed_orders_count bigint,
  rewards_count bigint,
  rewards_total numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select
    p.referral_code,
    (select count(*) from profiles r where r.referred_by = auth.uid())::bigint,
    (select count(*) from orders o
       join profiles r on o.customer_id = r.id
       where r.referred_by = auth.uid() and o.status = 'delivered')::bigint,
    (select count(*) from affiliate_rewards ar where ar.referrer_id = auth.uid())::bigint,
    (select coalesce(sum(ar.amount), 0) from affiliate_rewards ar where ar.referrer_id = auth.uid())
  from profiles p
  where p.id = auth.uid();
end;
$$;

grant execute on function get_my_affiliate_summary() to authenticated;


-- =============================================================================
-- Fin de la migration Phase 3.
-- =============================================================================
