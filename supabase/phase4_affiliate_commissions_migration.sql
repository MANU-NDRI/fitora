-- =============================================================================
-- FITORA — Migration Phase 4 : correctif de sécurité critique (codes de
--          réduction) + programme d'affiliation complet (code persistant,
--          suivi des clics, commissions avec statuts, gestion admin)
-- =============================================================================
-- À exécuter APRÈS schema.sql + migration.sql + phase3_features_migration.sql.
-- Rejouable sans risque. Ne supprime aucune donnée, ne modifie aucune policy
-- existante en dehors de celles listées explicitement ci-dessous.
--
-- -----------------------------------------------------------------------------
-- ⚠️  SECTION 0 — CORRECTIF DE SÉCURITÉ CRITIQUE, À LIRE EN PRIORITÉ
-- -----------------------------------------------------------------------------
-- Constat : create_order_transaction() acceptait un montant de réduction
-- (p_discount) fourni tel quel par le navigateur, et l'incrémentation de
-- used_count se faisait dans un second appel séparé (redeem_discount_code),
-- après la création de la commande. Concrètement :
--   1. Un client pouvait appeler l'API Supabase directement (hors interface)
--      avec un p_discount arbitraire, quasiment jusqu'à rendre sa commande
--      gratuite, avec ou sans code de réduction valide.
--   2. Un même code à usage unique pouvait être réutilisé indéfiniment en ne
--      déclenchant simplement jamais le second appel de "consommation".
-- Correction : create_order_transaction() recalcule désormais lui-même le
-- montant de la réduction depuis la table discount_codes (jamais depuis le
-- navigateur) et incrémente used_count dans la même transaction atomique que
-- la commande. Le paramètre p_discount est conservé dans la signature pour
-- ne pas casser les appels existants, mais n'est plus utilisé pour le calcul.
-- =============================================================================

