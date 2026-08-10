import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiChevronLeft, FiChevronRight, FiRefreshCw, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import Swal from "sweetalert2";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { getTrashImageApiUrl } from "../../services/imageService";
import { ImagePreviewModal } from "../../components/common/ImagePreviewModal";
import {
  getTrashImages, getTrashPolicy, permanentlyDeleteAllTrashImages,
  permanentlyDeleteSelectedTrashImages,
  permanentlyDeleteTrashImage,
  restoreAllTrashImages,
  restoreSelectedTrashImages,
  restoreTrashImage,
} from "../../services/adminTrashService";
import { formatDateTime } from "../../utils/formatDateTime";


const getApiErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const formatFileSize = (value) => {
  if (!value) return "0 MB";
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
};

export const AdminTrash = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [selectedImageIds, setSelectedImageIds] = useState([]);
  const [previewImageId, setPreviewImageId] = useState(null);

  const trashQuery = useQuery({
    queryKey: ["admin-trash-images", page],
    queryFn: () => getTrashImages({ page, size: 10 }),
    refetchInterval: 10000,
  });


  const policyQuery = useQuery({
    queryKey: ["admin-trash-policy"],
    queryFn: getTrashPolicy,
  });

  const restoreMutation = useMutation({
    mutationFn: restoreTrashImage,
    onSuccess: (image) => {
      const restoredJobText = image?.restoredJobId ? ` và gán vào job #${image.restoredJobId}` : "";
      setFeedback(`Đã khôi phục ảnh #${image.id} thành công${restoredJobText}.`);
      queryClient.invalidateQueries({ queryKey: ["admin-trash-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-indexing-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (error) => {
      setFeedback(getApiErrorMessage(error, "Không thể khôi phục ảnh."));
    },
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteTrashImage,
    onSuccess: () => {
      setFeedback("Đã xóa vĩnh viễn ảnh thành công.");
      queryClient.invalidateQueries({ queryKey: ["admin-trash-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (error) => {
      setFeedback(getApiErrorMessage(error, "Không thể xóa vĩnh viễn ảnh."));
    },
  });

  const restoreSelectedMutation = useMutation({
    mutationFn: restoreSelectedTrashImages,
    onSuccess: (result) => {
      const affectedCount = Number(result?.affectedCount ?? 0);
      setFeedback(`Đã khôi phục ${affectedCount} ảnh đã chọn.`);
      setSelectedImageIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-trash-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-indexing-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (error) => {
      setFeedback(getApiErrorMessage(error, "Không thể khôi phục ảnh đã chọn."));
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: permanentlyDeleteSelectedTrashImages,
    onSuccess: (result) => {
      const affectedCount = Number(result?.affectedCount ?? 0);
      setFeedback(`Đã xóa vĩnh viễn ${affectedCount} ảnh đã chọn.`);
      setSelectedImageIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-trash-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (error) => {
      setFeedback(getApiErrorMessage(error, "Không thể xóa vĩnh viễn ảnh đã chọn."));
    },
  });

  const restoreAllMutation = useMutation({
    mutationFn: restoreAllTrashImages,
    onSuccess: (result) => {
      const affectedCount = Number(result?.affectedCount ?? 0);
      setFeedback(`Đã khôi phục toàn bộ ${affectedCount} ảnh trong thùng rác.`);
      setSelectedImageIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-trash-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-indexing-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (error) => {
      setFeedback(getApiErrorMessage(error, "Không thể khôi phục toàn bộ ảnh."));
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: permanentlyDeleteAllTrashImages,
    onSuccess: (result) => {
      const affectedCount = Number(result?.affectedCount ?? 0);
      setFeedback(`Đã xóa vĩnh viễn toàn bộ ${affectedCount} ảnh trong thùng rác.`);
      setSelectedImageIds([]);
      queryClient.invalidateQueries({ queryKey: ["admin-trash-images"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (error) => {
      setFeedback(getApiErrorMessage(error, "Không thể xóa toàn bộ ảnh trong thùng rác."));
    },
  });

  const pagination = {
    page: trashQuery.data?.page || page,
    totalPages: trashQuery.data?.totalPages || 1,
    totalElements: trashQuery.data?.totalElements || 0,
    hasNext: trashQuery.data?.hasNext,
    hasPrevious: trashQuery.data?.hasPrevious,
  };

  const trashItems = trashQuery.data?.content || [];

  const retentionDays = policyQuery.data?.retentionDays ?? 30;
  const selectedCount = selectedImageIds.length;
  const currentPageImageIds = trashItems.map((item) => item.id);

  const allCurrentPageSelected =
    currentPageImageIds.length > 0 && currentPageImageIds.every((id) => selectedImageIds.includes(id));

  const isAnyMutationPending =
    restoreMutation.isPending ||
    permanentDeleteMutation.isPending ||
    restoreSelectedMutation.isPending ||
    deleteSelectedMutation.isPending ||
    restoreAllMutation.isPending ||
    deleteAllMutation.isPending;

  const toggleSelectImage = (imageId) => {
    setSelectedImageIds((prev) => {
      if (prev.includes(imageId)) {
        return prev.filter((id) => id !== imageId);
      }
      return [...prev, imageId];
    });
  };

  const toggleSelectAllCurrentPage = () => {
    setSelectedImageIds((prev) => {
      if (allCurrentPageSelected) {
        return prev.filter((id) => !currentPageImageIds.includes(id));
      }

      const next = new Set(prev);
      currentPageImageIds.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const confirmRestore = async (imageId) => {
    const result = await Swal.fire({
      title: "Khôi phục ảnh này?",
      text: "Ảnh sẽ được đưa ra khỏi thùng rác và có thể tìm kiếm lại.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Khôi phục",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      restoreMutation.mutate(imageId);
    }
  };

  const confirmPermanentDelete = async (imageId) => {
    const result = await Swal.fire({
      title: "Xóa vĩnh viễn ảnh này?",
      text: "Thao tác này sẽ xóa dữ liệu khỏi hệ thống và không thể hoàn tác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa vĩnh viễn",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });

    if (result.isConfirmed) {
      permanentDeleteMutation.mutate(imageId);
    }
  };

  const confirmRestoreSelected = async () => {
    if (selectedCount === 0) return;

    const result = await Swal.fire({
      title: `Khôi phục ${selectedCount} ảnh đã chọn?`,
      text: "Các ảnh đã chọn sẽ được đưa ra khỏi thùng rác.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Khôi phục đã chọn",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      restoreSelectedMutation.mutate(selectedImageIds);
    }
  };

  const confirmDeleteSelected = async () => {
    if (selectedCount === 0) return;

    const result = await Swal.fire({
      title: `Xóa vĩnh viễn ${selectedCount} ảnh đã chọn?`,
      text: "Không thể hoàn tác thao tác này.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa đã chọn",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });

    if (result.isConfirmed) {
      deleteSelectedMutation.mutate(selectedImageIds);
    }
  };

  const confirmRestoreAll = async () => {
    if (!pagination.totalElements) return;

    const result = await Swal.fire({
      title: "Khôi phục tất cả ảnh trong thùng rác?",
      text: `Tổng cộng ${pagination.totalElements} ảnh sẽ được khôi phục.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Khôi phục tất cả",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      restoreAllMutation.mutate();
    }
  };

  const confirmDeleteAll = async () => {
    if (!pagination.totalElements) return;

    const result = await Swal.fire({
      title: "Xóa tất cả ảnh trong thùng rác?",
      text: `Tổng cộng ${pagination.totalElements} ảnh sẽ bị xóa vĩnh viễn và không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Xóa tất cả",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });

    if (result.isConfirmed) {
      deleteAllMutation.mutate();
    }
  };

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">Trash Bin</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-900">Quản lý ảnh đã xóa</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ảnh trong thùng rác sẽ tự xóa sau {retentionDays} ngày kể từ lúc xóa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            trashQuery.refetch();
            policyQuery.refetch();
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <FiRefreshCw className="size-4" />
          Làm mới
        </button>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-3 lg:p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center justify-between lg:justify-start gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800">
              <input
                type="checkbox"
                checked={allCurrentPageSelected}
                onChange={toggleSelectAllCurrentPage}
                disabled={!trashItems.length || isAnyMutationPending}
                className="size-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="hidden sm:inline">Chọn tất cả ảnh ở trang hiện tại</span>
              <span className="sm:hidden">Chọn tất cả</span>
            </label>

            <p className="text-sm text-gray-500 whitespace-nowrap">Đã chọn: {selectedCount}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:mt-0">
            <button
              type="button"
              onClick={confirmRestoreSelected}
              disabled={!selectedCount || isAnyMutationPending}
              className="inline-flex cursor-pointer w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs sm:text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Khôi phục đã chọn
            </button>

            <button
              type="button"
              onClick={confirmDeleteSelected}
              disabled={!selectedCount || isAnyMutationPending}
              className="inline-flex cursor-pointer w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs sm:text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xóa đã chọn
            </button>

            <button
              type="button"
              onClick={confirmRestoreAll}
              disabled={!pagination.totalElements || isAnyMutationPending}
              className="inline-flex cursor-pointer w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs sm:text-sm font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Khôi phục tất cả
            </button>

            <button
              type="button"
              onClick={confirmDeleteAll}
              disabled={!pagination.totalElements || isAnyMutationPending}
              className="inline-flex cursor-pointer w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-100 px-3 py-2 text-xs sm:text-sm font-medium text-rose-800 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Xóa tất cả
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          {feedback}
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <h3 className="text-base font-semibold text-zinc-900">Danh sách ảnh trong thùng rác</h3>
          <p className="mt-1 text-sm text-gray-500">Tổng: {pagination.totalElements} ảnh</p>
        </div>

        {trashQuery.isLoading ? (
          <div className="p-6 text-sm text-gray-500">Đang tải dữ liệu thùng rác...</div>
        ) : trashItems.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">Thùng rác hiện đang trống.</div>
        ) : (
          <div className="space-y-3 sm:space-y-4 p-2 sm:p-4">
            {trashItems.map((item) => (
              <article
                key={item.id}
                className="grid gap-3 sm:gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:p-4 md:grid-cols-[150px_1fr_auto] lg:grid-cols-[180px_1fr_auto] shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-48 md:h-36 lg:h-40 overflow-hidden rounded-md bg-slate-100 group">
                  <div className="absolute top-2 left-2 z-10">
                    <label
                      className="inline-flex items-center gap-2 rounded bg-white/80 px-2 py-1 text-xs font-medium text-zinc-700 shadow-sm backdrop-blur-sm cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selectedImageIds.includes(item.id)}
                        onChange={() => toggleSelectImage(item.id)}
                        disabled={isAnyMutationPending}
                        className="size-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>

                  <ImageWithFallback
                    imageId={item.id}
                    src={getTrashImageApiUrl(item.id)}
                    alt={item.originalFileName || `Image ${item.id}`}
                    className="h-full w-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setPreviewImageId(item.id)}
                  />
                </div>

                <div className="space-y-1 text-sm text-gray-700 flex flex-col justify-center">
                  <p className="hidden md:block text-base font-semibold text-zinc-900 truncate">#{item.id} - {item.originalFileName || "--"}</p>
                  <p className="hidden md:block">Kích thước: {formatFileSize(item.fileSize)}</p>
                  <p className="hidden md:block">Loại tệp: {item.mimeType || "--"}</p>
                  <p className="hidden md:block">Kích thước ảnh: {item.width || "--"} x {item.height || "--"}</p>
                  <p className="hidden md:block">Đưa vào thùng rác: {formatDateTime(item.deletedAt)}</p>
                  <p className="hidden md:block">Tự xóa vào: {formatDateTime(item.expiresAt)}</p>

                  <p className="font-medium text-amber-700 text-center md:text-left text-base md:text-sm mt-1 md:mt-0">
                    Còn lại: {Number(item.daysUntilPermanentDeletion ?? 0)} ngày
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 md:flex md:flex-col md:items-stretch md:justify-center">
                  <button
                    type="button"
                    onClick={() => confirmRestore(item.id)}
                    disabled={isAnyMutationPending}
                    className="inline-flex cursor-pointer w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FiRotateCcw className="size-4" />
                    Khôi phục
                  </button>

                  <button
                    type="button"
                    onClick={() => confirmPermanentDelete(item.id)}
                    disabled={isAnyMutationPending}
                    className="inline-flex cursor-pointer w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <FiTrash2 className="size-4" />
                    Xóa
                    <span className="hidden md:inline">vĩnh viễn</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-gray-600">
          <button
            type="button"
            disabled={!pagination.hasPrevious}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FiChevronLeft className="size-4" />
            Trước
          </button>

          <span>
            Trang {pagination.page} / {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={!pagination.hasNext}
            onClick={() => setPage((current) => current + 1)}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
            <FiChevronRight className="size-4" />
          </button>
        </div>
      </div>


      {previewImageId && (
        <ImagePreviewModal
          imageId={previewImageId}
          imageUrl={getTrashImageApiUrl(previewImageId)}
          onClose={() => setPreviewImageId(null)}
        />
      )}
    </section>
  );
};
