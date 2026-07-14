import { FiLogOut, FiMenu } from "react-icons/fi";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const pageTitles = {
  "/admin": "Dashboard",
  "/admin/indexing": "Indexing",
};

export const HeaderAdmin = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-5 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 text-gray-600 lg:hidden"
          aria-label="Mở menu admin"
        >
          <FiMenu className="size-4" />
        </button>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Admin</p>
          <h1 className="truncate text-lg font-semibold leading-7 text-zinc-900">
            {pageTitles[location.pathname] || "Visual Search Admin"}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-zinc-900">
            {user?.username || user?.email || "Admin"}
          </p>
          <p className="text-xs text-gray-500">System Admin</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <FiLogOut className="size-4" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};
