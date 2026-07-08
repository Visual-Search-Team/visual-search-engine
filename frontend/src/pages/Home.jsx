import { Link } from "react-router-dom";
import VisualSearchPanel from "../components/common/VisualSearchPanel";
import { useAuth } from "../contexts/AuthContext";
import { SearchMethods } from "../components/common/SearchMethods";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <div className="mb-10 w-full max-w-4xl text-center">
        <h1 className="mb-4 text-4xl font-extrabold sm:text-5xl">
          Tìm kiếm hình ảnh thông minh bằng AI
        </h1>
        <p className="text-gray-500">
          Tải ảnh lên, nhập mô tả hoặc tìm kiếm chữ xuất hiện trong ảnh.
        </p>
      </div>

      {isAuthenticated ? (
        <VisualSearchPanel />
      ) : (
        <div className="flex flex-col items-center gap-6">
          <section className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-semibold text-zinc-900">
              Bạn cần đăng nhập để tiếp tục
            </h2>
            <p className="mt-3 text-gray-600">
              Đăng nhập để sử dụng các chế độ tìm kiếm hình ảnh, mô tả và OCR.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="rounded-lg bg-indigo-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-800"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                Tạo tài khoản
              </Link>
            </div>
          </section>
          <SearchMethods />
        </div>
      )}
    </>
  );
}
