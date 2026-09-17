-- =============================================================================
-- FITORA — Données de démonstration
-- À exécuter après schema.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catégories
-- -----------------------------------------------------------------------------
insert into categories (slug, name, image, sport, order_index, published) values
  ('football', 'Football', 'https://picsum.photos/seed/fitora-football/800/800', 'football', 1, true),
  ('basketball', 'Basketball', 'https://picsum.photos/seed/fitora-basketball/800/800', 'basketball', 2, true),
  ('running', 'Running', 'https://picsum.photos/seed/fitora-running/800/800', 'running', 3, true),
  ('fitness', 'Fitness', 'https://picsum.photos/seed/fitora-fitness/800/800', 'fitness', 4, true),
  ('training', 'Training', 'https://picsum.photos/seed/fitora-training/800/800', 'training', 5, true),
  ('tennis', 'Tennis', 'https://picsum.photos/seed/fitora-tennis/800/800', 'tennis', 6, true),
  ('sports-de-combat', 'Sports de combat', 'https://picsum.photos/seed/fitora-combat/800/800', 'combat', 7, true),
  ('chaussures', 'Chaussures', 'https://picsum.photos/seed/fitora-shoes/800/800', 'lifestyle', 8, true),
  ('vetements', 'Vêtements', 'https://picsum.photos/seed/fitora-clothes/800/800', 'lifestyle', 9, true),
  ('accessoires', 'Accessoires', 'https://picsum.photos/seed/fitora-accessories/800/800', 'lifestyle', 10, true),
  ('equipements', 'Équipements', 'https://picsum.photos/seed/fitora-equipment/800/800', 'lifestyle', 11, true),
  ('mode-homme', 'Mode Homme', 'https://picsum.photos/seed/fitora-menswear/800/800', 'lifestyle', 12, true);

-- -----------------------------------------------------------------------------
-- Produits + images + variantes
-- -----------------------------------------------------------------------------

-- 1. Maillot FITORA Performance
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, old_price, published)
  select 'maillot-fitora-performance', 'Maillot FITORA Performance', c.id, 'football',
    'Maillot technique respirant conçu pour les entraînements comme pour la compétition.',
    array['Tissu respirant anti-humidité', 'Coupe ergonomique', 'Col rond renforcé', 'Lavable en machine'],
    15000, 20000, true
  from categories c where c.slug = 'vetements'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, ord - 1 from p, unnest(array[
  'https://picsum.photos/seed/prod-1-a/900/1100',
  'https://picsum.photos/seed/prod-1-b/900/1100',
  'https://picsum.photos/seed/prod-1-c/900/1100'
]) with ordinality as t(u, ord);

insert into product_variants (product_id, size, color, color_hex, stock_available, stock_reserved, sku)
select p.id, s, col.name, col.hex, 12, 0, 'MAI-PERF-' || upper(left(col.name,2)) || '-' || s
from products p,
  (values ('Noir','#0a0a0a'), ('Vert','#39ff14'), ('Blanc','#ffffff')) as col(name, hex),
  unnest(array['S','M','L','XL','XXL']) as s
where p.slug = 'maillot-fitora-performance';

-- 2. Chaussures FITORA Runner X
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'chaussures-fitora-runner-x', 'Chaussures FITORA Runner X', c.id, 'running',
    'Chaussures de running légères avec amorti réactif.',
    array['Semelle à amorti réactif', 'Tige mesh respirante', 'Maintien renforcé du talon', 'Semelle antidérapante'],
    35000, true
  from categories c where c.slug = 'chaussures'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, ord - 1 from p, unnest(array[
  'https://picsum.photos/seed/prod-2-a/900/1100',
  'https://picsum.photos/seed/prod-2-b/900/1100',
  'https://picsum.photos/seed/prod-2-c/900/1100'
]) with ordinality as t(u, ord);

insert into product_variants (product_id, color, color_hex, shoe_size, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, sz, 8, 0, 'RUN-X-' || upper(left(col.name,2)) || '-' || sz
from products p,
  (values ('Noir/Vert','#0a0a0a'), ('Blanc','#ffffff')) as col(name, hex),
  unnest(array['39','40','41','42','43','44','45']) as sz
where p.slug = 'chaussures-fitora-runner-x';

-- 3. Survêtement FITORA Pro
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, old_price, published)
  select 'survetement-fitora-pro', 'Survêtement FITORA Pro', c.id, 'training',
    'Ensemble survêtement complet (veste + pantalon) idéal pour l''échauffement et la récupération.',
    array['Ensemble veste + pantalon', 'Poches zippées', 'Tissu doux non irritant', 'Coupe droite'],
    28000, 34000, true
  from categories c where c.slug = 'vetements'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, ord - 1 from p, unnest(array[
  'https://picsum.photos/seed/prod-3-a/900/1100',
  'https://picsum.photos/seed/prod-3-b/900/1100'
]) with ordinality as t(u, ord);

