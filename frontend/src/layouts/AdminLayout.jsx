export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      <header className="border-b bg-white px-8 py-4">
        <div className="text-2xl font-bold text-indigo-700">Visual Search Admin</div>
      </header>
      <main className="px-8 py-8">{children}</main>
    </div>
  );
}
