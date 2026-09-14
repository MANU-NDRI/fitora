import { Link } from "react-router-dom";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="container-fitora flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fitora-green/10 text-fitora-green">
        <Construction size={28} />
      </div>
      <h1 className="font-display text-2xl font-bold">{title}</h1>
      <p className="max-w-md text-fitora-gray">
        Cette section arrive dans la prochaine étape de construction de FITORA
        (compte client, authentification et commandes).
      </p>
      <Link to="/boutique">
        <Button variant="outline">Retour à la boutique</Button>
      </Link>
    </div>
  );
}
