import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function RequireAdmin() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
