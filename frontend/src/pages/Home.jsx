import { Link } from "react-router-dom";
import VisualSearchPanel from "../components/common/VisualSearchPanel";
import { useAuth } from "../contexts/AuthContext";
import { SearchMethods } from "../components/common/SearchMethods";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex w-full flex-col items-center justify-center pt-8 pb-16">
      <div className="mb-12 w-full max-w-4xl text-center px-4">
        <h1 className="mb-6 text-4xl font-extrabold sm:text-5xl md:text-6xl tracking-tight">
          Tìm kiếm hình ảnh thông minh bằng{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
            AI
          </span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Tải ảnh lên, nhập mô tả hoặc tìm kiếm văn bản xuất hiện trong ảnh với độ chính xác và tốc độ vượt trội.
        </p>
      </div>

      {isAuthenticated ? (
        <VisualSearchPanel />
      ) : (
        <div className="flex w-full flex-col items-center gap-10 px-4">
          <section className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg sm:p-10">
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl"></div>
            <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl"></div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-zinc-900">
                Khám phá ngay sức mạnh của AI
              </h2>
              <p className="mt-3 text-gray-600">
                Đăng nhập để trải nghiệm toàn bộ tính năng tìm kiếm bằng hình ảnh, mô tả và nhận dạng ký tự (OCR).
              </p>
              <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  to="/login"
                  className="flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="flex items-center justify-center rounded-xl border-2 border-gray-200 px-6 py-3.5 text-sm font-semibold text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50"
                >
                  Tạo tài khoản miễn phí
                </Link>
              </div>
            </div>
          </section>
          
          <SearchMethods />
        </div>
      )}
    </div>
  );
}