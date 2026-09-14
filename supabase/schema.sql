-- =============================================================================
-- FITORA — Schéma Supabase / PostgreSQL
-- =============================================================================
-- À exécuter dans l'éditeur SQL de votre projet Supabase (Database > SQL Editor)
-- avant de renseigner VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY dans .env.
--
-- Ordre d'exécution recommandé :
--   1. schema.sql   (ce fichier : tables, types, index, RLS, triggers)
--   2. seed.sql     (catégories + produits de démonstration)
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Types énumérés
-- -----------------------------------------------------------------------------
create type user_role as enum ('customer', 'admin');

create type order_status as enum (
  'pending_payment',
  'payment_proof_received',
  'paid',
  'preparing',
  'delivering',
  'delivered',
  'cancelled'
);

create type payment_method as enum (
  'wave',
  'orange_money',
  'mtn_money',
  'moov_money',
  'cash_on_delivery'
);

create type reception_mode as enum ('livraison', 'retrait');

create type message_status as enum ('unread', 'read', 'replied', 'archived');

create type inventory_movement_type as enum ('in', 'out', 'correction', 'reservation', 'release');

-- -----------------------------------------------------------------------------
-- profiles — étend auth.users (Supabase Auth)
-- -----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text not null,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- Crée automatiquement un profil "customer" à l'inscription (Supabase Auth).
create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    'customer'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- -----------------------------------------------------------------------------
-- categories
-- -----------------------------------------------------------------------------
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  image text not null,
  sport text not null,
  order_index int not null default 1,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- products
-- -----------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category_id uuid not null references categories (id) on delete restrict,
  sport text not null,
  description text not null default '',
  features text[] not null default '{}',
  price numeric(12, 2) not null check (price >= 0),
  old_price numeric(12, 2) check (old_price is null or old_price >= price),
  rating numeric(2, 1) not null default 0,
  review_count int not null default 0,
  sales_count int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index products_category_id_idx on products (category_id);
create index products_published_idx on products (published);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  url text not null,
  position int not null default 0
);

create index product_images_product_id_idx on product_images (product_id);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  size text,
  color text,
  color_hex text,
  shoe_size text,
  stock_available int not null default 0 check (stock_available >= 0),
  stock_reserved int not null default 0 check (stock_reserved >= 0),
  sku text not null unique
);

create index product_variants_product_id_idx on product_variants (product_id);

