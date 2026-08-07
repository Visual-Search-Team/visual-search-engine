export const Footer = () => {
  return (
    <footer className="mt-auto flex flex-col items-center gap-6 border-t border-gray-200 px-4 py-8 text-sm text-gray-500 sm:px-8 md:flex-row md:justify-between md:text-left">
      <div className="text-lg font-bold text-gray-800">Visual Search</div>
      
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 md:justify-end">
        <a href="#" className="transition-colors hover:text-indigo-600">
          Về chúng tôi
        </a>
        <a href="#" className="transition-colors hover:text-indigo-600">
          Điều khoản dịch vụ
        </a>
        <a href="#" className="transition-colors hover:text-indigo-600">
          Chính sách bảo mật
        </a>
        <a href="#" className="transition-colors hover:text-indigo-600">
          Liên hệ
        </a>
      </div>
      
      <div className="text-center md:text-right">
        © 2026 Visual Search AI. Tất cả quyền được bảo lưu.
      </div>
    </footer>
  );
};