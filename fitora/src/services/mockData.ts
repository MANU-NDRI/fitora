import type { Category, Product } from "@/types";
import { slugify } from "@/lib/format";

// ---------------------------------------------------------------------------
// Données de démonstration FITORA.
// Cette structure imite exactement les tables Supabase `categories` et
// `products` (+ `product_images`, `product_variants`) décrites dans le
// cahier des charges, afin qu'il soit trivial de remplacer ces constantes par
// de vraies requêtes Supabase à l'étape backend.
// ---------------------------------------------------------------------------

function img(seed: string, w = 900, h = 1100) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

export const CATEGORIES: Category[] = [
  { id: "cat-football", slug: "football", name: "Football", sport: "football", image: img("fitora-football", 800, 800), productCount: 0, order: 1, published: true },
  { id: "cat-basketball", slug: "basketball", name: "Basketball", sport: "basketball", image: img("fitora-basketball", 800, 800), productCount: 0, order: 2, published: true },
  { id: "cat-running", slug: "running", name: "Running", sport: "running", image: img("fitora-running", 800, 800), productCount: 0, order: 3, published: true },
  { id: "cat-fitness", slug: "fitness", name: "Fitness", sport: "fitness", image: img("fitora-fitness", 800, 800), productCount: 0, order: 4, published: true },
  { id: "cat-training", slug: "training", name: "Training", sport: "training", image: img("fitora-training", 800, 800), productCount: 0, order: 5, published: true },
  { id: "cat-tennis", slug: "tennis", name: "Tennis", sport: "tennis", image: img("fitora-tennis", 800, 800), productCount: 0, order: 6, published: true },
  { id: "cat-combat", slug: "sports-de-combat", name: "Sports de combat", sport: "combat", image: img("fitora-combat", 800, 800), productCount: 0, order: 7, published: true },
  { id: "cat-chaussures", slug: "chaussures", name: "Chaussures", sport: "lifestyle", image: img("fitora-shoes", 800, 800), productCount: 0, order: 8, published: true },
  { id: "cat-vetements", slug: "vetements", name: "Vêtements", sport: "lifestyle", image: img("fitora-clothes", 800, 800), productCount: 0, order: 9, published: true },
  { id: "cat-accessoires", slug: "accessoires", name: "Accessoires", sport: "lifestyle", image: img("fitora-accessories", 800, 800), productCount: 0, order: 10, published: true },
  { id: "cat-equipements", slug: "equipements", name: "Équipements", sport: "lifestyle", image: img("fitora-equipment", 800, 800), productCount: 0, order: 11, published: true },
  { id: "cat-mode-homme", slug: "mode-homme", name: "Mode Homme", sport: "lifestyle", image: img("fitora-menswear", 800, 800), productCount: 0, order: 12, published: true },
];

const SIZES = ["S", "M", "L", "XL", "XXL"];
const SHOE_SIZES = ["39", "40", "41", "42", "43", "44", "45"];

interface RawProduct {
  name: string;
  categorySlug: string;
  sport: Product["sport"];
  price: number;
  oldPrice?: number;
  description: string;
  features: string[];
  badges: Product["badges"];
  kind: "clothing" | "shoes" | "gear";
  colors: { name: string; hex: string }[];
  daysAgo: number;
  salesCount: number;
  rating: number;
  reviewCount: number;
}

