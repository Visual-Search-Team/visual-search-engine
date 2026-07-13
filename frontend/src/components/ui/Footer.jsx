export const Footer = () => {
  return (
    <footer className="flex flex-col gap-4 border-t px-4 py-6 text-sm text-gray-500 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
      <div className="font-bold text-gray-800">Visual Search</div>
      <div className="flex flex-wrap gap-6">
        <a href="#" className="hover:text-gray-900">
          Về chúng tôi
        </a>
        <a href="#" className="hover:text-gray-900">
          Điều khoản dịch vụ
        </a>
        <a href="#" className="hover:text-gray-900">
          Chính sách bảo mật
        </a>
        <a href="#" className="hover:text-gray-900">
          Liên hệ
        </a>
      </div>
      <div>© 2024 Visual Search AI. Tất cả quyền được bảo lưu.</div>
    </footer>
  );
};
