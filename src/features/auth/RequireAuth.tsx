import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useIsAuthenticated } from "@/store/authStore";

export function RequireAuth() {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
