import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { WhatsAppFloatingButton } from "@/components/shared/WhatsAppFloatingButton";
import { ToastContainer } from "@/components/shared/ToastContainer";

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-fitora-black text-fitora-white">
      <ToastContainer />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <WhatsAppFloatingButton />
    </div>
  );
}