const RAW_PRODUCTS: RawProduct[] = [
  {
    name: "Maillot FITORA Performance",
    categorySlug: "vetements",
    sport: "football",
    price: 15000,
    oldPrice: 20000,
    description:
      "Maillot technique respirant conçu pour les entraînements comme pour la compétition. Tissu léger qui évacue la transpiration et coupe ergonomique pour une liberté de mouvement totale.",
    features: ["Tissu respirant anti-humidité", "Coupe ergonomique", "Col rond renforcé", "Lavable en machine"],
    badges: ["promo", "best-seller"],
    kind: "clothing",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Vert", hex: "#39ff14" }, { name: "Blanc", hex: "#ffffff" }],
    daysAgo: 40,
    salesCount: 214,
    rating: 4.6,
    reviewCount: 58,
  },
  {
    name: "Chaussures FITORA Runner X",
    categorySlug: "chaussures",
    sport: "running",
    price: 35000,
    description:
      "Chaussures de running légères avec amorti réactif, pensées pour accompagner vos sorties longues comme vos fractionnés.",
    features: ["Semelle à amorti réactif", "Tige mesh respirante", "Maintien renforcé du talon", "Semelle extérieure antidérapante"],
    badges: ["nouveau"],
    kind: "shoes",
    colors: [{ name: "Noir/Vert", hex: "#0a0a0a" }, { name: "Blanc", hex: "#ffffff" }],
    daysAgo: 6,
    salesCount: 96,
    rating: 4.8,
    reviewCount: 31,
  },
  {
    name: "Survêtement FITORA Pro",
    categorySlug: "vetements",
    sport: "training",
    price: 28000,
    oldPrice: 34000,
    description:
      "Ensemble survêtement complet (veste + pantalon) idéal pour l'échauffement, la récupération ou la ville. Confort et style au quotidien.",
    features: ["Ensemble veste + pantalon", "Poches zippées", "Tissu doux non irritant", "Coupe droite"],
    badges: ["promo"],
    kind: "clothing",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Gris", hex: "#171717" }],
    daysAgo: 20,
    salesCount: 140,
    rating: 4.5,
    reviewCount: 44,
  },
  {
    name: "Short FITORA Training",
    categorySlug: "vetements",
    sport: "training",
    price: 9000,
    description:
      "Short d'entraînement léger avec poches latérales, parfait pour la salle, le running ou le football.",
    features: ["Tissu léger 4 sens", "Poches zippées", "Ceinture élastique ajustable", "Doublure intérieure"],
    badges: [],
    kind: "clothing",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Vert", hex: "#39ff14" }],
    daysAgo: 55,
    salesCount: 178,
    rating: 4.3,
    reviewCount: 37,
  },
  {
    name: "Sac FITORA Sport",
    categorySlug: "accessoires",
    sport: "lifestyle",
    price: 18000,
    description:
      "Sac de sport spacieux avec compartiment chaussures séparé, idéal pour le club, la salle ou les déplacements.",
    features: ["Compartiment chaussures séparé", "Bandoulière réglable", "Tissu résistant à l'eau", "Grande capacité 35L"],
    badges: [],
    kind: "gear",
    colors: [{ name: "Noir/Vert", hex: "#0a0a0a" }],
    daysAgo: 70,
    salesCount: 63,
    rating: 4.4,
    reviewCount: 19,
  },
  {
    name: "Ballon FITORA Elite",
    categorySlug: "equipements",
    sport: "football",
    price: 12000,
    description: "Ballon de football taille 5, conçu pour un vol stable et une excellente sensation de touche.",
    features: ["Taille officielle 5", "Revêtement PU résistant", "Chambre à air latex", "Utilisation match & entraînement"],
    badges: ["best-seller"],
    kind: "gear",
    colors: [{ name: "Blanc/Vert", hex: "#39ff14" }],
    daysAgo: 90,
    salesCount: 302,
    rating: 4.7,
    reviewCount: 71,
  },
  {
    name: "Legging FITORA Active",
    categorySlug: "vetements",
    sport: "fitness",
    price: 14000,
    description: "Legging taille haute extensible, conçu pour le fitness et la musculation, avec maintien optimal.",
    features: ["Taille haute maintien", "Tissu extensible 4 sens", "Poche téléphone", "Non transparent à l'effort"],
    badges: ["nouveau"],
    kind: "clothing",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Gris", hex: "#171717" }],
    daysAgo: 4,
    salesCount: 52,
    rating: 4.6,
    reviewCount: 22,
  },
  {
    name: "T-shirt FITORA Performance",
    categorySlug: "vetements",
    sport: "training",
    price: 8000,
    description: "T-shirt technique ultra-léger avec traitement anti-odeur, pour tous types d'entraînements.",
    features: ["Traitement anti-odeur", "Tissu ultra-léger", "Coupe droite", "Col rond"],
    badges: ["nouveau"],
    kind: "clothing",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Blanc", hex: "#ffffff" }, { name: "Vert", hex: "#39ff14" }],
    daysAgo: 3,
    salesCount: 88,
    rating: 4.4,
    reviewCount: 26,
  },
  {
    name: "Chaussures FITORA Football Pro",
    categorySlug: "chaussures",
    sport: "football",
    price: 32000,
    oldPrice: 39000,
    description: "Crampons moulés pour terrain sec, conçus pour l'accélération et la précision de frappe.",
    features: ["Crampons moulés (FG)", "Empeigne synthétique texturée", "Semelle propulsive", "Maintien latéral renforcé"],
    badges: ["promo"],
    kind: "shoes",
    colors: [{ name: "Noir/Vert", hex: "#0a0a0a" }],
    daysAgo: 15,
    salesCount: 121,
    rating: 4.5,
    reviewCount: 33,
  },
  {
    name: "Veste FITORA Training",
    categorySlug: "vetements",
    sport: "training",
    price: 25000,
    description: "Veste coupe-vent légère avec capuche amovible, idéale pour l'échauffement extérieur.",
    features: ["Coupe-vent déperlant", "Capuche amovible", "Poches zippées", "Bandes réfléchissantes"],
    badges: ["nouveau"],
    kind: "clothing",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Gris", hex: "#171717" }],
    daysAgo: 8,
    salesCount: 41,
    rating: 4.2,
    reviewCount: 14,
  },
  {
    name: "Montre FITORA Classic",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 22000,
    oldPrice: 28000,
    description:
      "Montre homme au design sobre et robuste, bracelet acier ou cuir, étanche pour un usage quotidien comme sportif.",
    features: ["Étanche 30m", "Bracelet acier inoxydable", "Verre anti-rayures", "Garantie 12 mois"],
    badges: ["promo", "nouveau"],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Argent", hex: "#9a9a9a" }],
    daysAgo: 5,
    salesCount: 34,
    rating: 4.6,
    reviewCount: 18,
  },
  {
    name: "Casque Audio FITORA Beat",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 19000,
    description:
      "Casque audio sans fil avec basses renforcées, autonomie longue durée, parfait pour le sport comme le quotidien.",
    features: ["Bluetooth 5.0", "Autonomie 20h", "Réduction de bruit passive", "Pliable et compact"],
    badges: ["nouveau"],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Noir/Vert", hex: "#39ff14" }],
    daysAgo: 2,
    salesCount: 27,
    rating: 4.5,
    reviewCount: 11,
  },
  {
    name: "Sac Bandoulière FITORA Urban",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 16000,
    description:
      "Sac bandoulière homme au format compact, idéal pour la ville, avec compartiments organisés pour l'essentiel.",
    features: ["Compartiment principal + poches", "Bandoulière ajustable", "Tissu résistant", "Format compact"],
    badges: [],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Gris", hex: "#171717" }],
    daysAgo: 30,
    salesCount: 22,
    rating: 4.3,
    reviewCount: 9,
  },
  {
    name: "Lunettes de Soleil FITORA Shield",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 11000,
    description: "Lunettes de soleil homme avec protection UV400, monture légère adaptée au sport et à la ville.",
    features: ["Protection UV400", "Monture légère incassable", "Verres antireflets", "Étui inclus"],
    badges: ["nouveau"],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Noir mat", hex: "#171717" }],
    daysAgo: 6,
    salesCount: 15,
    rating: 4.4,
    reviewCount: 7,
  },
  {
    name: "Ceinture FITORA Leather",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 9500,
    description: "Ceinture homme en cuir texturé avec boucle métallique, un essentiel du dressing masculin.",
    features: ["Cuir texturé résistant", "Boucle métal ajustable", "Réversible noir/marron", "Longueur ajustable"],
    badges: [],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Marron", hex: "#171717" }],
    daysAgo: 45,
    salesCount: 19,
    rating: 4.2,
    reviewCount: 8,
  },
  {
    name: "Portefeuille FITORA Homme",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 8500,
    description: "Portefeuille homme compact en cuir synthétique, plusieurs compartiments cartes et billets.",
    features: ["Compartiments multiples", "Format compact", "Cuir synthétique résistant", "Fermeture sécurisée"],
    badges: ["nouveau"],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }],
    daysAgo: 3,
    salesCount: 12,
    rating: 4.1,
    reviewCount: 5,
  },
  {
    name: "Casquette FITORA Street",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 7000,
    description: "Casquette homme en coton avec logo brodé FITORA, sangle arrière ajustable pour un maintien parfait.",
    features: ["100% coton", "Logo brodé FITORA", "Sangle ajustable", "Visière incurvée"],
    badges: ["nouveau"],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Vert", hex: "#39ff14" }, { name: "Blanc", hex: "#ffffff" }],
    daysAgo: 1,
    salesCount: 8,
    rating: 4.3,
    reviewCount: 4,
  },
  {
    name: "Bracelet FITORA Steel",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 6000,
    description: "Bracelet homme en acier inoxydable, design minimaliste, se porte seul ou avec la montre FITORA.",
    features: ["Acier inoxydable", "Fermoir sécurisé", "Design minimaliste", "Ne noircit pas"],
    badges: [],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Argent", hex: "#9a9a9a" }],
    daysAgo: 12,
    salesCount: 6,
    rating: 4.2,
    reviewCount: 3,
  },
  {
    name: "Bonnet FITORA Winter",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 6500,
    description: "Bonnet homme en maille tricotée avec patch FITORA, chaud et confortable pour l'hiver.",
    features: ["Maille tricotée épaisse", "Patch FITORA cousu", "Taille unique extensible", "Doublure douce"],
    badges: ["nouveau"],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Gris", hex: "#171717" }],
    daysAgo: 2,
    salesCount: 4,
    rating: 4.0,
    reviewCount: 2,
  },
  {
    name: "Gants FITORA Style",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 7500,
    description: "Gants homme en similicuir, doublure douce, pour un look urbain toute saison.",
    features: ["Similicuir résistant", "Doublure intérieure douce", "Compatible écran tactile", "Coupe ajustée"],
    badges: [],
    kind: "clothing",
    colors: [{ name: "Noir", hex: "#0a0a0a" }],
    daysAgo: 20,
    salesCount: 5,
    rating: 4.1,
    reviewCount: 3,
  },
  {
    name: "Porte-clés FITORA Logo",
    categorySlug: "mode-homme",
    sport: "lifestyle",
    price: 3000,
    description: "Porte-clés en métal avec logo FITORA gravé, un accessoire discret et durable.",
    features: ["Métal robuste", "Logo FITORA gravé", "Anneau renforcé", "Format compact"],
    badges: ["nouveau"],
    kind: "gear",
    colors: [{ name: "Noir", hex: "#0a0a0a" }, { name: "Argent", hex: "#9a9a9a" }],
    daysAgo: 1,
    salesCount: 2,
    rating: 4.0,
    reviewCount: 1,
  },
];

