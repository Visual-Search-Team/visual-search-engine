
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { FiMenu, FiX } from "react-icons/fi";

export const Header = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user, role } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    `pb-1 transition font-semibold ${isActive
      ? "border-b-2 border-indigo-700 text-indigo-700"
      : "text-gray-600 hover:text-indigo-600"
    }`;

  return (
    <header className="bg-slate-100 flex flex-col gap-4 border-b rounded-2xl px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex items-center justify-between">
        <Link to="/" className="text-2xl font-extrabold text-indigo-700">
          Visual Search
        </Link>

        <button
          type="button"
          className="p-1 text-gray-600 lg:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <FiX className="size-6" /> : <FiMenu className="size-6" />}
        </button>
      </div>

      <nav
        className={`${isMenuOpen ? "flex flex-col" : "hidden"
          } lg:flex lg:flex-row flex-wrap gap-4 lg:gap-6 text-sm font-medium`}
      >
        <NavLink to="/" onClick={() => setIsMenuOpen(false)} className={navLinkClass}>
          Trang chủ
        </NavLink>
        <NavLink to="/search-history" onClick={() => setIsMenuOpen(false)} className={navLinkClass}>
          Lịch sử tìm kiếm
        </NavLink>
        <NavLink to="/bookmarks" onClick={() => setIsMenuOpen(false)} className={navLinkClass}>
          Ảnh đã lưu
        </NavLink>
      </nav>

      {isAuthenticated ? (
        <div
          className={`${isMenuOpen ? "flex flex-col items-start" : "hidden"
            } lg:flex lg:flex-row flex-wrap lg:items-center gap-3`}
        >
          {role === "ADMIN" && (
            <Link
              to="/admin"
              onClick={() => setIsMenuOpen(false)}
              className="mr-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-300"
              title="Quay lại giao diện quản trị"
            >
              Về Admin Dashboard
            </Link>
          )}

          <span className="text-sm font-semibold text-blue-700">
            Chào {displayName}!
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="cursor-pointer rounded-md border border-blue-500 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-indigo-800 hover:text-white"
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <div
          className={`${isMenuOpen ? "flex flex-col items-start" : "hidden"
            } lg:flex lg:flex-row gap-3`}
        >
          <Link
            to="/register"
            onClick={() => setIsMenuOpen(false)}
            className="rounded-md border border-indigo-500 px-4 py-2 text-sm font-semibold text-indigo-700 transition-all duration-200 hover:border-indigo-700 hover:bg-indigo-600 hover:text-white"
          >
            Đăng ký
          </Link>
          <Link
            to="/login"
            onClick={() => setIsMenuOpen(false)}
            className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-800"
          >
            Đăng nhập
          </Link>
        </div>
      )}
    </header>
  );
};