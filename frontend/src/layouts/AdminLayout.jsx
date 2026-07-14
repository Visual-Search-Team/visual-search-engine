import { HeaderAdmin } from "../components/ui/HeaderAdmin";
import { SidebarAdmin } from "../components/ui/SidebarAdmin";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      <div className="flex min-h-screen">
        <SidebarAdmin />
        <div className="flex min-w-0 flex-1 flex-col">
          <HeaderAdmin />
          <main className="flex-1 px-5 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