function buildVariants(p: RawProduct, productId: string): Product["variants"] {
  const variants: Product["variants"] = [];
  let i = 0;
  if (p.kind === "shoes") {
    for (const color of p.colors) {
      for (const shoeSize of SHOE_SIZES) {
        i += 1;
        variants.push({
          id: `${productId}-v${i}`,
          color: color.name,
          colorHex: color.hex,
          shoeSize,
          stockAvailable: Math.max(0, 12 - SHOE_SIZES.indexOf(shoeSize) - (color.name.length % 3)),
          stockReserved: i % 5 === 0 ? 1 : 0,
          sku: `${productId}-${color.name.slice(0, 2).toUpperCase()}-${shoeSize}`,
        });
      }
    }
  } else if (p.kind === "clothing") {
    for (const color of p.colors) {
      for (const size of SIZES) {
        i += 1;
        variants.push({
          id: `${productId}-v${i}`,
          color: color.name,
          colorHex: color.hex,
          size,
          stockAvailable: Math.max(0, 15 - SIZES.indexOf(size) * 2 - (color.name.length % 4)),
          stockReserved: i % 6 === 0 ? 2 : 0,
          sku: `${productId}-${color.name.slice(0, 2).toUpperCase()}-${size}`,
        });
      }
    }
  } else {
    for (const color of p.colors) {
      i += 1;
      variants.push({
        id: `${productId}-v${i}`,
        color: color.name,
        colorHex: color.hex,
        stockAvailable: 25,
        stockReserved: 0,
        sku: `${productId}-${color.name.slice(0, 2).toUpperCase()}`,
      });
    }
  }
  return variants;
}

