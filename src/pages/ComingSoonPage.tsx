import { Link } from "react-router-dom";
import { Construction } from "lucide-react";
import { useTranslation } from "@/i18n/i18nStore";
import { Button } from "@/components/ui/Button";

export function ComingSoonPage({ title }: { title: string }) {
  const { t } = useTranslation();
  return (
    <div className="container-fitora flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fitora-green/10 text-fitora-green">
        <Construction size={28} />
      </div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-fitora-gray">{t("comingSoon.message")}</p>
      <Link to="/boutique">
        <Button variant="outline">{t("comingSoon.backToShop")}</Button>
      </Link>
    </div>
  );
}