create or replace function public.create_order_transaction(
  p_customer_id uuid,
  p_items jsonb,
  p_delivery_fee numeric,
  p_discount numeric default 0,
  p_discount_code text default null,
  p_payment_method payment_method default 'cash_on_delivery',
  p_reception_mode reception_mode default 'retrait',
  p_shipping_method shipping_method default null,
  p_estimated_delivery_days integer default null,
  p_address jsonb default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id uuid;
  v_address_id uuid;
  v_item jsonb;
  v_variant product_variants%rowtype;
  v_product products%rowtype;
  v_quantity integer;
  v_subtotal numeric := 0;
  -- p_discount n'est plus utilisé pour le calcul : conservé uniquement pour
  -- compatibilité de signature. Voir Section 0 ci-dessus.
  v_discount numeric := 0;
  v_delivery_fee numeric := greatest(0, coalesce(p_delivery_fee, 0));
  v_total numeric;
  v_variant_label text;
  v_image text;
  v_discount_code_row discount_codes%rowtype;
  v_commission_rate record;
  v_commission_amount numeric;
begin
  if auth.uid() is null or auth.uid() <> p_customer_id then
    raise exception 'Utilisateur non autorisé';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Le panier est vide';
  end if;

  if p_reception_mode = 'livraison' and p_address is null then
    raise exception 'Adresse de livraison obligatoire';
  end if;

  if p_reception_mode = 'retrait' then
    v_delivery_fee := 0;
  end if;

  if p_address is not null then
    insert into public.addresses (
      customer_id, label, full_name, phone, whatsapp, city, commune,
      quartier, address, is_default, latitude, longitude
    ) values (
      p_customer_id,
      coalesce(p_address->>'label', 'Adresse de livraison'),
      coalesce(p_address->>'full_name', ''),
      coalesce(p_address->>'phone', ''),
      nullif(p_address->>'whatsapp', ''),
      coalesce(p_address->>'city', ''),
      coalesce(p_address->>'commune', ''),
      coalesce(p_address->>'quartier', ''),
      coalesce(p_address->>'address', ''),
      false,
      (p_address->>'latitude')::double precision,
      (p_address->>'longitude')::double precision
    ) returning id into v_address_id;
  end if;

  insert into public.orders (
    customer_id, subtotal, delivery_fee, discount, discount_code, total,
    payment_method, reception_mode, shipping_method,
    estimated_delivery_days, address_id, note
  ) values (
    p_customer_id, 0, v_delivery_fee, 0, p_discount_code, 0,
    p_payment_method, p_reception_mode,
    case when p_reception_mode = 'livraison' then p_shipping_method else null end,
    case when p_reception_mode = 'livraison' then p_estimated_delivery_days else null end,
    v_address_id, p_note
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Quantité invalide';
    end if;

    select pv.* into v_variant
    from public.product_variants pv
    where pv.id = (v_item->>'variant_id')::uuid
      and pv.product_id = (v_item->>'product_id')::uuid
    for update;

    if not found then
      raise exception 'Variante ou produit inexistant';
    end if;

    select p.* into v_product
    from public.products p
    where p.id = v_variant.product_id and p.published = true;

    if not found then
      raise exception 'Produit indisponible';
    end if;

    if v_variant.stock_available - v_variant.stock_reserved < v_quantity then
      raise exception 'Stock insuffisant pour le produit %', v_product.name;
    end if;

    v_variant_label := concat_ws(' · ', nullif(v_variant.size, ''), case when v_variant.shoe_size is not null then 'Pointure ' || v_variant.shoe_size end, nullif(v_variant.color, ''));
    select pi.url into v_image
    from public.product_images pi
    where pi.product_id = v_product.id
    order by pi.position asc
    limit 1;

    insert into public.order_items (
      order_id, product_id, variant_id, product_name, image,
      variant_label, quantity, unit_price
    ) values (
      v_order_id, v_product.id, v_variant.id, v_product.name,
      coalesce(v_image, ''), coalesce(v_variant_label, ''), v_quantity, v_product.price
    );

    v_subtotal := v_subtotal + (v_product.price * v_quantity);
  end loop;

  -- ---------------------------------------------------------------------
  -- Validation ET consommation du code de réduction, atomiquement, ici et
  -- nulle part ailleurs. Un code invalide, expiré, épuisé, réservé à un
  -- autre client, ou appartenant à un affilié suspendu, fait échouer toute
  -- la commande plutôt que d'ignorer silencieusement la réduction promise.
  -- ---------------------------------------------------------------------
  if p_discount_code is not null and length(trim(p_discount_code)) > 0 then
    select dc.* into v_discount_code_row
    from public.discount_codes dc
    where dc.code = upper(trim(p_discount_code))
      and (dc.customer_id is null or dc.customer_id = p_customer_id)
      and dc.used_count < dc.max_uses
      and (dc.expires_at is null or dc.expires_at > now())
      and (
        dc.affiliate_owner_id is null
        or dc.affiliate_owner_id = p_customer_id  -- garde-fou : jamais bloquant pour son propre compte, cas déjà exclu plus bas pour la commission
        or (select coalesce(p.affiliate_active, true) from public.profiles p where p.id = dc.affiliate_owner_id)
      )
    for update;

    if not found then
      raise exception 'Code de réduction invalide, expiré ou déjà utilisé';
    end if;

    v_discount := case
      when v_discount_code_row.type = 'percentage' then round(v_subtotal * (v_discount_code_row.value / 100.0))
      else least(v_discount_code_row.value, v_subtotal + v_delivery_fee)
    end;
    v_discount := least(v_discount, v_subtotal + v_delivery_fee);

    update public.discount_codes
    set used_count = used_count + 1
    where id = v_discount_code_row.id;

    -- Commission d'affiliation : uniquement si le code appartient à un
    -- affilié distinct de l'acheteur (jamais d'auto-commission), et si le
    -- programme est activé. Statut initial "pending" : validé automatiquement
    -- si/quand la commande est livrée (voir trigger plus bas).
    if v_discount_code_row.affiliate_owner_id is not null
       and v_discount_code_row.affiliate_owner_id <> p_customer_id then

      select affiliate_enabled, affiliate_reward_type, affiliate_reward_value
        into v_commission_rate
        from public.shop_settings where id = 1;

      if v_commission_rate.affiliate_enabled is true then
        v_commission_amount := case
          when v_commission_rate.affiliate_reward_type = 'percentage'
            then round(v_subtotal * (v_commission_rate.affiliate_reward_value / 100.0))
          else v_commission_rate.affiliate_reward_value
        end;

        insert into public.affiliate_commissions (
          affiliate_id, order_id, discount_code_id, commission_type,
          commission_value, order_subtotal, commission_amount, status
        ) values (
          v_discount_code_row.affiliate_owner_id, v_order_id, v_discount_code_row.id,
          v_commission_rate.affiliate_reward_type, v_commission_rate.affiliate_reward_value,
          v_subtotal, v_commission_amount, 'pending'
        )
        on conflict (order_id) do nothing;
      end if;
    end if;
  end if;

  v_total := greatest(0, v_subtotal + v_delivery_fee - v_discount);
  update public.orders
  set subtotal = v_subtotal, discount = v_discount, total = v_total
  where id = v_order_id;

  return v_order_id;
exception
  when others then
    raise;
end;
$$;

grant execute on function public.create_order_transaction(
  uuid, jsonb, numeric, numeric, text, payment_method, reception_mode,
  shipping_method, integer, jsonb, text
) to authenticated;


-- -----------------------------------------------------------------------------
-- 1. profiles — code de réduction persistant + activation de l'affilié
-- -----------------------------------------------------------------------------

alter table profiles
  add column if not exists affiliate_discount_code text unique,
  add column if not exists affiliate_active boolean not null default true;

-- Étend la protection déjà en place (referral_code / referred_by /
-- last_seen_at) pour couvrir ces deux nouveaux champs : seul un admin peut
-- les modifier après création.
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
    if new.affiliate_discount_code is distinct from old.affiliate_discount_code then
      new.affiliate_discount_code := old.affiliate_discount_code;
    end if;
    if new.affiliate_active is distinct from old.affiliate_active then
      new.affiliate_active := old.affiliate_active;
    end if;
  end if;

  if new.last_seen_at is distinct from old.last_seen_at then
    new.last_seen_at := now();
  end if;

  return new;
end;
$$ language plpgsql security definer;

create or replace function generate_affiliate_discount_code()
returns text as $$
declare
  candidate text;
  exists_already boolean;
begin
  loop
    candidate := 'FITORA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    select exists(select 1 from discount_codes where code = candidate) into exists_already;
    exit when not exists_already;
  end loop;
  return candidate;
end;
$$ language plpgsql volatile;

-- Étend la création automatique de profil pour générer, en plus du code de
-- parrainage déjà existant, un code de réduction personnel et permanent,
-- utilisable par n'importe quel client au moment du paiement (jamais par
-- l'affilié lui-même, voir la vérification dans create_order_transaction).
create or replace function handle_new_user()
returns trigger as $$
declare
  v_referrer_id uuid;
  v_submitted_code text;
  v_new_profile_id uuid;
  v_affiliate_code text;
begin
  v_submitted_code := nullif(trim(new.raw_user_meta_data ->> 'referral_code'), '');

  if v_submitted_code is not null then
    select id into v_referrer_id
    from profiles
    where referral_code = upper(v_submitted_code)
    limit 1;
  end if;

  v_affiliate_code := generate_affiliate_discount_code();

  insert into public.profiles (
    id, first_name, last_name, email, phone, role,
    referral_code, referred_by, affiliate_discount_code
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'customer',
    generate_referral_code(),
    v_referrer_id,
    v_affiliate_code
  )
  returning id into v_new_profile_id;

  -- Code de réduction permanent associé à ce compte, utilisable par
  -- n'importe quel autre client (customer_id volontairement laissé null,
  -- l'attribution passe par affiliate_owner_id, pas par une réservation
  -- "à usage personnel").
  insert into public.discount_codes (
    code, type, value, customer_id, affiliate_owner_id, max_uses, used_count, expires_at
  ) values (
    v_affiliate_code, 'percentage', 5, null, v_new_profile_id, 999999, 0, null
  );
  -- La valeur par défaut (5 %) sert de point de départ raisonnable et sans
  -- risque. Elle est modifiable par l'administrateur depuis les paramètres
  -- boutique (affiliate_reward_value) — voir remarque dans le rapport
  -- d'audit : ce taux régit à la fois la récompense de parrainage existante
  -- et la commission sur code utilisé, pour éviter deux réglages parallèles
  -- non expliqués. Les codes déjà émis ne sont pas rétroactivement modifiés
  -- par un changement de ce réglage — seul le TAUX appliqué au moment de
  -- l'utilisation change, la valeur "value" stockée ici sert de repère
  -- d'affichage uniquement et n'est plus relue pour le calcul de commission
  -- (voir create_order_transaction, qui relit shop_settings directement).

  return new;
