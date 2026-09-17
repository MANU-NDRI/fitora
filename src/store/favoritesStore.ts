import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  productIds: string[];
  toggle: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  clear: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      productIds: [],
      toggle: (productId) => {
        const current = get().productIds;
        set({
          productIds: current.includes(productId)
            ? current.filter((id) => id !== productId)
            : [...current, productId],
        });
      },
      isFavorite: (productId) => get().productIds.includes(productId),
      clear: () => set({ productIds: [] }),
    }),
    { name: "fitora-favorites" }
  )
);
