import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export function NotFoundPage() {
  return (
    <div className="container-fitora flex flex-col items-center gap-4 py-32 text-center">
      <p className="font-display text-6xl font-extrabold text-fitora-green">404</p>
      <h1 className="font-display text-2xl font-bold">Page introuvable</h1>
      <p className="text-fitora-gray">La page que vous cherchez n'existe pas ou plus.</p>
      <Link to="/">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