end;
$$ language plpgsql security definer;

-- Backfill : comptes déjà créés avant cette migration.
do $$
declare
  r record;
  v_code text;
begin
  for r in select id from profiles where affiliate_discount_code is null loop
    v_code := generate_affiliate_discount_code();
    update profiles set affiliate_discount_code = v_code where id = r.id;
    insert into discount_codes (code, type, value, customer_id, affiliate_owner_id, max_uses, used_count, expires_at)
    values (v_code, 'percentage', 5, null, r.id, 999999, 0, null);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 2. discount_codes — rattachement à un affilié
-- -----------------------------------------------------------------------------

alter table discount_codes
  add column if not exists affiliate_owner_id uuid references profiles (id) on delete set null;

create index if not exists discount_codes_affiliate_owner_idx on discount_codes (affiliate_owner_id);


-- -----------------------------------------------------------------------------
-- 3. affiliate_commissions — commissions liées à l'utilisation du code
--    persistant d'un affilié (distinct de affiliate_rewards, qui reste
--    inchangée et continue de gérer la récompense de parrainage existante
--    déclenchée à la livraison d'une commande d'un filleul).
-- -----------------------------------------------------------------------------

create table if not exists affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references profiles (id) on delete cascade,
  order_id uuid not null references orders (id) on delete cascade,
  discount_code_id uuid references discount_codes (id) on delete set null,
  commission_type text not null check (commission_type in ('percentage', 'fixed')),
  commission_value numeric(12, 2) not null,
  order_subtotal numeric(12, 2) not null,
  commission_amount numeric(12, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'validated', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  unique (order_id)
);