insert into product_variants (product_id, size, color, color_hex, stock_available, stock_reserved, sku)
select p.id, s, col.name, col.hex, 10, 0, 'SURV-PRO-' || upper(left(col.name,2)) || '-' || s
from products p,
  (values ('Noir','#0a0a0a'), ('Gris','#171717')) as col(name, hex),
  unnest(array['S','M','L','XL','XXL']) as s
where p.slug = 'survetement-fitora-pro';

-- 4. Short FITORA Training
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'short-fitora-training', 'Short FITORA Training', c.id, 'training',
    'Short d''entraînement léger avec poches latérales.',
    array['Tissu léger 4 sens', 'Poches zippées', 'Ceinture élastique ajustable', 'Doublure intérieure'],
    9000, true
  from categories c where c.slug = 'vetements'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-4-a/900/1100']) as u;

insert into product_variants (product_id, size, color, color_hex, stock_available, stock_reserved, sku)
select p.id, s, col.name, col.hex, 15, 0, 'SHORT-TR-' || upper(left(col.name,2)) || '-' || s
from products p,
  (values ('Noir','#0a0a0a'), ('Vert','#39ff14')) as col(name, hex),
  unnest(array['S','M','L','XL']) as s
where p.slug = 'short-fitora-training';

-- 5. Sac FITORA Sport
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'sac-fitora-sport', 'Sac FITORA Sport', c.id, 'lifestyle',
    'Sac de sport spacieux avec compartiment chaussures séparé.',
    array['Compartiment chaussures séparé', 'Bandoulière réglable', 'Résistant à l''eau', 'Grande capacité 35L'],
    18000, true
  from categories c where c.slug = 'accessoires'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-5-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, 'Noir/Vert', '#0a0a0a', 25, 0, 'SAC-SPORT-01' from products p where p.slug = 'sac-fitora-sport';

-- 6. Ballon FITORA Elite
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'ballon-fitora-elite', 'Ballon FITORA Elite', c.id, 'football',
    'Ballon de football taille 5, conçu pour un vol stable et une excellente touche.',
    array['Taille officielle 5', 'Revêtement PU résistant', 'Chambre à air latex', 'Match & entraînement'],
    12000, true
  from categories c where c.slug = 'equipements'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-6-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, 'Blanc/Vert', '#39ff14', 40, 0, 'BALLON-ELITE-01' from products p where p.slug = 'ballon-fitora-elite';

-- 7. Legging FITORA Active
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'legging-fitora-active', 'Legging FITORA Active', c.id, 'fitness',
    'Legging taille haute extensible, conçu pour le fitness et la musculation.',
    array['Taille haute maintien', 'Tissu extensible 4 sens', 'Poche téléphone', 'Non transparent à l''effort'],
    14000, true
  from categories c where c.slug = 'vetements'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-7-a/900/1100']) as u;

insert into product_variants (product_id, size, color, color_hex, stock_available, stock_reserved, sku)
select p.id, s, col.name, col.hex, 10, 0, 'LEG-ACT-' || upper(left(col.name,2)) || '-' || s
from products p,
  (values ('Noir','#0a0a0a'), ('Gris','#171717')) as col(name, hex),
  unnest(array['S','M','L','XL']) as s
where p.slug = 'legging-fitora-active';

-- 8. T-shirt FITORA Performance
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 't-shirt-fitora-performance', 'T-shirt FITORA Performance', c.id, 'training',
    'T-shirt technique ultra-léger avec traitement anti-odeur.',
    array['Traitement anti-odeur', 'Tissu ultra-léger', 'Coupe droite', 'Col rond'],
    8000, true
  from categories c where c.slug = 'vetements'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-8-a/900/1100']) as u;

insert into product_variants (product_id, size, color, color_hex, stock_available, stock_reserved, sku)
select p.id, s, col.name, col.hex, 14, 0, 'TSH-PERF-' || upper(left(col.name,2)) || '-' || s
from products p,
  (values ('Noir','#0a0a0a'), ('Blanc','#ffffff'), ('Vert','#39ff14')) as col(name, hex),
  unnest(array['S','M','L','XL']) as s
