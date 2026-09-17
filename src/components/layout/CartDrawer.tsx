import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore, useCartSubtotal } from "@/store/cartStore";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { getProductsByIds } from "@/services/productService";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const closeCart = useCartStore((s) => s.closeCart);
  const lines = useCartStore((s) => s.lines);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartSubtotal();

  const [productImages, setProductImages] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lines.length === 0) {
      setProductImages({});
      return;
    }

    const productIds = [...new Set(lines.map((line) => line.productId))];

    getProductsByIds(productIds)
      .then((products) => {
        const imageMap: Record<string, string> = {};

        products.forEach((product) => {
          if (product.images?.[0]) {
            imageMap[product.id] = product.images[0];
          }
        });

        setProductImages(imageMap);
      })
      .catch(() => {
        setProductImages({});
      });
  }, [lines]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-[60] bg-black/60"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28 }}
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-fitora-charcoal"
          >
            <div className="flex items-center justify-between border-b border-fitora-border px-5 py-4">
              <h2 className="font-display text-lg font-bold">
                Mon panier ({lines.length})
              </h2>

              <button onClick={closeCart} aria-label="Fermer le panier">
                <X size={22} />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <ShoppingBag size={40} className="text-fitora-gray-dim" />

                <p className="text-fitora-gray">
                  Votre panier est vide pour le moment.
                </p>

                <Link to="/boutique" onClick={closeCart}>
                  <Button>Découvrir la boutique</Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <ul className="space-y-4">
                    {lines.map((line) => (
                      <li key={line.id} className="flex gap-3">
                        <img
                          src={
                            productImages[line.productId] ||
                            line.image ||
                            "/placeholder-product.svg"
                          }
                          alt={line.name}
                          className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                        />

                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-medium">
                              {line.name}
                            </p>

                            <button
                              onClick={() => removeItem(line.id)}
                              aria-label="Supprimer"
                              className="text-fitora-gray-dim hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <p className="mt-0.5 text-xs text-fitora-gray">
                            {[
                              line.size,
                              line.shoeSize &&
                                `Pointure ${line.shoeSize}`,
                              line.color,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 rounded-full border border-fitora-border px-2 py-1">
                              <button
                                onClick={() =>
                                  updateQuantity(line.id, line.quantity - 1)
                                }
                                disabled={line.quantity <= 1}
                                aria-label="Diminuer la quantité"
                              >
                                <Minus size={14} />
                              </button>

                              <span className="w-4 text-center text-sm">
                                {line.quantity}
                              </span>

                              <button
                                onClick={() =>
                                  updateQuantity(line.id, line.quantity + 1)
                                }
                                disabled={line.quantity >= line.maxStock}
                                aria-label="Augmenter la quantité"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <span className="font-display text-sm font-bold text-fitora-green">
                              {formatFCFA(line.price * line.quantity)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-fitora-border px-5 py-4">
                  <div className="mb-4 flex items-center justify-between text-sm text-fitora-gray">
                    <span>Sous-total</span>

                    <span className="font-semibold text-fitora-white">
                      {formatFCFA(subtotal)}
                    </span>
                  </div>

                  <p className="mb-3 text-center text-xs text-fitora-gray-dim">
                    Frais de livraison calculés au checkout.
                  </p>

                  <Link to="/panier" onClick={closeCart}>
                    <Button className="w-full" size="lg">
                      Voir le panier
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}