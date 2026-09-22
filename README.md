# FITORA — Plateforme e-commerce sportive

**SPORT • STYLE • PERFORMANCE**

FITORA est une plateforme e-commerce spécialisée dans la vente de vêtements,
chaussures, accessoires et équipements sportifs, pensée pour la Côte d'Ivoire
(prix en FCFA, paiement Mobile Money manuel, contact WhatsApp) avec une
architecture prête à évoluer vers d'autres marchés.

---

## État du projet (dernière mise à jour de cet audit)

Cette section résume, honnêtement, ce qui a été vérifié et ce qui reste à
faire suite au dernier audit technique complet.

### ⚠️ Correctif de sécurité critique (dernier audit)
`create_order_transaction()` faisait confiance à un montant de réduction
fourni tel quel par le navigateur, et la consommation d'un code de réduction
(incrémentation de `used_count`) se faisait dans un second appel séparé,
après la création de la commande. Un client pouvait donc, en appelant l'API
Supabase directement (hors interface), obtenir une réduction arbitraire ou
réutiliser indéfiniment un code à usage unique. **Corrigé** : la fonction
recalcule désormais elle-même le montant depuis `discount_codes` et
incrémente `used_count` dans la même transaction atomique que la commande.
Voir `supabase/phase4_affiliate_commissions_migration.sql`, section 0.
**Cette migration doit être appliquée dès que possible.**

### Fait et vérifié (TypeScript + build de production, niveau code uniquement)
- Découpage du bundle client par route (`React.lazy`) + bundle admin déjà séparé.
- Cache + déduplication des requêtes Supabase (paramètres boutique, produits,
  catégories) avec invalidation câblée sur les mutations admin.
- Pause du polling des notifications quand l'onglet est en arrière-plan.
- Correction d'un bug réel de suppression de notification (RLS manquante).
- Image hero : upload vers Supabase Storage au lieu d'un Base64 en base.
- Système de parrainage (codes, liens, récompenses automatiques et sécurisées
  côté base), géolocalisation avec consentement explicite, réseaux sociaux
  gérés depuis l'admin, tableau de bord clients avec présence en temps réel.
- **Correction d'un bug critique** : `adminCustomerService.ts` lisait un faux
  magasin `localStorage` jamais alimenté par le vrai flux Supabase — la page
  admin "Clients" n'affichait donc aucun client réel avant cette correction.
- Système de traduction FR/EN (voir section dédiée ci-dessous).

### Traduction FR/EN — couverture réelle, pas survendue
Un vrai système i18n est en place (`src/i18n/`), fonctionnel, avec sélecteur
de langue, persistance et bascule instantanée. **Cependant, la couverture
n'est pas à 100 % de l'application.** Sont entièrement traduits : l'en-tête,
le pied de page, les pages de connexion/inscription, la mise en page du
compte client et de l'administration, la page d'accueil, les pages 404 et
"en construction", ainsi que le formatage des dates/nombres/prix dans toute
l'application (automatique, sans changement de code supplémentaire). **Ne
sont pas encore traduits** : le contenu détaillé des pages Boutique, Fiche
produit, Panier, Paiement, la totalité du contenu des pages admin (tableaux,
formulaires), les sous-pages du compte client (commandes, favoris, adresses,
messages, parrainage), et les messages toast/erreurs dispersés dans les
services. Ces textes restent en français quelle que soit la langue
sélectionnée — ils ne cassent rien, ils ne sont simplement pas encore migrés
vers le système de traduction.

### Nécessite une action manuelle de votre part dans Supabase
Voir `supabase/phase3_features_migration.sql` et
`supabase/phase4_affiliate_commissions_migration.sql` — ces fichiers
contiennent **toutes** les migrations en attente (notifications, Storage,
parrainage historique, géolocalisation, réseaux sociaux, présence, correctif
de sécurité des codes de réduction, code de réduction persistant par
affilié, suivi des clics, commissions avec statuts pending/validated/paid/
cancelled, gestion admin). Rien de tout cela ne fonctionne tant que ces
fichiers n'ont pas été exécutés dans l'éditeur SQL Supabase, **dans
l'ordre** (phase3 avant phase4). Le fichier phase3 inclut aussi la ligne
(commentée) pour activer Realtime sur `shop_settings`.

### Non vérifié
Aucun test live contre une instance Supabase réelle n'a été possible depuis
l'environnement de développement utilisé pour cet audit (pas d'accès réseau
sortant vers Supabase). Tout ce qui précède a été vérifié au niveau code
(TypeScript, build de production) uniquement — un test manuel de bout en bout
après application des migrations reste nécessaire.

---

## Stack technique

- **React 19 + TypeScript + Vite**
- **Tailwind CSS v4** (charte graphique FITORA : noir `#0A0A0A`, vert électrique
  `#39FF14`, blanc, gris foncé `#171717`, polices Poppins/Montserrat)
