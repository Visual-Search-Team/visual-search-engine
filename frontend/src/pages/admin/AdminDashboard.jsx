export default function AdminDashboard() {
  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-indigo-700">Admin Dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">
          Tổng quan hệ thống
        </h1>
        <p className="mt-2 text-gray-600">
          Bạn đã đăng nhập với quyền ADMIN. Các thống kê và indexing status sẽ được tích hợp ở sprint tiếp theo.
        </p>
      </div>
    </section>
  );
}
