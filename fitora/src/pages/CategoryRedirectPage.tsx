import { Navigate, useParams } from "react-router-dom";

export function CategoryRedirectPage() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/boutique?categorie=${slug}`} replace />;
}