function buildReviews(p: RawProduct, productId: string): Product["reviews"] {
  const sampleAuthors = ["Aya K.", "Mamadou S.", "Fatou D.", "Yves B.", "Chantal N.", "Ismael T."];
  const sampleComments = [
    "Très bonne qualité, correspond parfaitement à la description.",
    "Livraison rapide et produit conforme, je recommande.",
    "Bon rapport qualité-prix, taille bien comme indiqué.",
    "Matière agréable, je suis satisfait de mon achat.",
    "Exactement ce que je cherchais pour mes entraînements.",
  ];
  const count = Math.min(3, Math.max(1, Math.round(p.reviewCount / 20)));
  return Array.from({ length: count }).map((_, idx) => ({
    id: `${productId}-r${idx + 1}`,
    author: sampleAuthors[(idx + p.name.length) % sampleAuthors.length],
    rating: Math.min(5, Math.max(3, Math.round(p.rating + (idx % 2 === 0 ? 0 : -1)))),
    comment: sampleComments[(idx + p.name.length) % sampleComments.length],
    date: new Date(Date.now() - (p.daysAgo + idx * 3) * 86400000).toISOString(),
  }));
}

export const PRODUCTS: Product[] = RAW_PRODUCTS.map((p, index) => {
  const id = `prod-${index + 1}`;
  const category = CATEGORIES.find((c) => c.slug === p.categorySlug)!;
  const variants = buildVariants(p, id);
  const outOfStock = variants.every((v) => v.stockAvailable - v.stockReserved <= 0);
  const badges = outOfStock ? [...p.badges, "rupture" as const] : p.badges;

  return {
    id,
    slug: slugify(p.name),
    name: p.name,
    categoryId: category.id,
    categoryName: category.name,
    sport: p.sport,
    description: p.description,
    features: p.features,
    images: [img(`${id}-a`), img(`${id}-b`), img(`${id}-c`)],
    price: p.price,
    oldPrice: p.oldPrice,
    rating: p.rating,
    reviewCount: p.reviewCount,
    reviews: buildReviews(p, id),
    variants,
    badges,
    published: true,
    createdAt: new Date(Date.now() - p.daysAgo * 86400000).toISOString(),
    salesCount: p.salesCount,
  };
});

// Recalcule le nombre de produits par catégorie à partir du catalogue.
CATEGORIES.forEach((c) => {
  c.productCount = PRODUCTS.filter((p) => p.categoryId === c.id && p.published).length;
});
