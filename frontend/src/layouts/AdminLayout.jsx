import { HeaderAdmin } from "../components/ui/HeaderAdmin";
import { SidebarAdmin } from "../components/ui/SidebarAdmin";

export default function AdminLayout({ children }) {
  return (
    <div className="h-screen overflow-hidden bg-slate-50 font-sans text-gray-800">
      <div className="flex h-full">
        <SidebarAdmin />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <HeaderAdmin />
          <main className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
