export default function AuthLayout({ children }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 flex items-center justify-center font-sans">
      {children}
    </main>
  );
}
