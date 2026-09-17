import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { getShopSettings } from "@/services/settingsService";

export function ReturnPolicyPage() {
  const [policy, setPolicy] = useState<string | null>(null);

  useEffect(() => {
    getShopSettings().then((s) => setPolicy(s.returnPolicy));
  }, []);

  return (
    <div className="container-fitora max-w-2xl py-10 md:py-16">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-fitora-green/10 text-fitora-green">
          <RotateCcw size={20} />
        </div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Politique de retour</h1>
      </div>

      {policy === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-fitora-charcoal-light/60" />
      ) : (
        <div className="whitespace-pre-line rounded-2xl bg-fitora-charcoal p-6 text-sm leading-relaxed text-fitora-gray">
          {policy}
        </div>
      )}
    </div>
  );
}
