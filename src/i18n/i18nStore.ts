import { create } from "zustand";
import { persist } from "zustand/middleware";
import fr from "@/i18n/locales/fr.json";
import en from "@/i18n/locales/en.json";

export type Language = "fr" | "en";

// Le français reste la langue par défaut de FITORA, comme demandé.
const DEFAULT_LANGUAGE: Language = "fr";

const DICTIONARIES: Record<Language, Record<string, unknown>> = { fr, en };

function resolveKey(dict: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((node, segment) => {
    if (node && typeof node === "object" && segment in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[segment];
    }
    return undefined;
  }, dict);
}

interface I18nState {
  language: Language;
  setLanguage: (language: Language) => void;
  /**
   * Traduit une clé en "point.notation" (ex: "auth.loginTitle"). Si la
   * traduction est absente dans la langue active, retombe sur le français
   * puis, en dernier recours, affiche la clé elle-même plutôt qu'un texte
   * vide — plus facile à repérer et corriger qu'un blanc silencieux.
   */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  );
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: DEFAULT_LANGUAGE,
      setLanguage: (language) => set({ language }),
      t: (key, vars) => {
        const { language } = get();
        const value =
          resolveKey(DICTIONARIES[language], key) ??
          resolveKey(DICTIONARIES.fr, key);

        if (typeof value !== "string") {
          return key;
        }

        return interpolate(value, vars);
      },
    }),
    {
      name: "fitora-language",
      // On ne persiste que la langue choisie, jamais les dictionnaires.
      partialize: (state) => ({ language: state.language }),
    }
  )
);

/** Hook pratique : `const { t, language, setLanguage } = useTranslation();` */
export function useTranslation() {
  const t = useI18nStore((s) => s.t);
  const language = useI18nStore((s) => s.language);
  const setLanguage = useI18nStore((s) => s.setLanguage);
  return { t, language, setLanguage };
}
