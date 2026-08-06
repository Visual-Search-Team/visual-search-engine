import { useState, useEffect } from "react";
import { FiBarChart2, FiDatabase, FiUsers, FiExternalLink, FiTrash2, FiMenu, FiX } from "react-icons/fi";
import { NavLink, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: FiBarChart2, end: true },
  { to: "/admin/indexing", label: "Indexing", icon: FiDatabase },
  { to: "/admin/trash", label: "Trash Bin", icon: FiTrash2 },
  { to: "/admin/users", label: "Users", icon: FiUsers },
];

export const SidebarAdmin = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md bg-indigo-700 p-2 text-white shadow-md lg:hidden"
      >
        <FiMenu className="size-6" />
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Chính */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:min-h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 px-6">
          <div>
            <p className="text-lg font-bold leading-7 text-indigo-700">Visual Search</p>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Admin Console</p>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 lg:hidden">
            <FiX className="size-6" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
          {navItems.map(({ to, label, icon: Icon, end, disabled }) => {
            if (disabled) {
              return (
                <div
                  key={to}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400"
                  title="Sẽ bổ sung sau"
                >
                  <Icon className="size-4" />
                  {label}
                </div>
              );
            }

            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-indigo-700 text-white shadow-sm"
                      : "text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                  }`
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            );
          })}

          <div className="px-4 pb-2 mt-4">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-300"
            >
              <FiExternalLink className="size-4" />
              Test tìm kiếm 
            </Link>
          </div>
        </nav>

        <div className="shrink-0 border-t border-zinc-200 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {(user?.username || user?.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                {user?.username || user?.email || "Admin"}
              </p>
              <p className="text-xs text-gray-500">System Admin</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
