import { supabase } from "@/lib/supabase";
import type {
  Product,
  ProductBadge,
  ProductFilters,
  SortOption,
  Sport,
} from "@/types";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category_id: string | null;
  sport: Sport;
  description: string | null;
  features: string[] | null;
  price: number | string;
  old_price: number | string | null;
  rating: number | string | null;
  review_count: number | null;
  sales_count: number | null;
  published: boolean;
  out_of_stock_override: boolean;
  created_at: string;
  categories: CategoryRow | CategoryRow[] | null;
  product_images: ImageRow[] | null;
  product_variants: VariantRow[] | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  image: string;
  sport: Sport;
  order_index: number;
  published: boolean;
};

type ImageRow = {
  id: string;
  url: string;
  position: number;
};

type VariantRow = {
  id: string;
  size: string | null;
  color: string | null;
  color_hex: string | null;
  shoe_size: string | null;
  stock_available: number;
  stock_reserved: number;
  sku: string;
};

type ReviewRow = {
  id: string;
  author: string;
  rating: number;
  comment: string;
  created_at: string;
  customer_id: string | null;
  order_id: string | null;
};

type ProductDetailsRow = ProductRow & {
  product_reviews?: ReviewRow[] | null;
};

function categoryOf(row: ProductRow): CategoryRow | null {
  return Array.isArray(row.categories)
    ? row.categories[0] ?? null
    : row.categories;
}

