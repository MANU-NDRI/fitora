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

function buildVariantLabel(variant: ProductVariant): { size?: string; color?: string; shoeSize?: string } {
  return { size: variant.size, color: variant.color, shoeSize: variant.shoeSize };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isOpen: false,
      addItem: (product, variant, quantity = 1) => {
        const lineId = `${product.id}__${variant.id}`;
        const existing = get().lines.find((l) => l.id === lineId);
        const maxStock = Math.max(0, variant.stockAvailable - variant.stockReserved);

        if (existing) {
          const nextQty = Math.min(existing.quantity + quantity, maxStock || existing.quantity + quantity);
          set({
            lines: get().lines.map((l) => (l.id === lineId ? { ...l, quantity: nextQty } : l)),
          });
          return;
        }

        const { size, color, shoeSize } = buildVariantLabel(variant);
        const newLine: CartLine = {
          id: lineId,
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          image: product.images[0],
          price: product.price,
          oldPrice: product.oldPrice,
          size,
          color,
          shoeSize,
          quantity: Math.min(quantity, maxStock || quantity),
          maxStock,
        };
        set({ lines: [...get().lines, newLine] });
      },
      removeItem: (lineId) => set({ lines: get().lines.filter((l) => l.id !== lineId) }),
      updateQuantity: (lineId, quantity) =>
        set({
          lines: get().lines.map((l) =>
            l.id === lineId ? { ...l, quantity: Math.max(1, Math.min(quantity, l.maxStock || quantity)) } : l
          ),
        }),
      clear: () => set({ lines: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set({ isOpen: !get().isOpen }),
    }),
    { name: "fitora-cart" }
  )
);

export function useCartCount(): number {
  return useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));
}

export function useCartSubtotal(): number {
  return useCartStore((s) => s.lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
}