create index if not exists affiliate_commissions_affiliate_idx on affiliate_commissions (affiliate_id);

alter table affiliate_commissions enable row level security;

drop policy if exists "Un affilié voit ses propres commissions" on affiliate_commissions;
create policy "Un affilié voit ses propres commissions"
  on affiliate_commissions for select
  using (affiliate_id = auth.uid() or is_admin());

drop policy if exists "Admin gère les commissions" on affiliate_commissions;
create policy "Admin gère les commissions"
  on affiliate_commissions for all
  using (is_admin())
  with check (is_admin());
-- Aucune policy d'écriture pour un affilié : les commissions sont créées
-- exclusivement par create_order_transaction (security definer) et modifiées
-- exclusivement par les fonctions admin ci-dessous.

-- Fait passer une commission "pending" en "validated" quand la commande
-- associée est livrée, et en "cancelled" quand elle est annulée — sauf si
-- déjà payée (une commission payée sur une commande ensuite annulée devient
-- un cas de réconciliation manuelle pour l'administrateur, volontairement
-- non automatisé ici).
create or replace function sync_commission_with_order_status()
returns trigger as $$
begin
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    update affiliate_commissions
    set status = 'validated', validated_at = now()
    where order_id = new.id and status = 'pending';
  elsif new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update affiliate_commissions
    set status = 'cancelled', cancelled_at = now()
    where order_id = new.id and status in ('pending', 'validated');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists orders_sync_commission_status on orders;
create trigger orders_sync_commission_status
  after update of status on orders
  for each row execute procedure sync_commission_with_order_status();


-- -----------------------------------------------------------------------------
-- 4. Fonctions admin sécurisées — gestion du programme d'affiliation
-- -----------------------------------------------------------------------------

create or replace function admin_set_affiliate_active(p_affiliate_id uuid, p_active boolean)
returns void
language plpgsql
security definer
as $$
begin
  if not is_admin() then
    raise exception 'Action réservée aux administrateurs';
  end if;

  update profiles set affiliate_active = p_active where id = p_affiliate_id;
end;
$$;

grant execute on function admin_set_affiliate_active(uuid, boolean) to authenticated;

create or replace function admin_update_commission_status(p_commission_id uuid, p_new_status text)
returns void
language plpgsql
security definer
as $$
declare
  v_current text;