create table product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  customer_id uuid references profiles (id) on delete set null,
  author text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- addresses (carnet d'adresses client)
-- -----------------------------------------------------------------------------
create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles (id) on delete cascade,
  label text not null,
  full_name text not null,
  phone text not null,
  whatsapp text,
  city text not null,
  commune text not null,
  quartier text not null,
  address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_customer_id_idx on addresses (customer_id);

-- -----------------------------------------------------------------------------
-- orders / order_items
-- -----------------------------------------------------------------------------
create table orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid not null references profiles (id) on delete restrict,
  subtotal numeric(12, 2) not null,
  delivery_fee numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  status order_status not null default 'pending_payment',
  payment_method payment_method not null,
  reception_mode reception_mode not null,
  address_id uuid references addresses (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_customer_id_idx on orders (customer_id);
create index orders_status_idx on orders (status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  variant_id uuid references product_variants (id) on delete set null,
  product_name text not null,
  image text not null,
  variant_label text not null default '',
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null
);

create index order_items_order_id_idx on order_items (order_id);

-- Génère automatiquement un numéro de commande FIT-{année}-{séquence}.
create sequence order_number_seq;

create function generate_order_number()
returns trigger as $$
begin
  if new.number is null or new.number = '' then
    new.number := 'FIT-' || extract(year from now())::text || '-' ||
      lpad(nextval('order_number_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger set_order_number
  before insert on orders
  for each row execute procedure generate_order_number();

create function touch_order_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

create trigger orders_touch_updated_at
  before update on orders
  for each row execute procedure touch_order_updated_at();

-- -----------------------------------------------------------------------------
-- Réservation de stock (section 30 du cahier des charges)
-- À la création d'un order_item, on réserve la quantité sur la variante et on
-- historise le mouvement. Un job planifié (pg_cron, ci-dessous) libère les
-- réservations non payées après 24h.
-- -----------------------------------------------------------------------------
create function reserve_stock()
returns trigger as $$
begin
  if new.variant_id is not null then
    update product_variants
    set stock_reserved = stock_reserved + new.quantity
    where id = new.variant_id
      and stock_available - stock_reserved >= new.quantity;

    if not found then
      raise exception 'Stock insuffisant pour la variante %', new.variant_id;
    end if;

    insert into inventory_movements (variant_id, type, quantity, note)
    values (new.variant_id, 'reservation', new.quantity, 'Réservation à la commande');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger order_items_reserve_stock
  after insert on order_items
  for each row execute procedure reserve_stock();

-- Quand une commande passe à "paid", le stock réservé est déduit définitivement.
-- Quand une commande passe à "cancelled", le stock réservé est libéré.
create function apply_order_status_stock_effects()
returns trigger as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update product_variants pv
    set stock_available = pv.stock_available - oi.quantity,
        stock_reserved = pv.stock_reserved - oi.quantity
    from order_items oi
    where oi.order_id = new.id and oi.variant_id = pv.id;

    insert into inventory_movements (variant_id, type, quantity, note)
    select oi.variant_id, 'out', oi.quantity, 'Déduction après paiement confirmé (' || new.number || ')'
    from order_items oi
    where oi.order_id = new.id and oi.variant_id is not null;
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update product_variants pv
    set stock_reserved = greatest(0, pv.stock_reserved - oi.quantity)
    from order_items oi
    where oi.order_id = new.id and oi.variant_id = pv.id;

    insert into inventory_movements (variant_id, type, quantity, note)
    select oi.variant_id, 'release', oi.quantity, 'Libération suite annulation (' || new.number || ')'
    from order_items oi
    where oi.order_id = new.id and oi.variant_id is not null;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger orders_stock_effects
  after update on orders
  for each row execute procedure apply_order_status_stock_effects();

-- Optionnel : libération automatique des réservations après 24h si le
-- paiement n'a pas été confirmé (nécessite l'extension pg_cron sur Supabase :
-- Database > Extensions > pg_cron, puis exécuter la ligne ci-dessous) :
--
-- select cron.schedule(
--   'fitora-release-expired-reservations',
--   '0 * * * *', -- toutes les heures
--   $$
--     update orders set status = 'cancelled'
--     where status = 'pending_payment' and created_at < now() - interval '24 hours';
--   $$
-- );

-- -----------------------------------------------------------------------------
-- inventory_movements
-- -----------------------------------------------------------------------------
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants (id) on delete cascade,
  type inventory_movement_type not null,
  quantity int not null,
  note text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index inventory_movements_variant_id_idx on inventory_movements (variant_id);

-- -----------------------------------------------------------------------------
-- shop_settings (ligne unique)
-- -----------------------------------------------------------------------------
create table shop_settings (
  id int primary key default 1 check (id = 1),
  shop_name text not null default 'FITORA',
  slogan text not null default 'SPORT • STYLE • PERFORMANCE',
  whatsapp text not null default '2250789777767',
  phone text not null default '2250789777767',
  email text not null default 'contact@fitora.ci',
  address text not null default 'Abidjan, Côte d''Ivoire',
  delivery_fee numeric(12, 2) not null default 2000,
  cod_enabled boolean not null default true,
  payment_numbers jsonb not null default '{
    "wave": "07 89 77 77 67",
    "orange_money": "07 89 77 77 67",
    "mtn_money": "05 89 77 77 67",
    "moov_money": "01 89 77 77 67"
  }'::jsonb
);

insert into shop_settings (id) values (1);

-- -----------------------------------------------------------------------------
-- contact_messages
-- -----------------------------------------------------------------------------
create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  subject text not null,
  message text not null,
  status message_status not null default 'unread',
  created_at timestamptz not null default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_variants enable row level security;
alter table product_reviews enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table inventory_movements enable row level security;
alter table shop_settings enable row level security;
alter table contact_messages enable row level security;

-- Fonction utilitaire : l'utilisateur courant est-il administrateur ?
create function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- --------------------------- profiles ---------------------------
create policy "Un client lit son propre profil"
  on profiles for select using (auth.uid() = id or is_admin());

create policy "Un client modifie son propre profil"
  on profiles for update using (auth.uid() = id);

-- --------------------------- categories / products (lecture publique) -------
create policy "Catégories publiées visibles de tous"
  on categories for select using (published or is_admin());

create policy "Admin gère les catégories"
  on categories for all using (is_admin()) with check (is_admin());

create policy "Produits publiés visibles de tous"
  on products for select using (published or is_admin());

create policy "Admin gère les produits"
  on products for all using (is_admin()) with check (is_admin());

create policy "Images produits visibles de tous"
  on product_images for select using (true);

create policy "Admin gère les images produits"
  on product_images for all using (is_admin()) with check (is_admin());

create policy "Variantes produits visibles de tous"
  on product_variants for select using (true);

create policy "Admin gère les variantes"
  on product_variants for all using (is_admin()) with check (is_admin());

-- Les mises à jour de stock (réservation/déduction) passent par les triggers
-- `security definer` ci-dessus ; les clients ne peuvent jamais écrire
-- directement sur product_variants.

create policy "Avis clients visibles de tous"
  on product_reviews for select using (true);

create policy "Un client authentifié peut laisser un avis"
  on product_reviews for insert with check (auth.uid() = customer_id);

create policy "Admin gère les avis"
  on product_reviews for all using (is_admin()) with check (is_admin());

-- --------------------------- addresses ---------------------------
create policy "Un client gère ses propres adresses"
  on addresses for all
  using (customer_id = auth.uid() or is_admin())
  with check (customer_id = auth.uid());

-- --------------------------- orders / order_items -----------------
create policy "Un client crée ses propres commandes"
  on orders for insert with check (customer_id = auth.uid());

create policy "Un client consulte ses propres commandes"
  on orders for select using (customer_id = auth.uid() or is_admin());

-- Les clients ne peuvent jamais modifier une commande après création
-- (changement de statut, confirmation de paiement) : seul l'admin le peut.
create policy "Seul l'administrateur modifie une commande"
  on orders for update using (is_admin()) with check (is_admin());

create policy "Un client ajoute des articles à sa commande"
  on order_items for insert
  with check (
    exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
  );

create policy "Un client consulte les articles de ses commandes"
  on order_items for select
  using (
    exists (
      select 1 from orders o
      where o.id = order_id and (o.customer_id = auth.uid() or is_admin())
    )
  );

-- --------------------------- inventory_movements (admin uniquement) --------
create policy "Admin uniquement sur les mouvements de stock"
  on inventory_movements for all using (is_admin()) with check (is_admin());

-- --------------------------- shop_settings ---------------------------
create policy "Paramètres boutique visibles de tous"
  on shop_settings for select using (true);

create policy "Admin modifie les paramètres boutique"
  on shop_settings for update using (is_admin()) with check (is_admin());

-- --------------------------- contact_messages ---------------------------
create policy "Tout le monde peut envoyer un message"
  on contact_messages for insert with check (true);

create policy "Admin lit et gère les messages"
  on contact_messages for all using (is_admin()) with check (is_admin());

-- =============================================================================
-- Fin du schéma. Voir seed.sql pour les données de démonstration.
-- =============================================================================
