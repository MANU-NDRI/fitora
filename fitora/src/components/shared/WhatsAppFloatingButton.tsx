import { MessageCircle } from "lucide-react";
import { buildWhatsAppLink, whatsappGenericMessage } from "@/lib/whatsapp";
import { motion } from "framer-motion";

export function WhatsAppFloatingButton() {
  return (
    <motion.a
      href={buildWhatsAppLink(whatsappGenericMessage())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter FITORA sur WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-fitora-green text-fitora-black shadow-glow-lg md:bottom-8 md:right-8"
    >
      <MessageCircle size={26} strokeWidth={2} />
    </motion.a>
  );
}
