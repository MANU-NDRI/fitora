import { Navigate } from "react-router-dom";

export function PromotionsRedirectPage() {
  return <Navigate to="/boutique?promo=1&tri=recent" replace />;
}