export function mapProduct(
  row: ProductRow,
  reviews: ReviewRow[] = [],
): Product {
  const category = categoryOf(row);

  const images = [...(row.product_images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((image) => image.url);

  const variants = (row.product_variants ?? []).map((variant) => ({
    id: variant.id,
    size: variant.size ?? undefined,
    color: variant.color ?? undefined,
    colorHex: variant.color_hex ?? undefined,
    shoeSize: variant.shoe_size ?? undefined,
    stockAvailable: variant.stock_available,
    stockReserved: variant.stock_reserved,
    sku: variant.sku,
  }));

  const mappedReviews = reviews.map((review) => ({
    id: review.id,
    author: review.author,
    rating: review.rating,
    comment: review.comment,
    date: review.created_at,
    customerId: review.customer_id ?? undefined,
    orderId: review.order_id ?? undefined,
  }));

  const hasStock = variants.some(
    (variant) =>
      variant.stockAvailable - variant.stockReserved > 0,
  );

  const badges: ProductBadge[] = [];

  if (
    row.old_price !== null &&
    Number(row.old_price) > Number(row.price)
  ) {
    badges.push("promo");
  }

  if (row.out_of_stock_override || !hasStock) {
    badges.push("rupture");
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.category_id ?? "",
    categoryName: category?.name ?? "Sans catégorie",
    sport: row.sport,
    description: row.description ?? "",
    features: row.features ?? [],
    images,
    price: Number(row.price),
    oldPrice:
      row.old_price === null
        ? undefined
        : Number(row.old_price),
    rating: Number(row.rating ?? 0),
    reviewCount:
      row.review_count ?? mappedReviews.length,
    reviews: mappedReviews,
    variants,
    badges,
    published: row.published,
    createdAt: row.created_at,
    salesCount: row.sales_count ?? 0,
    outOfStockOverride:
      row.out_of_stock_override,
  };
}

function isInStock(product: Product): boolean {
  return (
    !product.outOfStockOverride &&
    product.variants.some(
      (variant) =>
        variant.stockAvailable -
          variant.stockReserved >
        0,
    )
  );
}

export function getDisplayBadges(
  product: Product,
): ProductBadge[] {
  const base = product.badges.filter(
    (badge) => badge !== "rupture",
  );

  return isInStock(product)
    ? base
    : [...base, "rupture"];
}

function sortProducts(
  products: Product[],
  sort?: SortOption,
): Product[] {
  const list = [...products];

  switch (sort) {
    case "popular":
      return list.sort(
        (a, b) => b.reviewCount - a.reviewCount,
      );

    case "best-selling":
      return list.sort(
        (a, b) => b.salesCount - a.salesCount,
      );

    case "price-asc":
      return list.sort(
        (a, b) => a.price - b.price,
      );

    case "price-desc":
      return list.sort(
        (a, b) => b.price - a.price,
      );

    case "top-rated":
      return list.sort(
        (a, b) => b.rating - a.rating,
      );

    default:
      return list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );
  }
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Cache mémoire courte.
 *
 * Cela évite de refaire la même requête Supabase
 * lorsque plusieurs composants demandent les produits
 * presque au même moment.
 */
let productsCache: Product[] | null = null;
let productsCacheTime = 0;
let productsInFlight: Promise<Product[]> | null = null;

const PRODUCTS_CACHE_TTL = 30_000;

function clearProductsCache(): void {
  productsCache = null;
  productsCacheTime = 0;
}

async function fetchProducts(
  forceRefresh = false,
): Promise<Product[]> {
  const now = Date.now();

  if (
    !forceRefresh &&
    productsCache &&
    now - productsCacheTime <
      PRODUCTS_CACHE_TTL
  ) {
    return productsCache;
  }

  // Si une requête est déjà en cours (ex : Accueil qui demande à la fois les
  // nouveautés, les meilleures ventes et les promotions au même instant),
  // tout le monde attend cette même requête au lieu d'en déclencher une
  // nouvelle chacun de son côté.
  if (!forceRefresh && productsInFlight) {
    return productsInFlight;
  }

  productsInFlight = (async () => {
    const { data, error } = await supabase
      .from("products")
      .select(`
      id,
      slug,
      name,
      category_id,
      sport,
      description,
      features,
      price,
      old_price,
      rating,
      review_count,
      sales_count,
      published,
      out_of_stock_override,
      created_at,
      categories (
        id,
        slug,
        name,
        image,
        sport,
        order_index,
        published
      ),
      product_images (
        id,
        url,
        position
      ),
      product_variants (
        id,
        size,
        color,
        color_hex,
        shoe_size,
        stock_available,
        stock_reserved,
        sku
      )
    `)
    .eq("published", true)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  const products = (
    (data ?? []) as unknown as ProductRow[]
  ).map((row) => mapProduct(row));

    productsCache = products;
    productsCacheTime = now;

    return products;
  })();

  try {
    return await productsInFlight;
  } finally {
    productsInFlight = null;
  }
}

export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  pageSize = 12,
): Promise<PaginatedProducts> {
  let list = await fetchProducts();

  const query = filters.search
    ?.trim()
    .toLowerCase();

  if (query) {
    list = list.filter(
      (product) =>
        product.name
          .toLowerCase()
          .includes(query) ||
        product.categoryName
          .toLowerCase()
          .includes(query) ||
        product.description
          .toLowerCase()
          .includes(query),
    );
  }

  if (filters.categorySlug) {
    const categorySlug =
      filters.categorySlug.trim().toLowerCase();

    list = list.filter(
      (product) =>
        product.categoryName
          .toLowerCase()
          .replace(/\s+/g, "-") === categorySlug ||
        product.categoryId === categorySlug,
    );
  }

  if (filters.sport) {
    list = list.filter(
      (product) =>
        product.sport === filters.sport,
    );
  }

  if (filters.priceMin !== undefined) {
    list = list.filter(
      (product) =>
        product.price >= filters.priceMin!,
    );
  }

  if (filters.priceMax !== undefined) {
    list = list.filter(
      (product) =>
        product.price <= filters.priceMax!,
    );
  }

  if (filters.sizes?.length) {
    list = list.filter((product) =>
      product.variants.some(
        (variant) =>
          variant.size &&
          filters.sizes!.includes(
            variant.size,
          ),
      ),
    );
  }

  if (filters.shoeSizes?.length) {
    list = list.filter((product) =>
      product.variants.some(
        (variant) =>
          variant.shoeSize &&
          filters.shoeSizes!.includes(
            variant.shoeSize,
          ),
      ),
    );
  }

  if (filters.colors?.length) {
    list = list.filter((product) =>
      product.variants.some(
        (variant) =>
          variant.color &&
          filters.colors!.includes(
            variant.color,
          ),
      ),
    );
  }

  if (filters.inStockOnly) {
    list = list.filter(isInStock);
  }

  if (filters.onSaleOnly) {
    list = list.filter(
      (product) =>
        product.oldPrice !== undefined &&
        product.oldPrice > product.price,
    );
  }

  list = sortProducts(
    list,
    filters.sort,
  );

  const total = list.length;

  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize),
  );

  return {
    items: list.slice(
      (page - 1) * pageSize,
      page * pageSize,
    ),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      slug,
      name,
      category_id,
      sport,
      description,
      features,
      price,
      old_price,
      rating,
      review_count,
      sales_count,
      published,
      out_of_stock_override,
      created_at,
      categories (
        id,
        slug,
        name,
        image,
        sport,
        order_index,
        published
      ),
      product_images (
        id,
        url,
        position
      ),
      product_variants (
        id,
        size,
        color,
        color_hex,
        shoe_size,
        stock_available,
        stock_reserved,
        sku
      )
    `)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const product = mapProduct(
    data as unknown as ProductRow,
  );

  // Les avis sont chargés uniquement sur la page
  // détaillée du produit.
  const { data: reviews, error: reviewsError } =
    await supabase
      .from("product_reviews")
      .select(`
        id,
        author,
        rating,
        comment,
        created_at,
        customer_id,
        order_id
      `)
      .eq("product_id", product.id)
      .order("created_at", {
        ascending: false,
      });

  if (reviewsError) {
  console.error(
    "Erreur de chargement des avis du produit :",
    reviewsError
  );
}

  return mapProduct(
    data as unknown as ProductRow,
    (reviews ?? []) as ReviewRow[],
  );
}

export async function getProductsByIds(
  ids: string[],
): Promise<Product[]> {
  if (ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      slug,
      name,
      category_id,
      sport,
      description,
      features,
      price,
      old_price,
      rating,
      review_count,
      sales_count,
      published,
      out_of_stock_override,
      created_at,
      categories (
        id,
        slug,
        name,
        image,
        sport,
        order_index,
        published
      ),
      product_images (
        id,
        url,
        position
      ),
      product_variants (
        id,
        size,
        color,
        color_hex,
        shoe_size,
        stock_available,
        stock_reserved,
        sku
      )
    `)
    .in("id", ids)
    .eq("published", true);

  if (error) {
    throw error;
  }

  return (
    (data ?? []) as unknown as ProductRow[]
  ).map((row) => mapProduct(row));
}