where p.slug = 't-shirt-fitora-performance';

-- 9. Chaussures FITORA Football Pro
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, old_price, published)
  select 'chaussures-fitora-football-pro', 'Chaussures FITORA Football Pro', c.id, 'football',
    'Crampons moulés pour terrain sec, conçus pour l''accélération et la précision de frappe.',
    array['Crampons moulés (FG)', 'Empeigne synthétique texturée', 'Semelle propulsive', 'Maintien latéral renforcé'],
    32000, 39000, true
  from categories c where c.slug = 'chaussures'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-9-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, shoe_size, stock_available, stock_reserved, sku)
select p.id, 'Noir/Vert', '#0a0a0a', sz, 6, 0, 'FOOT-PRO-' || sz
from products p, unnest(array['39','40','41','42','43','44','45']) as sz
where p.slug = 'chaussures-fitora-football-pro';

-- 10. Veste FITORA Training
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'veste-fitora-training', 'Veste FITORA Training', c.id, 'training',
    'Veste coupe-vent légère avec capuche amovible.',
    array['Coupe-vent déperlant', 'Capuche amovible', 'Poches zippées', 'Bandes réfléchissantes'],
    25000, true
  from categories c where c.slug = 'vetements'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-10-a/900/1100']) as u;

insert into product_variants (product_id, size, color, color_hex, stock_available, stock_reserved, sku)
select p.id, s, col.name, col.hex, 9, 0, 'VESTE-TR-' || upper(left(col.name,2)) || '-' || s
from products p,
  (values ('Noir','#0a0a0a'), ('Gris','#171717')) as col(name, hex),
  unnest(array['S','M','L','XL']) as s
where p.slug = 'veste-fitora-training';

-- 11. Montre FITORA Classic
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, old_price, published)
  select 'montre-fitora-classic', 'Montre FITORA Classic', c.id, 'lifestyle',
    'Montre homme au design sobre et robuste, étanche pour un usage quotidien comme sportif.',
    array['Étanche 30m', 'Bracelet acier inoxydable', 'Verre anti-rayures', 'Garantie 12 mois'],
    22000, 28000, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-11-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 15, 0, 'MONTRE-CL-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Argent','#9a9a9a')) as col(name, hex)
where p.slug = 'montre-fitora-classic';

-- 12. Casque Audio FITORA Beat
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'casque-audio-fitora-beat', 'Casque Audio FITORA Beat', c.id, 'lifestyle',
    'Casque audio sans fil avec basses renforcées et autonomie longue durée.',
    array['Bluetooth 5.0', 'Autonomie 20h', 'Réduction de bruit passive', 'Pliable et compact'],
    19000, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-12-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 15, 0, 'CASQUE-BT-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Noir/Vert','#39ff14')) as col(name, hex)
where p.slug = 'casque-audio-fitora-beat';

-- 13. Sac Bandoulière FITORA Urban
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'sac-bandouliere-fitora-urban', 'Sac Bandoulière FITORA Urban', c.id, 'lifestyle',
    'Sac bandoulière homme au format compact, idéal pour la ville.',
    array['Compartiment principal + poches', 'Bandoulière ajustable', 'Tissu résistant', 'Format compact'],
    16000, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-13-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 15, 0, 'SAC-URB-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Gris','#171717')) as col(name, hex)
where p.slug = 'sac-bandouliere-fitora-urban';

-- 14. Lunettes de Soleil FITORA Shield
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'lunettes-de-soleil-fitora-shield', 'Lunettes de Soleil FITORA Shield', c.id, 'lifestyle',
    'Lunettes de soleil homme avec protection UV400, monture légère.',
    array['Protection UV400', 'Monture légère incassable', 'Verres antireflets', 'Étui inclus'],
    11000, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-14-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 15, 0, 'LUN-SHD-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Noir mat','#171717')) as col(name, hex)
where p.slug = 'lunettes-de-soleil-fitora-shield';

-- 15. Ceinture FITORA Leather
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'ceinture-fitora-leather', 'Ceinture FITORA Leather', c.id, 'lifestyle',
    'Ceinture homme en cuir texturé avec boucle métallique.',
    array['Cuir texturé résistant', 'Boucle métal ajustable', 'Réversible noir/marron', 'Longueur ajustable'],
    9500, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-15-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 15, 0, 'CEINT-LTH-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Marron','#171717')) as col(name, hex)
