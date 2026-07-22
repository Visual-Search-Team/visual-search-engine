import { Footer } from "../components/ui/Footer";
import { Header } from "../components/ui/Header";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-white">
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <Header />
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col items-center py-12 px-4">
        {children}
      </main>

      <Footer />
    </div>
  );
}
