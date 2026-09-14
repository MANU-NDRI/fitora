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

create type shipping_method as enum ('standard', 'express');

create type message_status as enum ('unread', 'read', 'replied', 'archived');

create type inventory_movement_type as enum ('in', 'out', 'correction', 'reservation', 'release');

create type notification_scope as enum ('broadcast', 'customer');

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
  -- Rupture de stock déclarée manuellement par l'administrateur, indépendante
  -- des quantités réelles restantes sur les variantes.
  out_of_stock_override boolean not null default false,
  created_at timestamptz not null default now()
);

create index products_category_id_idx on products (category_id);
create index products_published_idx on products (published);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  -- En mode démo (sans Supabase Storage), le frontend peut stocker ici une
  -- image encodée en base64 directement téléversée par l'administrateur.
  -- En production, préférez héberger les fichiers dans un bucket Supabase
  -- Storage public et ne stocker ici que l'URL publique retournée : c'est
  -- plus léger en base et bénéficie du CDN de Supabase.
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
  -- Position GPS partagée volontairement par le client (facultatif),
  -- visible par l'administrateur pour faciliter la livraison.
  latitude double precision,
  longitude double precision,
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
  discount_code text,
  total numeric(12, 2) not null,
  status order_status not null default 'pending_payment',
  payment_method payment_method not null,
  reception_mode reception_mode not null,
  shipping_method shipping_method,
  estimated_delivery_days int,
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
-- product_reviews (avis clients — uniquement après livraison)
-- -----------------------------------------------------------------------------
create table product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  customer_id uuid references profiles (id) on delete set null,
  -- Renseigné lorsque l'avis provient d'un achat vérifié : garantit qu'un
  -- client ne peut noter un produit qu'après réception de sa commande, et
  -- une seule fois par commande (voir contrainte unique ci-dessous).
  order_id uuid references orders (id) on delete set null,
  author text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  constraint product_reviews_unique_per_order unique (product_id, customer_id, order_id)
);

create index product_reviews_product_id_idx on product_reviews (product_id);

-- Empêche de laisser un avis sur une commande qui n'est pas encore livrée.
create function check_review_order_delivered()
returns trigger as $$
begin
  if new.order_id is not null then
    if not exists (
      select 1 from orders
      where id = new.order_id and status = 'delivered' and customer_id = new.customer_id
    ) then
      raise exception 'Vous ne pouvez noter un produit qu''après réception de votre commande.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger product_reviews_require_delivery
  before insert on product_reviews
  for each row execute procedure check_review_order_delivered();

-- Recalcule la note moyenne et le nombre d'avis du produit concerné.
create function refresh_product_rating()
returns trigger as $$
begin
  update products
  set
    rating = coalesce((select round(avg(rating)::numeric, 1) from product_reviews where product_id = coalesce(new.product_id, old.product_id)), 0),
    review_count = (select count(*) from product_reviews where product_id = coalesce(new.product_id, old.product_id))
  where id = coalesce(new.product_id, old.product_id);
  return coalesce(new, old);
end;
$$ language plpgsql security definer;

create trigger product_reviews_refresh_rating
  after insert or update or delete on product_reviews
  for each row execute procedure refresh_product_rating();

-- -----------------------------------------------------------------------------
-- discount_codes (codes de réduction généraux ou réservés à un client)
-- -----------------------------------------------------------------------------
create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric(12, 2) not null check (value >= 0),
  -- null = valable pour tous les clients ; renseigné = réservé à ce client.
  customer_id uuid references profiles (id) on delete cascade,
  max_uses int not null default 1 check (max_uses >= 1),
  used_count int not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index discount_codes_customer_id_idx on discount_codes (customer_id);

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
  standard_delivery_days int not null default 4,
  express_delivery_days int not null default 2,
  express_surcharge_rate numeric(5, 2) not null default 2, -- % de majoration appliqué au tarif standard
  -- Image de fond du hero sur l'accueil ; si vide, une image par défaut est utilisée côté frontend.
  hero_image_url text,
  return_policy text not null default 'Vous disposez de 7 jours après réception de votre commande pour demander un retour ou un échange.',
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
  customer_id uuid references profiles (id) on delete set null,
  reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
-- scope = 'broadcast' : diffusion générale (ex: promotion) visible par tous
--   les clients ; customer_id est alors null.
-- scope = 'customer'  : notification ciblée (évolution de commande, réponse
--   à un message) ; customer_id désigne le destinataire.
-- La lecture est individuelle : chaque client a sa propre ligne dans
-- notification_reads une fois la notification consultée.
create table notifications (
  id uuid primary key default gen_random_uuid(),
  scope notification_scope not null,
  customer_id uuid references profiles (id) on delete cascade,
  title text not null,
  message text not null,
  link text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  constraint notifications_customer_scope check (
    (scope = 'customer' and customer_id is not null) or
    (scope = 'broadcast' and customer_id is null)
  )
);

create index notifications_customer_id_idx on notifications (customer_id);
create index notifications_scope_idx on notifications (scope);

create table notification_reads (
  notification_id uuid not null references notifications (id) on delete cascade,
  customer_id uuid not null references profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, customer_id)
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
alter table notifications enable row level security;
alter table notification_reads enable row level security;
alter table discount_codes enable row level security;

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

create policy "Un client consulte ses propres messages et leurs réponses"
  on contact_messages for select using (customer_id = auth.uid() or is_admin());

create policy "Admin gère les messages"
  on contact_messages for all using (is_admin()) with check (is_admin());

-- --------------------------- notifications ---------------------------
create policy "Un client voit les diffusions générales et ses notifications"
  on notifications for select
  using (scope = 'broadcast' or customer_id = auth.uid() or is_admin());

create policy "Admin crée des notifications (diffusion ou ciblée)"
  on notifications for insert with check (is_admin());

create policy "Admin gère les notifications"
  on notifications for all using (is_admin()) with check (is_admin());

-- --------------------------- notification_reads ---------------------------
create policy "Un client gère son propre état de lecture"
  on notification_reads for all
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- --------------------------- discount_codes ---------------------------
create policy "Un client voit les codes qui lui sont réservés ou généraux"
  on discount_codes for select
  using (customer_id is null or customer_id = auth.uid() or is_admin());

-- La validation (code correct, non expiré, non utilisé) et le marquage
-- "used" sont effectués via une fonction security definer côté application
-- pour éviter qu'un client ne puisse falsifier ces champs lui-même.
create policy "Admin gère les codes de réduction"
  on discount_codes for all using (is_admin()) with check (is_admin());

-- =============================================================================
-- Fin du schéma. Voir seed.sql pour les données de démonstration.
-- =============================================================================