where p.slug = 'ceinture-fitora-leather';

-- 16. Portefeuille FITORA Homme
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'portefeuille-fitora-homme', 'Portefeuille FITORA Homme', c.id, 'lifestyle',
    'Portefeuille homme compact, plusieurs compartiments cartes et billets.',
    array['Compartiments multiples', 'Format compact', 'Cuir synthétique résistant', 'Fermeture sécurisée'],
    8500, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-16-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, 'Noir', '#0a0a0a', 15, 0, 'PORTEF-HOM-01' from products p where p.slug = 'portefeuille-fitora-homme';

-- 17. Casquette FITORA Street
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'casquette-fitora-street', 'Casquette FITORA Street', c.id, 'lifestyle',
    'Casquette homme en coton avec logo brodé FITORA, sangle arrière ajustable.',
    array['100% coton', 'Logo brodé FITORA', 'Sangle ajustable', 'Visière incurvée'],
    7000, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-17-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 20, 0, 'CASQ-STR-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Vert','#39ff14'), ('Blanc','#ffffff')) as col(name, hex)
where p.slug = 'casquette-fitora-street';

-- 18. Bracelet FITORA Steel
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'bracelet-fitora-steel', 'Bracelet FITORA Steel', c.id, 'lifestyle',
    'Bracelet homme en acier inoxydable, design minimaliste.',
    array['Acier inoxydable', 'Fermoir sécurisé', 'Design minimaliste', 'Ne noircit pas'],
    6000, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-18-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 20, 0, 'BRAC-STL-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Argent','#9a9a9a')) as col(name, hex)
where p.slug = 'bracelet-fitora-steel';

-- 19. Bonnet FITORA Winter
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'bonnet-fitora-winter', 'Bonnet FITORA Winter', c.id, 'lifestyle',
    'Bonnet homme en maille tricotée avec patch FITORA.',
    array['Maille tricotée épaisse', 'Patch FITORA cousu', 'Taille unique extensible', 'Doublure douce'],
    6500, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-19-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 20, 0, 'BONNET-WI-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Gris','#171717')) as col(name, hex)
where p.slug = 'bonnet-fitora-winter';

-- 20. Gants FITORA Style
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'gants-fitora-style', 'Gants FITORA Style', c.id, 'lifestyle',
    'Gants homme en similicuir, doublure douce, compatibles écran tactile.',
    array['Similicuir résistant', 'Doublure intérieure douce', 'Compatible écran tactile', 'Coupe ajustée'],
    7500, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-20-a/900/1100']) as u;

insert into product_variants (product_id, size, color, color_hex, stock_available, stock_reserved, sku)
select p.id, s, 'Noir', '#0a0a0a', 10, 0, 'GANTS-STY-' || s
from products p, unnest(array['S','M','L','XL']) as s
where p.slug = 'gants-fitora-style';

-- 21. Porte-clés FITORA Logo
with p as (
  insert into products (slug, name, category_id, sport, description, features, price, published)
  select 'porte-cles-fitora-logo', 'Porte-clés FITORA Logo', c.id, 'lifestyle',
    'Porte-clés en métal avec logo FITORA gravé.',
    array['Métal robuste', 'Logo FITORA gravé', 'Anneau renforcé', 'Format compact'],
    3000, true
  from categories c where c.slug = 'mode-homme'
  returning id
)
insert into product_images (product_id, url, position)
select id, u, 0 from p, unnest(array['https://picsum.photos/seed/prod-21-a/900/1100']) as u;

insert into product_variants (product_id, color, color_hex, stock_available, stock_reserved, sku)
select p.id, col.name, col.hex, 30, 0, 'PORTECLE-' || upper(left(col.name,2))
from products p, (values ('Noir','#0a0a0a'), ('Argent','#9a9a9a')) as col(name, hex)
where p.slug = 'porte-cles-fitora-logo';

-- =============================================================================
-- Compte administrateur
-- =============================================================================
-- Supabase Auth ne permet pas de créer un utilisateur avec mot de passe
-- directement en SQL. Pour créer le premier compte administrateur :
--   1. Inscrivez-vous normalement sur /register (ou via Supabase Auth UI).
--   2. Dans Supabase, table `profiles`, changez la colonne `role` de ce
--      compte de 'customer' à 'admin' :
--
--      update profiles set role = 'admin' where email = 'votre-email@fitora.ci';
-- =============================================================================