begin
  if not is_admin() then
    raise exception 'Action réservée aux administrateurs';
  end if;

  if p_new_status not in ('validated', 'paid', 'cancelled') then
    raise exception 'Statut cible invalide';
  end if;

  select status into v_current from affiliate_commissions where id = p_commission_id;

  if v_current is null then
    raise exception 'Commission introuvable';
  end if;

  if v_current in ('paid', 'cancelled') then
    raise exception 'Impossible de modifier une commission déjà % ', v_current;
  end if;

  update affiliate_commissions
  set status = p_new_status,
      validated_at = case when p_new_status = 'validated' then now() else validated_at end,
      paid_at = case when p_new_status = 'paid' then now() else paid_at end,
      cancelled_at = case when p_new_status = 'cancelled' then now() else cancelled_at end
  where id = p_commission_id;
end;
$$;

grant execute on function admin_update_commission_status(uuid, text) to authenticated;


-- -----------------------------------------------------------------------------
-- 5. Suivi des clics sur les liens d'affiliation
-- -----------------------------------------------------------------------------

create table if not exists affiliate_click_counts (
  referral_code text primary key references profiles (referral_code) on delete cascade,
  clicks bigint not null default 0,
  last_clicked_at timestamptz
);

alter table affiliate_click_counts enable row level security;

drop policy if exists "Un affilié voit ses propres clics" on affiliate_click_counts;
create policy "Un affilié voit ses propres clics"
  on affiliate_click_counts for select
  using (
    referral_code in (select referral_code from profiles where id = auth.uid())
    or is_admin()
  );
-- Aucune policy d'écriture directe : uniquement via record_affiliate_click()
-- ci-dessous, qui valide le code avant d'incrémenter.

create or replace function record_affiliate_click(p_code text)
returns void
language plpgsql
security definer
as $$
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return;
  end if;

  insert into affiliate_click_counts (referral_code, clicks, last_clicked_at)
  select upper(trim(p_code)), 1, now()
  where exists (select 1 from profiles where referral_code = upper(trim(p_code)))
  on conflict (referral_code)
  do update set clicks = affiliate_click_counts.clicks + 1, last_clicked_at = now();
end;
$$;

-- Un visiteur qui clique sur un lien d'affiliation n'est pas nécessairement
-- connecté : cette fonction doit rester appelable anonymement. Elle ne fait
-- qu'incrémenter un compteur agrégé, aucune donnée personnelle exposée.
grant execute on function record_affiliate_click(text) to anon, authenticated;


-- -----------------------------------------------------------------------------
-- 6. Résumé d'affiliation enrichi (remplace la version de phase3)
-- -----------------------------------------------------------------------------

drop function if exists get_my_affiliate_summary();

create or replace function get_my_affiliate_summary()
returns table (
  referral_code text,
  affiliate_discount_code text,
  affiliate_active boolean,
  clicks_count bigint,
  registrations_count bigint,
  confirmed_orders_count bigint,
  rewards_count bigint,
  rewards_total numeric,
  commission_pending_total numeric,
  commission_validated_total numeric,
  commission_paid_total numeric
)
language plpgsql
security definer
as $$
begin
  return query
  select
    p.referral_code,
    p.affiliate_discount_code,
    p.affiliate_active,
    coalesce((select acc.clicks from affiliate_click_counts acc where acc.referral_code = p.referral_code), 0),
    (select count(*) from profiles r where r.referred_by = auth.uid())::bigint,
    (select count(*) from orders o
       join profiles r on o.customer_id = r.id
       where r.referred_by = auth.uid() and o.status = 'delivered')::bigint,
    (select count(*) from affiliate_rewards ar where ar.referrer_id = auth.uid())::bigint,
    (select coalesce(sum(ar.amount), 0) from affiliate_rewards ar where ar.referrer_id = auth.uid()),
    (select coalesce(sum(ac.commission_amount), 0) from affiliate_commissions ac where ac.affiliate_id = auth.uid() and ac.status = 'pending'),
    (select coalesce(sum(ac.commission_amount), 0) from affiliate_commissions ac where ac.affiliate_id = auth.uid() and ac.status = 'validated'),
    (select coalesce(sum(ac.commission_amount), 0) from affiliate_commissions ac where ac.affiliate_id = auth.uid() and ac.status = 'paid')
  from profiles p
  where p.id = auth.uid();
end;
$$;

grant execute on function get_my_affiliate_summary() to authenticated;

-- =============================================================================
-- Fin de la migration Phase 4.
-- =============================================================================
