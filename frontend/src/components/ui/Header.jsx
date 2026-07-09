import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export const Header = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  const displayName =
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.email?.split("@")[0] ||
    "bạn";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinkClass = ({ isActive }) =>
    `pb-1 transition ${
      isActive
        ? "border-b-2 border-indigo-700 text-indigo-700"
        : "text-gray-500 hover:text-gray-900"
    }`;

  return (
    <header className="flex flex-col gap-4 border-b px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
      <Link to="/" className="text-2xl font-bold text-indigo-700">
        Visual Search
      </Link>

      <nav className="flex flex-wrap gap-6 text-sm font-medium">
        <NavLink to="/" className={navLinkClass}>
          Trang chủ
        </NavLink>
        <a href="#" className="text-gray-500 transition hover:text-gray-900">
          Lịch sử tìm kiếm
        </a>
        <NavLink to="/bookmarks" className={navLinkClass}>
          Ảnh đã lưu
        </NavLink>
      </nav>

      {isAuthenticated ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            Chào {displayName}!
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <Link
            to="/register"
            className="rounded-md px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
          >
            Đăng ký
          </Link>
          <Link
            to="/login"
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-800"
          >
            Đăng nhập
          </Link>
        </div>
      )}
    </header>
  );
};
