import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiTrash2,
  FiUploadCloud,
  FiZap,
} from "react-icons/fi";
import { getBatch } from "../../services/adminBatchService";
import { getIndexingJobStatus, triggerIndexingJob } from "../../services/adminIndexingService";
import { getImageUrl, uploadBatchImages } from "../../services/imageService";
import { validateFile } from "../../utils/fileValidation";
import { resolveImageUrl } from "../../utils/imageUrl";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";

const imagesPerPage = 20;

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

const StatCard = ({ label, value }) => (
  <div className="rounded-lg border border-zinc-200 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
  </div>
);

export const BatchDetail = () => {
  const { batchId } = useParams();
  const queryClient = useQueryClient();
  const [uploadMessage, setUploadMessage] = useState("");
  const [localImages, setLocalImages] = useState([]);
  const [imagePage, setImagePage] = useState(1);
  const [activeJob, setActiveJob] = useState(null);
  const previewUrlsRef = useRef([]);

  const batchQuery = useQuery({
    queryKey: ["admin-batch", batchId],
    queryFn: () => getBatch(batchId),
    enabled: !!batchId,
  });

  const uploadImagesMutation = useMutation({
    mutationFn: async (files) => {
      const uploadedImages = await uploadBatchImages(batchId, files);

      return Promise.all(
        uploadedImages.map(async (image) => {
          let imageUrl;

          try {
            imageUrl = await getImageUrl(image.id);
          } catch {
            imageUrl = resolveImageUrl(image.storagePath, image.id);
          }

          return {
            id: image.id,
            fileName: image.fileName,
            size: image.fileSize,
            previewUrl: resolveImageUrl(imageUrl || image.storagePath, image.id),
            status: "PENDING",
            uploadedAt: image.uploadedAt,
            isUploaded: true,
          };
        })
      );
    },
    onSuccess: (uploadedImages) => {
      setLocalImages((current) => {
        const withoutUploading = current.filter((image) => image.status !== "UPLOADING");
        return [...uploadedImages, ...withoutUploading];
      });
      setImagePage(1);
      setUploadMessage(`Upload thành công ${uploadedImages.length} ảnh vào batch.`);
      queryClient.invalidateQueries({ queryKey: ["admin-batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
    },
    onError: (error) => {
      setLocalImages((current) =>
        current.map((image) => (image.status === "UPLOADING" ? { ...image, status: "UPLOAD_FAILED" } : image))
      );
      setUploadMessage(getApiErrorMessage(error, "Upload ảnh thất bại"));
    },
  });

  const triggerIndexMutation = useMutation({
    mutationFn: () => triggerIndexingJob(batchId),
    onSuccess: (job) => {
      setActiveJob(job);
      setUploadMessage(`Đã tạo indexing job #${job.id}. Hệ thống đang bắt đầu xử lý ảnh.`);
      queryClient.invalidateQueries({ queryKey: ["admin-batch", batchId] });
      queryClient.invalidateQueries({ queryKey: ["admin-batches"] });
    },
    onError: (error) => {
      setUploadMessage(getApiErrorMessage(error, "Không thể bắt đầu indexing"));
    },
  });

  const jobStatusQuery = useQuery({
    queryKey: ["admin-indexing-job-status", activeJob?.id],
    queryFn: () => getIndexingJobStatus(activeJob.id),
    enabled: !!activeJob?.id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 5000;
    },
  });

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;

    return () => {
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  const totalImagePages = Math.max(1, Math.ceil(localImages.length / imagesPerPage));
  const visibleImages = useMemo(() => {
    const start = (imagePage - 1) * imagesPerPage;
    return localImages.slice(start, start + imagesPerPage);
  }, [imagePage, localImages]);

  const handleUploadPreview = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const validImages = files.filter(validateFile);
    const invalidCount = files.length - validImages.length;
    const previews = validImages.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);

      return {
        id: `${file.name}-${file.lastModified}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        fileName: file.name,
        size: file.size,
        previewUrl,
        status: "UPLOADING",
        isUploaded: false,
      };
    });

    setLocalImages((current) => [...previews, ...current]);
    setImagePage(1);
    setUploadMessage(
      invalidCount > 0
        ? `Đang upload ${validImages.length} ảnh hợp lệ. ${invalidCount} file bị bỏ qua vì không đúng định dạng hoặc vượt 10MB.`
        : `Đang upload ${validImages.length} ảnh vào batch.`
    );
    event.target.value = "";

    if (validImages.length > 0) {
      uploadImagesMutation.mutate(validImages);
    }
  };

  const handleRemoveImage = (imageId) => {
    setLocalImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter((previewUrl) => previewUrl !== image.previewUrl);
      }

      const nextImages = current.filter((item) => item.id !== imageId);
      const nextTotalPages = Math.max(1, Math.ceil(nextImages.length / imagesPerPage));
      setImagePage((currentPage) => Math.min(currentPage, nextTotalPages));
      return nextImages;
    });
  };

  const handleStartIndex = () => {
    triggerIndexMutation.mutate();
  };

  if (batchQuery.isLoading) {
    return (
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="h-10 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-44 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-96 animate-pulse rounded-lg bg-slate-100" />
      </section>
    );
  }

  if (batchQuery.isError) {
    return (
      <section className="mx-auto max-w-7xl">
        <Link
          to="/admin/indexing"
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:underline"
        >
          <FiArrowLeft className="size-4" />
          Quay lại danh sách batch
        </Link>
        <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {getApiErrorMessage(batchQuery.error, "Không tải được chi tiết batch")}
        </div>
      </section>
    );
  }

  const batch = batchQuery.data;

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            to="/admin/indexing"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:underline"
          >
            <FiArrowLeft className="size-4" />
            Quay lại danh sách batch
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h2 className="truncate text-2xl font-semibold text-zinc-900">{batch.name}</h2>
            <StatusBadge status={batch.status} />
          </div>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">{batch.description || "Không có mô tả"}</p>
          <p className="mt-2 text-xs text-gray-500">
            Tạo lúc {formatDateTime(batch.createdAt)} • Cập nhật {formatDateTime(batch.updatedAt)}
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartIndex}
          disabled={triggerIndexMutation.isPending}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <FiZap className="size-4" />
          {triggerIndexMutation.isPending ? "Đang bắt đầu..." : "Start Index"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Tổng ảnh" value={batch.totalImages ?? 0} />
        <StatCard label="Đã index" value={batch.indexedImages ?? 0} />
        <StatCard label="Thất bại" value={batch.failedImages ?? 0} />
        <StatCard label="Tiến độ" value={`${Number(batch.progressPercentage || 0).toFixed(2)}%`} />
      </div>

      {activeJob && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">Indexing Job #{activeJob.id}</p>
              <p className="mt-1 text-sm text-indigo-700">
                Trạng thái: {jobStatusQuery.data?.status || activeJob.status || "PENDING"}
              </p>
            </div>
            <div className="text-sm font-semibold text-indigo-900">
              {Number(jobStatusQuery.data?.progressPercentage ?? activeJob.progressPercentage ?? 0).toFixed(0)}%
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-indigo-700 transition-all"
              style={{
                width: `${Math.min(
                  Number(jobStatusQuery.data?.progressPercentage ?? activeJob.progressPercentage ?? 0),
                  100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-6 py-8 text-center transition hover:bg-indigo-50">
            <FiUploadCloud className="size-8 text-indigo-700" />
            <span className="mt-3 text-sm font-semibold text-zinc-900">Upload ảnh cho batch này</span>
            <span className="mt-1 text-xs text-gray-500">Hỗ trợ JPG, PNG, WebP. Tối đa 10MB mỗi ảnh.</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUploadPreview}
              disabled={uploadImagesMutation.isPending}
              className="sr-only"
            />
          </label>

          {uploadMessage && (
            <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
              {uploadMessage}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Danh sách ảnh upload</h3>
              <p className="text-sm text-gray-500">{localImages.length} ảnh trong danh sách upload</p>
            </div>
            <div className="text-sm text-gray-500">20 ảnh / trang</div>
          </div>

          {localImages.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-center">
              <FiImage className="size-8 text-gray-400" />
              <p className="mt-3 text-sm font-medium text-zinc-900">Chưa có ảnh trong preview</p>
              <p className="mt-1 text-sm text-gray-500">
                Ảnh mới upload sẽ hiển thị ngay dưới khu vực upload và nằm ở đầu danh sách.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visibleImages.map((image) => (
                  <div key={image.id} className="group overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="relative aspect-square bg-slate-100">
                      <ImageWithFallback
                        src={image.previewUrl}
                        imageId={image.isUploaded ? image.id : undefined}
                        alt={image.fileName}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(image.id)}
                        className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-rose-600 opacity-0 shadow-sm transition hover:bg-rose-600 hover:text-white group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Xóa ${image.fileName}`}
                      >
                        <FiTrash2 className="size-4" />
                      </button>
                    </div>
                    <div className="p-3">
                      <p className="truncate text-xs font-semibold text-zinc-900" title={image.fileName}>
                        {image.fileName}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{(image.size / 1024 / 1024).toFixed(2)}MB</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-gray-600">
                          {image.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm text-gray-600">
                <button
                  type="button"
                  disabled={imagePage <= 1}
                  onClick={() => setImagePage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiChevronLeft className="size-4" />
                  Trước
                </button>
                <span>
                  Trang {imagePage} / {totalImagePages}
                </span>
                <button
                  type="button"
                  disabled={imagePage >= totalImagePages}
                  onClick={() => setImagePage((current) => Math.min(totalImagePages, current + 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                  <FiChevronRight className="size-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
