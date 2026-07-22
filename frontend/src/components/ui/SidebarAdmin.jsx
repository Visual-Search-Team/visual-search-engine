import { FiBarChart2, FiDatabase, FiUsers } from "react-icons/fi";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { to: "/admin", label: "Dashboard", icon: FiBarChart2, end: true },
  { to: "/admin/indexing", label: "Indexing", icon: FiDatabase },
  { to: "/admin/users", label: "Users", icon: FiUsers },
];

export const SidebarAdmin = () => {
  const { user } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white lg:flex lg:min-h-screen lg:flex-col">
      <div className="flex h-16 items-center border-b border-zinc-200 px-6">
        <div>
          <p className="text-lg font-bold leading-7 text-indigo-700">Visual Search</p>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Admin Console</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 p-4">
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
      </nav>

      <div className="border-t border-zinc-200 p-4">
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
  );
};
