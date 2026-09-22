import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n/i18nStore";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="container-fitora flex flex-col items-center gap-4 py-32 text-center">
      <p className="font-display text-6xl font-extrabold text-fitora-green">404</p>
      <h1 className="font-display text-2xl font-bold">{t("notFound.title")}</h1>
      <p className="text-fitora-gray">{t("notFound.message")}</p>
      <Link to="/">
        <Button>{t("notFound.cta")}</Button>
      </Link>
    </div>
  );
}