export async function getRelatedProducts(
  product: Product,
  limit = 4,
): Promise<Product[]> {
  const products = await fetchProducts();

  return products
    .filter(
      (candidate) =>
        candidate.id !== product.id,
    )
    .sort(
      (a, b) =>
        (b.categoryId === product.categoryId
          ? 1
          : 0) -
          (a.categoryId === product.categoryId
            ? 1
            : 0) ||
        b.salesCount - a.salesCount,
    )
    .slice(0, limit);
}

export async function getNewArrivals(
  limit = 8,
): Promise<Product[]> {
  return (
    await getProducts(
      { sort: "recent" },
      1,
      limit,
    )
  ).items;
}

export async function getPopularProducts(
  limit = 8,
): Promise<Product[]> {
  return (
    await getProducts(
      { sort: "popular" },
      1,
      limit,
    )
  ).items;
}

export async function getPromotions(
  limit = 8,
): Promise<Product[]> {
  return (
    await getProducts(
      { onSaleOnly: true },
      1,
      limit,
    )
  ).items;
}

export function getAvailableSizes(
  products: Product[],
): string[] {
  return [
    ...new Set(
      products.flatMap((product) =>
        product.variants.flatMap(
          (variant) =>
            variant.size
              ? [variant.size]
              : [],
        ),
      ),
    ),
  ];
}

export function getAvailableShoeSizes(
  products: Product[],
): string[] {
  return [
    ...new Set(
      products.flatMap((product) =>
        product.variants.flatMap(
          (variant) =>
            variant.shoeSize
              ? [variant.shoeSize]
              : [],
        ),
      ),
    ),
  ].sort();
}

export function getAvailableColors(
  products: Product[],
): string[] {
  return [
    ...new Set(
      products.flatMap((product) =>
        product.variants.flatMap(
          (variant) =>
            variant.color
              ? [variant.color]
              : [],
        ),
      ),
    ),
  ];
}

export { isInStock };

/**
 * Permet de forcer un nouveau chargement après
 * une modification des produits.
 */
export function invalidateProductsCache(): void {
  clearProductsCache();
}