import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FaChevronLeft, FaChevronRight, FaTrash, FaArrowLeft } from "react-icons/fa";
import { SearchHistoryCard } from "../components/ui/SearchHistoryCard";
import { deleteAllSearchHistory, getSearchHistory } from "../services/searchHistoryService";
import { SearchHistoryDetailModal } from "../components/common/SearchHistoryDetail";

const PAGE_SIZE = 20;

const filters = [
  { label: "Tất cả", value: "" },
  { label: "Tìm bằng hình ảnh", value: "IMAGE_TO_IMAGE" },
  { label: "Text Semantic", value: "TEXT_SEMANTIC" },
  { label: "Text OCR", value: "TEXT_OCR" },
];

const normalizeHistoryResponse = (response) => {
  const data = response?.data || {};
  const histories = data.queries || data.results || [];

  return {
    histories,
    pageNumber: data.pageNumber ?? data.page ?? 0,
    pageSize: data.pageSize ?? data.size ?? PAGE_SIZE,
    totalElements: data.totalElements ?? histories.length,
    totalPages: data.totalPages ?? 0,
    processingTimeMs: data.processingTimeMs,
  };
};

export const SearchHistory = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("");
  const [page, setPage] = useState(0);

  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const handleOpenDetail = (id) => {
    setSelectedHistoryId(id);
  };

  const historyQuery = useQuery({
    queryKey: ["search-history", activeFilter, page],
    queryFn: () => getSearchHistory({
      page,
      size: PAGE_SIZE,
      searchType: activeFilter,
    }),
    placeholderData: keepPreviousData,
  });

  const historyData = useMemo(
    () => normalizeHistoryResponse(historyQuery.data),
    [historyQuery.data]
  );

  const deleteAllMutation = useMutation({
    mutationFn: deleteAllSearchHistory,
    onSuccess: () => {
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ["search-history"] });
    },
  });

  const handleFilterChange = (nextFilter) => {
    setActiveFilter(nextFilter);
    setPage(0);
  };

  const handleDeleteAll = () => {
    const confirmed = window.confirm("Bạn có chắc muốn xoá toàn bộ lịch sử tìm kiếm?");

    if (confirmed) {
      deleteAllMutation.mutate();
    }
  };

  const currentPage = historyData.pageNumber + 1;
  const totalPages = historyData.totalPages || 1;
  const isEmpty = !historyQuery.isLoading && historyData.histories.length === 0;

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex w-[200px] items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-800 cursor-pointer"
        >
          <FaArrowLeft />
          <span>Quay lại trang chủ</span>
        </button>
      </div>
      <div className="flex flex-col gap-5 border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-10 text-zinc-900">
              Lịch sử tìm kiếm
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Xem lại các truy vấn ảnh, semantic text và OCR text đã thực hiện.
            </p>
          </div>

          {historyData.processingTimeMs !== undefined && (
            <p className="rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600">
              Tải trong{" "}
              <span className="font-semibold text-zinc-900">
                {historyData.processingTimeMs}ms
              </span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = activeFilter === filter.value;

              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => handleFilterChange(filter.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${isActive
                    ? "border-indigo-700 bg-indigo-700 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={deleteAllMutation.isPending || historyData.totalElements === 0}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaTrash className="h-3.5 w-3.5" />
            {deleteAllMutation.isPending ? "Đang xoá..." : "Xoá lịch sử"}
          </button>
        </div>
      </div>

      {historyQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : historyQuery.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Không thể tải lịch sử tìm kiếm. Vui lòng thử lại sau.
        </div>
      ) : isEmpty ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-zinc-900">
            Chưa có lịch sử tìm kiếm
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Các truy vấn đã chạy thành công sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {historyData.histories.map((history, index) => {
              const currentId = history.searchId || history.id;
              return (
                <SearchHistoryCard
                  key={history.searchId || history.id || `${history.searchType}-${index}`}
                  history={history}
                  onClick={() => handleOpenDetail(currentId)}
                />
              )

            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
            <p className="text-sm text-gray-600">
              Trang <span className="font-semibold text-zinc-900">{currentPage}</span> /{" "}
              <span className="font-semibold text-zinc-900">{totalPages}</span>
              {" "}• {historyData.totalElements} lịch sử
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
                disabled={page <= 0 || historyQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaChevronLeft className="h-3 w-3" />
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={currentPage >= totalPages || historyQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <FaChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {selectedHistoryId && (
            <SearchHistoryDetailModal
              isOpen={!!selectedHistoryId}
              onClose={() => setSelectedHistoryId(null)}
              searchId={selectedHistoryId}
            />
          )}

        </>
      )}
    </section>
  );
};
