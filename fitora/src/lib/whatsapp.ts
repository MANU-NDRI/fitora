export const FITORA_WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || "2250789777767";

export function buildWhatsAppLink(message: string, number = FITORA_WHATSAPP_NUMBER): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

export function whatsappProductMessage(productName: string): string {
  return `Bonjour FITORA, je souhaite avoir des informations sur : ${productName}.`;
}

export function whatsappOrderMessage(params: {
  orderNumber: string;
  amount: string;
  paymentMethod: string;
}): string {
  return `Bonjour FITORA, je viens d'effectuer une commande.\nNuméro : ${params.orderNumber}\nMontant : ${params.amount}\nMoyen de paiement : ${params.paymentMethod}\nJe vous envoie ma preuve de paiement.`;
}

export function whatsappGenericMessage(): string {
  return "Bonjour FITORA, je souhaite avoir des informations sur un produit.";
}
