import { Outlet } from "@tanstack/react-router";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main><Outlet /></main>
      <Footer />
    </div>
  );
}
