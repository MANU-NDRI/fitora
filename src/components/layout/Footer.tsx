import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { buildWhatsAppLink, whatsappGenericMessage, FITORA_WHATSAPP_NUMBER } from "@/lib/whatsapp";

const NAV = [
  { label: "Accueil", to: "/" },
  { label: "Boutique", to: "/boutique" },
  { label: "Catégories", to: "/categories" },
  { label: "Promotions", to: "/promotions" },
  { label: "Nouveautés", to: "/nouveautes" },
  { label: "Contact", to: "/contact" },
];

const HELP = [
  { label: "Livraison", to: "/aide/livraison" },
  { label: "Paiement", to: "/aide/paiement" },
  { label: "Conditions générales", to: "/aide/conditions" },
  { label: "Confidentialité", to: "/aide/confidentialite" },
];

const displayNumber = `+225 ${FITORA_WHATSAPP_NUMBER.slice(3, 5)} ${FITORA_WHATSAPP_NUMBER.slice(5, 7)} ${FITORA_WHATSAPP_NUMBER.slice(7, 9)} ${FITORA_WHATSAPP_NUMBER.slice(9, 11)} ${FITORA_WHATSAPP_NUMBER.slice(11, 13)}`;

export function Footer() {
  return (
    <footer className="mt-24 border-t border-fitora-border bg-fitora-black">
      <div className="container-fitora grid grid-cols-2 gap-10 py-14 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <span className="font-display text-2xl font-extrabold tracking-tight">
            FIT<span className="text-fitora-green">ORA</span>
          </span>
          <p className="mt-3 text-xs font-semibold tracking-wide text-fitora-gray">
            SPORT • STYLE • PERFORMANCE
          </p>
          <div className="mt-5 flex items-center gap-3">
            <SocialIcon label="Instagram" initials="IG" />
            <SocialIcon label="Facebook" initials="FB" />
            <SocialIcon label="TikTok" initials="TT" />
            <SocialIcon label="YouTube" initials="YT" />
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-fitora-white">Navigation</h4>
          <ul className="mt-4 space-y-2.5">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sm text-fitora-gray hover:text-fitora-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-fitora-white">Aide</h4>
          <ul className="mt-4 space-y-2.5">
            {HELP.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sm text-fitora-gray hover:text-fitora-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-fitora-white">Contact</h4>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={buildWhatsAppLink(whatsappGenericMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-fitora-gray hover:text-fitora-green"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            </li>
            <li className="flex items-center gap-2 text-sm text-fitora-gray">
              <Phone size={16} /> {displayNumber}
            </li>
            <li className="flex items-center gap-2 text-sm text-fitora-gray">
              <Mail size={16} /> contact@fitora.ci
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-fitora-border py-5">
        <p className="container-fitora text-center text-xs text-fitora-gray-dim">
          © {new Date().getFullYear()} FITORA. Tous droits réservés. Fait avec passion en Côte d'Ivoire.
        </p>
      </div>
    </footer>
  );
}

function SocialIcon({ label, initials }: { label: string; initials: string }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-fitora-border text-[10px] font-bold text-fitora-gray transition-colors hover:border-fitora-green hover:text-fitora-green"
    >
      {initials}
    </a>
  );
}
