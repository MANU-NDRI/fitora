// Icônes de marque simplifiées (SVG inline) : lucide-react ne fournit plus
// de logos de marques dans cette version, uniquement des icônes génériques.
// Chaque tracé reproduit fidèlement le pictogramme officiel de la plateforme
// pour rester reconnaissable, dans l'usage nominatif standard d'un lien vers
// le réseau social correspondant.

type IconProps = { size?: number; className?: string };

export function FacebookIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.51 17.52 2 12 2S2 6.51 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.89h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

export function InstagramIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82c-.98-.9-1.6-2.14-1.66-3.51V2h-3.4v13.6a2.7 2.7 0 1 1-2.03-2.62v-3.45a6.1 6.1 0 1 0 5.43 6.06V9.1a8.1 8.1 0 0 0 4.66 1.5V7.2c-1.09 0-2.1-.36-2.9-.98-.04-.03-.07-.06-.1-.1Z" />
    </svg>
  );
}

export function YouTubeIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12s0-3.2-.41-4.74a2.78 2.78 0 0 0-1.95-1.96C18.1 5 12 5 12 5s-6.1 0-7.64.3a2.78 2.78 0 0 0-1.95 1.96C2 8.8 2 12 2 12s0 3.2.41 4.74c.24.9 1.04 1.66 1.95 1.96C5.9 19 12 19 12 19s6.1 0 7.64-.3a2.78 2.78 0 0 0 1.95-1.96C22 15.2 22 12 22 12Zm-12.1 3V9l5.2 3-5.2 3Z" />
    </svg>
  );
}

export function WhatsAppIcon({ size = 16, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.94 9.94 0 0 0 4.84 1.23h.01c5.5 0 9.96-4.46 9.96-9.96S17.55 2 12.04 2Zm0 18.2c-1.5 0-2.98-.4-4.27-1.16l-.31-.18-3.09.81.82-3-.2-.31a8.24 8.24 0 0 1-1.27-4.4c0-4.56 3.71-8.27 8.27-8.27 4.56 0 8.27 3.71 8.27 8.27s-3.71 8.24-8.22 8.24Zm4.53-6.19c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.98-1.22-.73-.65-1.23-1.46-1.37-1.7-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.4.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08s.9 2.42 1.02 2.59c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}
