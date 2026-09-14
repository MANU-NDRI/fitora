import { Navigate } from "react-router-dom";

export function NewArrivalsRedirectPage() {
  return <Navigate to="/boutique?tri=recent" replace />;
}
