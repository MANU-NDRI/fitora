import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCartStore, useCartSubtotal } from "@/store/cartStore";
import { formatFCFA } from "@/lib/format";
import { Button } from "@/components/ui/Button";

const DELIVERY_FEE_ESTIMATE = 2000;

export function CartPage() {
  const lines = useCartStore((s) => s.lines);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartSubtotal();
  const navigate = useNavigate();

  const deliveryFee = lines.length > 0 ? DELIVERY_FEE_ESTIMATE : 0;
  const total = subtotal + deliveryFee;

  if (lines.length === 0) {
    return (
      <div className="container-fitora flex flex-col items-center gap-4 py-24 text-center">
        <ShoppingBag size={44} className="text-fitora-gray-dim" />
        <h1 className="font-display text-2xl font-bold">Votre panier est vide</h1>
        <p className="text-fitora-gray">Parcourez la boutique pour trouver votre prochain équipement.</p>
        <Link to="/boutique">
          <Button>Découvrir la boutique</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-fitora py-8 md:py-12">
      <h1 className="mb-8 font-display text-2xl font-bold md:text-3xl">Mon panier</h1>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ul className="divide-y divide-fitora-border rounded-2xl bg-fitora-charcoal">
            {lines.map((line) => (
              <li key={line.id} className="flex gap-4 p-4 md:p-5">
                <img
                  src={line.image}
                  alt={line.name}
                  className="h-24 w-24 flex-shrink-0 rounded-xl object-cover md:h-28 md:w-28"
                />
                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display font-semibold">{line.name}</p>
                      <p className="mt-1 text-xs text-fitora-gray">
                        {[line.size, line.shoeSize && `Pointure ${line.shoeSize}`, line.color]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(line.id)}
                      aria-label="Supprimer"
                      className="text-fitora-gray-dim hover:text-red-400"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 rounded-full border border-fitora-border px-3 py-1.5">
                      <button
                        onClick={() => updateQuantity(line.id, line.quantity - 1)}
                        disabled={line.quantity <= 1}
                        aria-label="Diminuer la quantité"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-5 text-center text-sm">{line.quantity}</span>
                      <button
                        onClick={() => updateQuantity(line.id, line.quantity + 1)}
                        disabled={line.quantity >= line.maxStock}
                        aria-label="Augmenter la quantité"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-display font-bold text-fitora-green">
                      {formatFCFA(line.price * line.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="h-fit rounded-2xl bg-fitora-charcoal p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Récapitulatif</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-fitora-gray">
              <span>Sous-total</span>
              <span className="text-fitora-white">{formatFCFA(subtotal)}</span>
            </div>
            <div className="flex justify-between text-fitora-gray">
              <span>Livraison (estimée)</span>
              <span className="text-fitora-white">{formatFCFA(deliveryFee)}</span>
            </div>
            <div className="my-2 border-t border-fitora-border" />
            <div className="flex justify-between font-display text-base font-bold">
              <span>Total</span>
              <span className="text-fitora-green">{formatFCFA(total)}</span>
            </div>
          </div>
          <Button size="lg" className="mt-6 w-full" onClick={() => navigate("/checkout")}>
            Passer la commande
          </Button>
          <p className="mt-3 text-center text-xs text-fitora-gray-dim">
            La création d'un compte est nécessaire pour finaliser la commande.
          </p>
        </div>
      </div>
    </div>
  );
}