- **Framer Motion** pour les animations
- **Zustand** pour le panier, les favoris, l'authentification, les toasts, la langue
- **React Router v7**
- **Supabase** (PostgreSQL + Auth + Storage) — voir la section _Backend_ ci-dessous
- Hébergement cible : **Cloudflare Pages**

Architecture monolithique modulaire : un seul frontend React qui appelle
directement Supabase, sans backend Node/NestJS intermédiaire.

---

## ⚠️ Mode démonstration (important)

**Ce projet fonctionne dès `npm install && npm run dev`, sans aucune
configuration Supabase.** Tant que `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` ne sont pas renseignées dans `.env`, l'application
utilise :

- des **données de démonstration** en mémoire (`src/services/mockData.ts`) :
  11 catégories, 10 produits avec variantes, stock, avis ;
- le **localStorage du navigateur** pour simuler les tables Supabase
  (comptes, commandes, adresses, messages, paramètres, éditions admin).

Chaque service dans `src/services/*.ts` est écrit pour préfigurer exactement
les futures requêtes Supabase (mêmes noms de champs, mêmes signatures de
fonctions). **Remplacer le mode démo par le vrai backend ne nécessite pas de
réécrire les pages** : il suffit de remplacer l'implémentation interne de ces
services par des appels `supabase.from(...)` / `supabase.auth.*` (le client
est déjà prêt dans `src/lib/supabase.ts`).

| Domaine | Fichier mock (démo) | Table Supabase cible |
|---|---|---|
| Produits / catégories | `mockData.ts`, `productService.ts`, `categoryService.ts`, `adminProductService.ts`, `adminCategoryService.ts` | `products`, `product_images`, `product_variants`, `categories` |
| Authentification | `authService.ts`, `store/authStore.ts` | Supabase Auth + `profiles` |
| Adresses | `addressService.ts` | `addresses` |
| Commandes | `orderService.ts` | `orders`, `order_items`, `inventory_movements` |
| Messages de contact | `messageService.ts` | `contact_messages` |
| Paramètres boutique | `settingsService.ts` | `shop_settings` |

Le **premier compte créé via `/register`** devient automatiquement
administrateur (voir `authService.ts`), afin de pouvoir tester tout de suite
`/admin`. Ce comportement de démo est bien sûr à retirer une fois Supabase
branché (voir plus bas comment promouvoir un admin en base).

---

## Démarrage rapide

```bash
npm install
npm run dev
```

L'application est disponible sur `http://localhost:5173`.

- Boutique : `/`
- Créer un compte : `/register`
- Espace client : `/compte` (nécessite un compte)
- Espace admin : `/admin/login` (utiliser le premier compte créé)

### Scripts disponibles

```bash
npm run dev       # serveur de développement
npm run build     # build de production (tsc -b && vite build) dans /dist
npm run preview   # sert le build de production localement
```

---

## Configuration (`.env`)

