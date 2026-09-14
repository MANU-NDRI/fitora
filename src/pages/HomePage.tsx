import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, ShieldCheck, Wallet, MessageCircle, ArrowRight } from "lucide-react";
import type { Category, Product } from "@/types";
import { getCategories } from "@/services/categoryService";
import { getNewArrivals, getPopularProducts, getPromotions } from "@/services/productService";
import { ProductCard } from "@/components/product/ProductCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";

const ADVANTAGES = [
  { icon: Truck, title: "Livraison rapide", desc: "Livraison partout à Abidjan et en Côte d'Ivoire." },
  { icon: ShieldCheck, title: "Qualité garantie", desc: "Des produits sélectionnés pour la performance." },
  { icon: Wallet, title: "Paiement flexible", desc: "Wave, Orange Money, MTN Money, Moov Money." },
  { icon: MessageCircle, title: "Support WhatsApp", desc: "Une question ? Nous répondons rapidement." },
];

export function HomePage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newArrivals, setNewArrivals] = useState<Product[] | null>(null);
  const [popular, setPopular] = useState<Product[] | null>(null);
  const [promos, setPromos] = useState<Product[] | null>(null);

  useEffect(() => {
    getCategories().then(setCategories);
    getNewArrivals(8).then(setNewArrivals);
    getPopularProducts(8).then(setPopular);
    getPromotions(8).then(setPromos);
  }, []);

  return (
    <div>
      <HeroSection />

      <Section title="Catégories" subtitle="Trouvez votre discipline">
        {!categories ? (
          <CardGridSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {categories.map((cat, i) => (
              <CategoryTile key={cat.id} category={cat} index={i} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Nouveautés FITORA" subtitle="Fraîchement arrivé" viewAllTo="/nouveautes">
        {!newArrivals ? <ProductGridSkeleton /> : <ProductGrid products={newArrivals} />}
      </Section>

      <Section title="Les plus populaires" subtitle="Ce que la communauté préfère" viewAllTo="/boutique?tri=populaire">
        {!popular ? <ProductGridSkeleton /> : <ProductGrid products={popular} />}
      </Section>

      {promos && promos.length > 0 && (
        <Section title="Promotions" subtitle="Offres à ne pas manquer" viewAllTo="/promotions">
          <ProductGrid products={promos} />
        </Section>
      )}

      <AdvantagesSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-fitora-black">
      <div className="absolute inset-0">
        <img
          src="https://picsum.photos/seed/fitora-hero/1600/1200"
          alt="Athlète FITORA en pleine performance"
          className="h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-fitora-black via-fitora-black/70 to-fitora-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-fitora-black/80 via-transparent to-transparent" />
      </div>

      <div className="container-fitora relative flex min-h-[78vh] flex-col justify-end py-16 md:min-h-[88vh] md:justify-center md:py-24">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-3 text-sm font-semibold tracking-[0.2em] text-fitora-green"
        >
          SPORT · STYLE · PERFORMANCE
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-2xl font-display text-4xl font-extrabold leading-[1.05] text-fitora-white sm:text-5xl md:text-7xl"
        >
          REPousse<br />TES LIMITES.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-5 max-w-md text-base text-fitora-gray md:text-lg"
        >
          Équipe-toi pour aller plus loin. Vêtements, chaussures et équipements
          sportifs conçus pour accompagner ta performance.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <Link to="/boutique">
            <Button size="lg">Découvrir la boutique</Button>
          </Link>
          <Link to="/nouveautes">
            <Button size="lg" variant="outline">
              Voir les nouveautés
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Section({
  title,
  subtitle,
  viewAllTo,
  children,
}: {
  title: string;
  subtitle?: string;
  viewAllTo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-fitora py-12 md:py-16">
      <div className="mb-6 flex items-end justify-between md:mb-8">
        <div>
          <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-fitora-gray">{subtitle}</p>}
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="hidden items-center gap-1 text-sm font-semibold text-fitora-green hover:underline sm:flex"
          >
            Tout voir <ArrowRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function CategoryTile({ category, index }: { category: Category; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
    >
      <Link
        to={`/categorie/${category.slug}`}
        className="group relative block aspect-square overflow-hidden rounded-2xl bg-fitora-charcoal ring-1 ring-fitora-border transition-all hover:ring-fitora-green/50"
      >
        <img
          src={category.image}
          alt={category.name}
          loading="lazy"
          className="h-full w-full object-cover opacity-70 transition-all duration-500 group-hover:scale-110 group-hover:opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="font-display text-sm font-bold text-fitora-white md:text-base">{category.name}</p>
          <p className="text-[11px] text-fitora-gray">{category.productCount} produits</p>
        </div>
      </Link>
    </motion.div>
  );
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} index={i} />
      ))}
    </div>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/5] w-full" />
      ))}
    </div>
  );
}

function CardGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square w-full" />
      ))}
    </div>
  );
}

function AdvantagesSection() {
  return (
    <section className="border-t border-fitora-border bg-fitora-charcoal/40">
      <div className="container-fitora grid grid-cols-2 gap-6 py-12 md:grid-cols-4 md:py-16">
        {ADVANTAGES.map((a) => (
          <div key={a.title} className="flex flex-col items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-fitora-green/10 text-fitora-green">
              <a.icon size={20} />
            </div>
            <div>
              <p className="font-display text-sm font-semibold text-fitora-white">{a.title}</p>
              <p className="mt-1 text-xs text-fitora-gray">{a.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
