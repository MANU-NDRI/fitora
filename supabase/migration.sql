-- Transaction atomique de commande et réservation de stock.
-- Le frontend fournit uniquement les identifiants de variantes et quantités.
-- Les prix, noms, images et libellés sont relus depuis PostgreSQL.
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
  v_discount numeric := greatest(0, coalesce(p_discount, 0));
  v_delivery_fee numeric := greatest(0, coalesce(p_delivery_fee, 0));
  v_total numeric;
  v_variant_label text;
  v_image text;
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
    p_customer_id, 0, v_delivery_fee, v_discount, p_discount_code, 0,
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

  v_discount := least(v_discount, v_subtotal + v_delivery_fee);
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

-- La fonction est appelée par un client authentifié et reste transactionnelle.
-- Les triggers existants réservent le stock après chaque ligne et annulent
-- toute la transaction si une réservation échoue.
