import { useQuery } from "@tanstack/react-query";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiImage,
  FiLoader,
  FiRefreshCw,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";
import { getAdminStats } from "../../services/adminIndexingService";

const numberFormatter = new Intl.NumberFormat("vi-VN");

const statCards = [
  {
    key: "indexed",
    label: "Ảnh đã index",
    description: "Tổng số ảnh đã embedding và lưu vector thành công.",
    icon: FiCheckCircle,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    key: "totalUsers",
    label: "Người dùng",
    description: "Tổng số tài khoản hiện có trong hệ thống.",
    icon: FiUsers,
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    key: "totalImages",
    label: "Tổng ảnh upload",
    description: "Tổng số ảnh đã được upload lên hệ thống.",
    icon: FiImage,
    tone: "border-violet-200 bg-violet-50 text-violet-700",
  },
  {
    key: "processing",
    label: "Đang index",
    description: "Số ảnh đang được xử lý nền ở thời điểm hiện tại.",
    icon: FiLoader,
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
];

const statusCards = [
  {
    key: "pending",
    label: "Chờ xử lý",
    icon: FiClock,
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  },
  {
    key: "failed",
    label: "Lỗi indexing",
    icon: FiXCircle,
    tone: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

const formatNumber = (value) => numberFormatter.format(Number(value ?? 0));

const MetricCard = ({ label, description, value, icon: Icon, tone }) => (
  <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-zinc-600">{label}</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">{formatNumber(value)}</p>
      </div>
      <div className={`rounded-xl border p-3 ${tone}`}>
        <Icon className="size-5" />
      </div>
    </div>
    <p className="mt-4 text-sm leading-6 text-zinc-500">{description}</p>
  </article>
);

const StatusCard = ({ label, value, icon: Icon, tone }) => (
  <article className={`rounded-2xl border p-4 ${tone}`}>
    <div className="flex items-center gap-3">
      <Icon className="size-4" />
      <span className="text-sm font-medium">{label}</span>
    </div>
    <p className="mt-3 text-2xl font-semibold">{formatNumber(value)}</p>
  </article>
);

export default function AdminDashboard() {
  const statsQuery = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: getAdminStats,
  });

  const stats = statsQuery.data ?? {};

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-700">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
              Tổng quan hệ thống
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
              Theo dõi nhanh số ảnh đã index, tổng số người dùng và trạng thái hàng đợi indexing ngay trên một màn hình.
            </p>
          </div>

          <button
            type="button"
            onClick={() => statsQuery.refetch()}
            disabled={statsQuery.isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FiRefreshCw className={`size-4 ${statsQuery.isFetching ? "animate-spin" : ""}`} />
            Làm mới số liệu
          </button>
        </div>
      </div>

      {statsQuery.isError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Không thể tải thống kê dashboard. Vui lòng thử lại.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard
            key={card.key}
            label={card.label}
            description={card.description}
            value={stats[card.key]}
            icon={card.icon}
            tone={card.tone}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-700">
              <FiAlertCircle className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Tình trạng indexing</h2>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Các số liệu này lấy trực tiếp từ backend và phản ánh trạng thái hiện tại của pipeline indexing ảnh.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {statusCards.map((card) => (
              <StatusCard
                key={card.key}
                label={card.label}
                value={stats[card.key]}
                icon={card.icon}
                tone={card.tone}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-sm">
          <p className="text-sm font-medium text-indigo-200">Pipeline snapshot</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight">{formatNumber(stats.indexed)}</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">
            ảnh đã index xong và sẵn sàng cho tìm kiếm. Hệ thống hiện có {formatNumber(stats.totalUsers)} người dùng và {formatNumber(stats.processing)} ảnh đang xử lý nền.
          </p>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  stats.totalImages > 0 ? Math.round(((stats.indexed ?? 0) / stats.totalImages) * 100) : 0
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-300">
            {stats.totalImages > 0
              ? `${Math.round(((stats.indexed ?? 0) / stats.totalImages) * 100)}% ảnh đã index`
              : "Chưa có ảnh được upload"}
          </p>
        </div>
      </div>
    </section>
  );
}
