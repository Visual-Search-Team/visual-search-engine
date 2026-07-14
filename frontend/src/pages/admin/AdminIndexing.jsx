import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";
import { createBatch, getBatches } from "../../services/adminBatchService";

const statusOptions = ["DRAFT", "INDEXING", "COMPLETED", "FAILED"];

const statusStyles = {
  DRAFT: "border-sky-200 bg-sky-50 text-sky-700",
  INDEXING: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
};

const formatDateTime = (value) => {
  if (!value) return "--";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const getApiErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
      statusStyles[status] || "border-zinc-200 bg-zinc-50 text-zinc-700"
    }`}
  >
    {status || "UNKNOWN"}
  </span>
);

export const AdminIndexing = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    name: "",
    status: "",
    fromDate: "",
    toDate: "",
  });
  const [page, setPage] = useState(1);
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");

  const batchesQuery = useQuery({
    queryKey: ["admin-batches", filters, page],
    queryFn: () => getBatches({ ...filters, page, size: 10 }),
  });

  const batches = batchesQuery.data?.content || [];
  const pagination = {
    page: batchesQuery.data?.page || page,
    totalPages: batchesQuery.data?.totalPages || 1,
    totalElements: batchesQuery.data?.totalElements || batches.length,
    hasNext: batchesQuery.data?.hasNext,
    hasPrevious: batchesQuery.data?.hasPrevious,
  };

  const createBatchMutation = useMutation({
    mutationFn: createBatch,
    onSuccess: (newBatch) => {
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
      setCreateForm({ name: "", description: "" });
      setFormError("");
      navigate(`/admin/indexing/${newBatch.id}`);
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, "Không thể tạo batch mới"));
    },
  });

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const handleCreateBatch = (event) => {
    event.preventDefault();
    const name = createForm.name.trim();

    if (!name) {
      setFormError("Vui lòng nhập tên batch");
      return;
    }

    createBatchMutation.mutate({
      name,
      description: createForm.description.trim(),
    });
  };

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">Batch Indexing</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-900">Danh sách batch</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Mỗi dòng là một batch. Click vào dòng bất kỳ để mở trang chi tiết và upload ảnh.
          </p>
        </div>
        <button
          type="button"
          onClick={() => batchesQuery.refetch()}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <FiRefreshCw className="size-4" />
          Làm mới
        </button>
      </div>

      <form onSubmit={handleCreateBatch} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700">
              Tên batch
              <input
                value={createForm.name}
                onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
                placeholder="Ví dụ: Fashion Products July 2026"
              />
            </label>
          </div>
          <div className="flex-[1.2]">
            <label className="text-sm font-medium text-gray-700">
              Mô tả
              <input
                value={createForm.description}
                onChange={(event) => setCreateForm((current) => ({ ...current, description: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
                placeholder="Mô tả ngắn về tập ảnh"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={createBatchMutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FiPlus className="size-4" />
            {createBatchMutation.isPending ? "Đang tạo..." : "Tạo batch"}
          </button>
        </div>
        {formError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {formError}
          </div>
        )}
      </form>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(260px,1fr)_180px_160px_160px]">
            <label className="relative">
              <FiSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
              <input
                name="name"
                value={filters.name}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
                placeholder="Tìm theo tên batch"
              />
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">Tất cả trạng thái</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              name="fromDate"
              type="date"
              value={filters.fromDate}
              onChange={handleFilterChange}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            />
            <input
              name="toDate"
              type="date"
              value={filters.toDate}
              onChange={handleFilterChange}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="border-b border-zinc-200 px-4 py-3">ID</th>
                <th className="border-b border-zinc-200 px-4 py-3">Tên batch</th>
                <th className="border-b border-zinc-200 px-4 py-3">Trạng thái</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Tổng ảnh</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Đã index</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Thất bại</th>
                <th className="border-b border-zinc-200 px-4 py-3">Tiến độ</th>
                <th className="border-b border-zinc-200 px-4 py-3">Ngày tạo</th>
                <th className="border-b border-zinc-200 px-4 py-3">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {batchesQuery.isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={9} className="border-b border-zinc-100 px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))}

              {batchesQuery.isError && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-rose-700">
                    {getApiErrorMessage(batchesQuery.error, "Không tải được danh sách batch")}
                  </td>
                </tr>
              )}

              {!batchesQuery.isLoading && !batchesQuery.isError && batches.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">
                    Chưa có batch phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}

              {!batchesQuery.isLoading &&
                !batchesQuery.isError &&
                batches.map((batch) => (
                  <tr
                    key={batch.id}
                    onClick={() => navigate(`/admin/indexing/${batch.id}`)}
                    className="cursor-pointer transition hover:bg-indigo-50/70"
                  >
                    <td className="border-b border-zinc-100 px-4 py-4 font-semibold text-zinc-900">#{batch.id}</td>
                    <td className="border-b border-zinc-100 px-4 py-4 font-medium text-zinc-900">{batch.name}</td>
                    <td className="border-b border-zinc-100 px-4 py-4">
                      <StatusBadge status={batch.status} />
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{batch.totalImages}</td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{batch.indexedImages}</td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{batch.failedImages}</td>
                    <td className="border-b border-zinc-100 px-4 py-4">
                      <div className="flex min-w-32 items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-indigo-700"
                            style={{ width: `${Math.min(Number(batch.progressPercentage || 0), 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-medium text-gray-600">
                          {Number(batch.progressPercentage || 0).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-gray-600">{formatDateTime(batch.createdAt)}</td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-gray-600">{formatDateTime(batch.updatedAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Tổng {pagination.totalElements} batch • 10 batch / trang
          </span>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <button
              type="button"
              disabled={!pagination.hasPrevious && page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FiChevronLeft className="size-4" />
              Trước
            </button>
            <span>
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={!pagination.hasNext && page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau
              <FiChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