Copiez `.env.example` vers `.env` :

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_WHATSAPP_NUMBER=2250789777767
```

- Tant que `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` sont vides,
  l'application tourne en **mode démonstration** (voir plus haut).
- `VITE_WHATSAPP_NUMBER` est utilisé par tous les boutons WhatsApp du site
  (bouton flottant, fiche produit, page contact, confirmation de commande).

---

## Brancher Supabase (backend réel)

1. Créez un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécutez dans l'ordre :
   - `supabase/schema.sql` — tables, types, index, triggers de réservation de
     stock, policies **Row Level Security** (voir section _Sécurité_).
   - `supabase/migration.sql` — fonction transactionnelle sécurisée de
     création de commande (verrouillage de stock, validation prix côté
     serveur).
   - `supabase/phase3_features_migration.sql` — notifications (correctif
     RLS), Storage (image hero), parrainage, géolocalisation avec
     consentement, réseaux sociaux, présence client. Lisez les commentaires
     en tête de fichier avant exécution ; contient une ligne à décommenter
     pour activer Realtime sur `shop_settings`.
   - `supabase/phase4_affiliate_commissions_migration.sql` — **correctif de
     sécurité critique** sur les codes de réduction (voir plus haut), code
     de réduction persistant par affilié, suivi des clics, commissions avec
     statuts et gestion admin. À exécuter après phase3.
   - `supabase/seed.sql` — 11 catégories + 10 produits de démonstration avec
     variantes (tailles, couleurs, pointures).
3. Dans **Project Settings > API**, copiez `Project URL` et `anon public key`
   dans votre `.env`.
4. (Optionnel) Activez l'extension **pg_cron** si vous souhaitez la libération
   automatique des réservations de stock après 24h (requête fournie en
   commentaire dans `schema.sql`).
5. Créez le premier compte administrateur :
   - Inscrivez-vous normalement via `/register`.
   - Dans Supabase, table `profiles`, passez son `role` de `customer` à
     `admin` :
     ```sql
     update profiles set role = 'admin' where email = 'vous@fitora.ci';
     ```
6. Pour les photos produits, créez un bucket **Supabase Storage** (ex.
   `product-images`) en accès public en lecture ; les URLs générées
   remplaceront alors les images `picsum.photos` utilisées en démo.
7. Remplacez progressivement l'implémentation de chaque fichier
   `src/services/*.ts` par de vrais appels `supabase.from(...)` — les pages et
   composants n'ont pas besoin d'être modifiés.

---

## Sécurité (Row Level Security)

Le fichier `supabase/schema.sql` active RLS sur toutes les tables et définit :

- **Visiteurs** : lecture des produits et catégories publiés uniquement.
- **Clients authentifiés** : gèrent leur propre profil, leurs adresses, leurs
  favoris ; créent des commandes et ne consultent que les leurs ; ne peuvent
  ni modifier un prix, un stock, ou le statut d'une commande, ni accéder aux
  données d'un autre client.
- **Administrateurs** (`profiles.role = 'admin'`) : accès complet aux
  produits, catégories, commandes, stocks, clients, messages, paramètres.

La clé `SUPABASE_SERVICE_ROLE_KEY` **n'est jamais utilisée côté frontend** —
seule la clé publique `anon` est nécessaire, RLS se chargeant du reste.

---

## Déploiement sur Cloudflare Pages

1. Poussez le projet sur un dépôt Git (GitHub/GitLab).
2. Dans Cloudflare Pages, **Create a project > Connect to Git**.
3. Paramètres de build :
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
4. Variables d'environnement (Settings > Environment variables) :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WHATSAPP_NUMBER`
5. Le fichier `public/_redirects` (déjà inclus) redirige toutes les routes
   vers `index.html`, nécessaire pour le routage côté client (React Router)
   sur les rechargements de page (`/boutique`, `/produit/xxx`, `/admin`, ...).
6. Déployez — Cloudflare Pages rebuild automatiquement à chaque push.

---

## Structure du projet

```
src/
├── components/       # UI réutilisable (Button, Badge, ProductCard, Header, Footer, CartDrawer...)
├── pages/            # Une page par route (Home, Shop, Product, Cart, Contact, Account/*, Admin/*)
├── layouts/          # MainLayout (client), AccountLayout, AdminLayout
├── features/         # Logique groupée par domaine (auth, admin, products, orders)
├── services/         # Accès aux données Supabase (produits, commandes, parrainage, position...)
├── store/            # Zustand : panier, favoris, auth, toasts
├── i18n/             # Système de traduction FR/EN (store + locales/fr.json, en.json)
├── hooks/            # Hooks partagés (ex. usePresenceHeartbeat)
├── types/            # Types TypeScript du domaine (Product, Order, Category, ...)
├── lib/              # Formatage FCFA/dates (sensible à la langue), client Supabase, liens WhatsApp
└── styles/           # Thème Tailwind (charte FITORA)
supabase/
├── schema.sql                      # Tables, types, RLS, triggers de base
├── migration.sql                   # Fonction transactionnelle de commande sécurisée
├── phase3_features_migration.sql   # Notifications, Storage, parrainage, géoloc, réseaux sociaux, présence
├── phase4_affiliate_commissions_migration.sql  # Correctif sécurité codes promo + commissions affiliés
└── seed.sql                        # Données de démonstration
```

---

## Fonctionnalités livrées

### Espace public / client
Accueil, catalogue avec recherche/filtres/tri/pagination, fiche produit
(galerie, variantes, avis, produits similaires), panier persistant (Zustand),
favoris, inscription/connexion (compte obligatoire pour commander), checkout
avec choix livraison/retrait et moyen de paiement manuel (Wave, Orange Money,
MTN Money, Moov Money, paiement à la livraison), instructions de paiement +
envoi de la preuve sur WhatsApp, suivi de commande avec timeline de statut,
gestion du profil/adresses/favoris, formulaire de contact, bouton WhatsApp
flottant.

### Espace administrateur (`/admin`)
Dashboard (chiffre d'affaires, commandes, paiements à confirmer, ruptures de
stock, graphiques de ventes), gestion des produits (CRUD + variantes +
publication), gestion des catégories, gestion des commandes (recherche,
filtre par statut, confirmation de paiement, changement de statut, contact
WhatsApp), gestion du stock (corrections, alertes de rupture), gestion des
clients (statistiques d'achat), gestion des messages de contact
(non lus/lus/répondus/archivés), paramètres de la boutique (WhatsApp, moyens
de paiement, frais de livraison, etc.).

---

## Limites connues du mode démonstration

- Les données (comptes, commandes, produits modifiés par l'admin) sont
  stockées dans le `localStorage` du navigateur : elles ne sont pas partagées
  entre appareils/navigateurs tant que Supabase n'est pas branché.
- La libération automatique des réservations de stock après 24h est fournie
  en SQL (`pg_cron`) mais n'est active qu'une fois Supabase configuré.
- Les images sont des placeholders (`picsum.photos`) à remplacer par de
  vraies photos produits (Supabase Storage).
