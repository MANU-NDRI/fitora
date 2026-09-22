import { useI18nStore } from "@/i18n/i18nStore";

// Ces fonctions lisent la langue active directement depuis le store i18n
// plutôt que d'exiger un paramètre supplémentaire : tous les appels
// existants dans l'application (des dizaines de fichiers) deviennent ainsi
// automatiquement sensibles à la langue sans devoir être modifiés un par un.
function currentIntlLocale(): string {
  return useI18nStore.getState().language === "en" ? "en-US" : "fr-FR";
}

export function formatFCFA(amount: number): string {
  // FCFA reste la devise réelle de la boutique dans les deux langues — seul
  // le séparateur de milliers change selon la langue (1 200 vs 1,200),
  // jamais la valeur ni la devise elle-même.
  return `${new Intl.NumberFormat(currentIntlLocale()).format(Math.round(amount))} FCFA`;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(currentIntlLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(currentIntlLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function discountPercent(price: number, oldPrice?: number): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
