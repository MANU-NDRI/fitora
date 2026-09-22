import { Languages } from "lucide-react";
import { useTranslation } from "@/i18n/i18nStore";
import { cn } from "@/lib/cn";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-fitora-border bg-fitora-charcoal p-0.5 text-xs font-semibold",
        className
      )}
      role="group"
      aria-label={t("language.label")}
    >
      <Languages size={13} className="ml-1.5 text-fitora-gray-dim" aria-hidden="true" />
      {(["fr", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          aria-pressed={language === lang}
          className={cn(
            "rounded-full px-2 py-1 uppercase transition-colors",
            language === lang
              ? "bg-fitora-green text-fitora-black"
              : "text-fitora-gray hover:text-white"
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
