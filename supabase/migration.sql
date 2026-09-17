-- FITORA — migrations de durcissement Supabase
-- À exécuter après supabase/schema.sql dans l'éditeur SQL Supabase.
-- Cette migration ne contient aucune donnée secrète.

-- Les fonctions SECURITY DEFINER doivent utiliser un search_path immuable afin
-- d'éviter qu'un objet homonyme placé dans un schéma contrôlé par un tiers ne
-- soit résolu à la place d'un objet public.
alter function public.handle_new_user() set search_path = public, auth, pg_temp;
alter function public.enforce_authoritative_item_price() set search_path = public, pg_temp;
alter function public.recompute_order_subtotal() set search_path = public, pg_temp;
alter function public.reserve_stock() set search_path = public, pg_temp;
alter function public.apply_order_status_stock_effects() set search_path = public, pg_temp;
alter function public.check_review_order_delivered() set search_path = public, pg_temp;
alter function public.refresh_product_rating() set search_path = public, pg_temp;
alter function public.is_admin() set search_path = public, auth, pg_temp;
alter function public.prevent_role_self_escalation() set search_path = public, auth, pg_temp;

-- Les variantes et images ne doivent pas révéler le catalogue non publié.
-- Les policies initiales "using (true)" permettaient cette fuite.
drop policy if exists "Images produits visibles de tous" on public.product_images;
create policy "Images des produits publiés visibles de tous"
  on public.product_images for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.published or public.is_admin())
    )
  );

drop policy if exists "Variantes produits visibles de tous" on public.product_variants;
create policy "Variantes des produits publiés visibles de tous"
  on public.product_variants for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.published or public.is_admin())
    )
  );

-- Un client ne doit pouvoir créer une ligne que pour sa commande et ne doit
-- pas pouvoir rattacher arbitrairement un produit/variant à cette ligne.
-- Les triggers de prix et de stock restent l'autorité finale côté PostgreSQL.
drop policy if exists "Un client ajoute des articles à sa commande" on public.order_items;
create policy "Un client ajoute des articles à sa commande"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.customer_id = auth.uid()
    )
    and exists (
      select 1 from public.products p
      where p.id = order_items.product_id
        and p.published
    )
    and (
      order_items.variant_id is null
      or exists (
        select 1 from public.product_variants pv
        where pv.id = order_items.variant_id
          and pv.product_id = order_items.product_id
      )
    )
  );

-- Vérifications d'intégrité utiles pour empêcher des réservations incohérentes.
alter table public.product_variants
  add constraint product_variants_reserved_lte_available
  check (stock_reserved <= stock_available);

alter table public.orders
  add constraint orders_amounts_non_negative
  check (subtotal >= 0 and delivery_fee >= 0 and discount >= 0 and total >= 0);
