import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product, ProductVariant } from "@/types";

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

function buildVariantLabel(
  variant: ProductVariant
): {
  size?: string;
  color?: string;
  shoeSize?: string;
} {
  return {
    size: variant.size,
    color: variant.color,
    shoeSize: variant.shoeSize,
  };
}

/**
 * Les images base64/data URL peuvent être très volumineuses.
 * Elles ne doivent jamais être persistées dans localStorage.
 */
function getPersistableImage(image?: string): string {
  if (!image) {
    return "";
  }

  if (image.startsWith("data:")) {
    return "";
  }

  return image;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,

      addItem: (product, variant, quantity = 1) => {
        const lineId = `${product.id}__${variant.id}`;
        const existing = get().lines.find((line) => line.id === lineId);

        const maxStock = Math.max(
          0,
          variant.stockAvailable - variant.stockReserved
        );

        if (maxStock <= 0) {
          return;
        }

        if (existing) {
          const nextQty = Math.min(
            existing.quantity + quantity,
            maxStock
          );

          set({
            lines: get().lines.map((line) =>
              line.id === lineId
                ? {
                    ...line,
                    quantity: nextQty,
                    maxStock,
                  }
                : line
            ),
          });

          return;
        }

        const { size, color, shoeSize } = buildVariantLabel(variant);

        const newLine: CartLine = {
          id: lineId,
          productId: product.id,
          variantId: variant.id,
          name: product.name,

          // Ne pas mettre de base64 dans le panier persistant.
          image: getPersistableImage(product.images?.[0]),

          price: product.price,
          oldPrice: product.oldPrice,
          size,
          color,
          shoeSize,
          quantity: Math.min(quantity, maxStock),
          maxStock,
        };

        set({
          lines: [...get().lines, newLine],
        });
      },

      removeItem: (lineId) =>
        set({
          lines: get().lines.filter((line) => line.id !== lineId),
        }),

      updateQuantity: (lineId, quantity) =>
        set({
          lines: get().lines.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  quantity: Math.max(
                    1,
                    Math.min(
                      quantity,
                      line.maxStock || quantity
                    )
                  ),
                }
              : line
          ),
        }),

      clear: () => set({ lines: [] }),

      openCart: () => set({ isOpen: true }),

      closeCart: () => set({ isOpen: false }),

      toggleCart: () =>
        set({
          isOpen: !get().isOpen,
        }),
    }),

    {
      name: "fitora-cart",

      /**
       * On ne persiste que les lignes du panier.
       * isOpen est une information d'interface et ne doit pas
       * être conservée entre les sessions.
       */
      partialize: (state) => ({
        lines: state.lines.map((line) => ({
          ...line,
          image: getPersistableImage(line.image),
        })),
      }),
    }
  )
);

export function useCartCount(): number {
  return useCartStore((state) =>
    state.lines.reduce(
      (sum, line) => sum + line.quantity,
      0
    )
  );
}

export function useCartSubtotal(): number {
  return useCartStore((state) =>
    state.lines.reduce(
      (sum, line) => sum + line.price * line.quantity,
      0
    )
  );
}