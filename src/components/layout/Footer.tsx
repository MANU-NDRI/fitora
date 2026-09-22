import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { buildWhatsAppLink, whatsappGenericMessage, FITORA_WHATSAPP_NUMBER } from "@/lib/whatsapp";
import { subscribeToShopSettings, type SocialLinks } from "@/services/settingsService";
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon, WhatsAppIcon } from "@/components/shared/SocialIcons";
import { useTranslation } from "@/i18n/i18nStore";

function useFooterLinks() {
  const { t } = useTranslation();
  return {
    nav: [
      { label: t("nav.home"), to: "/" },
      { label: t("nav.shop"), to: "/boutique" },
      { label: t("nav.categories"), to: "/categories" },
      { label: t("nav.promotions"), to: "/promotions" },
      { label: t("nav.newArrivals"), to: "/nouveautes" },
      { label: t("nav.contact"), to: "/contact" },
    ],
    help: [
      { label: t("footer.delivery"), to: "/aide/livraison" },
      { label: t("footer.payment"), to: "/aide/paiement" },
      { label: t("footer.returnPolicy"), to: "/aide/retours" },
      { label: t("footer.terms"), to: "/aide/conditions" },
      { label: t("footer.privacy"), to: "/aide/confidentialite" },
    ],
  };
}

const displayNumber = `+225 ${FITORA_WHATSAPP_NUMBER.slice(3, 5)} ${FITORA_WHATSAPP_NUMBER.slice(5, 7)} ${FITORA_WHATSAPP_NUMBER.slice(7, 9)} ${FITORA_WHATSAPP_NUMBER.slice(9, 11)} ${FITORA_WHATSAPP_NUMBER.slice(11, 13)}`;

export function Footer() {
  const { t } = useTranslation();
  const { nav: NAV, help: HELP } = useFooterLinks();
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  useEffect(() => {
    // Reçoit aussi les mises à jour Realtime : si l'admin change un lien
    // réseau social, le pied de page se met à jour sans rechargement.
    return subscribeToShopSettings((s) => setSocialLinks(s.socialLinks));
  }, []);

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
            <SocialIcon label="Facebook" href={socialLinks.facebook}>
              <FacebookIcon size={15} />
            </SocialIcon>
            <SocialIcon label="Instagram" href={socialLinks.instagram}>
              <InstagramIcon size={15} />
            </SocialIcon>
            <SocialIcon label="TikTok" href={socialLinks.tiktok}>
              <TikTokIcon size={15} />
            </SocialIcon>
            <SocialIcon label="YouTube" href={socialLinks.youtube}>
              <YouTubeIcon size={15} />
            </SocialIcon>
            <SocialIcon label="WhatsApp" href={socialLinks.whatsapp}>
              <WhatsAppIcon size={15} />
            </SocialIcon>
          </div>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold text-fitora-white">{t("footer.navigation")}</h4>
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
          <h4 className="font-display text-sm font-semibold text-fitora-white">{t("footer.help")}</h4>
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
          <h4 className="font-display text-sm font-semibold text-fitora-white">{t("footer.contact")}</h4>
          <ul className="mt-4 space-y-3">
            <li>
              <a
                href={buildWhatsAppLink(whatsappGenericMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-fitora-gray hover:text-fitora-green"
              >
                <MessageCircle size={16} /> {t("footer.whatsapp")}
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
          © {new Date().getFullYear()} FITORA. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
}

// N'autorise que les liens http(s) : empêche l'affichage d'un lien construit
// avec un schéma dangereux (javascript:, data:, etc.) même si une valeur
// invalide se retrouvait un jour en base.
function isSafeExternalUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function SocialIcon({
  label,
  href,
  children,
}: {
  label: string;
  href?: string;
  children: React.ReactNode;
}) {
  // Pas d'URL configurée par l'admin pour ce réseau (ou schéma non sûr) :
  // on n'affiche rien plutôt qu'une icône morte ou un lien dangereux.
  if (!isSafeExternalUrl(href)) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-fitora-border text-fitora-gray transition-colors hover:border-fitora-green hover:text-fitora-green"
    >
      {children}
    </a>
  );
}
