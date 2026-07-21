import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiImage,
  FiRefreshCw,
  FiRotateCcw,
  FiTrash2,
  FiUploadCloud,
} from "react-icons/fi";
import {
  getIndexingJobItems,
  getIndexingJobs,
  retryIndexingJob,
} from "../../services/adminIndexingService";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { uploadImages } from "../../services/imageService";
import { validateFile } from "../../utils/fileValidation";

const imagesPerPage = 20;

const statusStyles = {
  PENDING: "border-sky-200 bg-sky-50 text-sky-700",
  RUNNING: "border-amber-200 bg-amber-50 text-amber-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  PARTIALLY_FAILED: "border-orange-200 bg-orange-50 text-orange-700",
  PROCESSING: "border-amber-200 bg-amber-50 text-amber-700",
  INDEXED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  UPLOADING: "border-indigo-200 bg-indigo-50 text-indigo-700",
  UPLOAD_FAILED: "border-rose-200 bg-rose-50 text-rose-700",
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

const formatFileSize = (value) => {
  if (!value) return "0 MB";
  return `${(value / 1024 / 1024).toFixed(2)}MB`;
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

const StatCard = ({ label, value, hint }) => (
  <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
    {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
  </div>
);

export const AdminIndexing = () => {
  const queryClient = useQueryClient();
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobPage, setJobPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const [localImages, setLocalImages] = useState([]);
  const [page, setPage] = useState(1);
  const previewUrlsRef = useRef([]);

  const jobsQuery = useQuery({
    queryKey: ["admin-indexing-jobs", page],
    queryFn: () => getIndexingJobs({ page, size: 10 }),
    refetchInterval: (query) => {
      const jobs = query.state.data?.content || [];
      return jobs.some((job) => job.status === "RUNNING" || job.status === "PENDING") ? 5000 : false;
    },
  });

  const jobs = jobsQuery.data?.content || [];
  const pagination = {
    page: jobsQuery.data?.page || page,
    totalPages: jobsQuery.data?.totalPages || 1,
    totalElements: jobsQuery.data?.totalElements || jobs.length,
    hasNext: jobsQuery.data?.hasNext,
    hasPrevious: jobsQuery.data?.hasPrevious,
  };

  const effectiveSelectedJobId = selectedJobId ?? jobs[0]?.id ?? null;

  const itemsQuery = useQuery({
    queryKey: ["admin-indexing-job-items", effectiveSelectedJobId, itemPage],
    queryFn: () => getIndexingJobItems(effectiveSelectedJobId, { page: itemPage, size: 10 }),
    enabled: !!effectiveSelectedJobId,
    refetchInterval: (query) => {
      const statuses = query.state.data?.content?.map((item) => item.status) || [];
      return statuses.some((status) => status === "PENDING" || status === "PROCESSING") ? 5000 : false;
    },
  });

  const uploadImagesMutation = useMutation({
    mutationFn: uploadImages,
    onSuccess: (uploadedImages) => {
      const nextSelectedJobId = uploadedImages[0]?.indexJobId ?? null;
      const mappedImages = uploadedImages.map((image) => ({
        id: image.imageId,
        fileName: image.originalFileName,
        size: image.fileSize,
        previewUrl: image.thumbnailUrl || image.fileUrl,
        status: image.status,
        width: image.width,
        height: image.height,
      }));

      setLocalImages((current) => {
        const withoutUploading = current.filter((image) => image.status !== "UPLOADING");
        return [...mappedImages, ...withoutUploading];
      });
      setUploadMessage(`Upload thành công ${uploadedImages.length} ảnh. Hệ thống đang index ở nền.`);
      setJobPage(1);
      setPage(1);
      setItemPage(1);
      if (nextSelectedJobId) {
        setSelectedJobId(nextSelectedJobId);
      }
      queryClient.invalidateQueries({ queryKey: ["admin-indexing-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats"] });
    },
    onError: (error) => {
      setLocalImages((current) =>
        current.map((image) => (image.status === "UPLOADING" ? { ...image, status: "UPLOAD_FAILED" } : image))
      );
      setUploadMessage(getApiErrorMessage(error, "Upload ảnh thất bại"));
    },
  });

  const retryJobMutation = useMutation({
    mutationFn: retryIndexingJob,
    onSuccess: (job) => {
      setSelectedJobId(job.id);
      setItemPage(1);
      setUploadMessage(`Đã yêu cầu retry job #${job.id}.`);
      queryClient.invalidateQueries({ queryKey: ["admin-indexing-jobs"] });
    },
    onError: (error) => {
      setUploadMessage(getApiErrorMessage(error, "Không thể retry indexing job"));
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
    const start = (jobPage - 1) * imagesPerPage;
    return localImages.slice(start, start + imagesPerPage);
  }, [jobPage, localImages]);

  const selectedJob = jobs.find((job) => job.id === effectiveSelectedJobId) || null;
  const selectedJobItems = itemsQuery.data?.content || [];

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
      };
    });

    setLocalImages((current) => [...previews, ...current]);
    setJobPage(1);
    setUploadMessage(
      invalidCount > 0
        ? `Đang upload ${validImages.length} ảnh hợp lệ. ${invalidCount} file bị bỏ qua vì không đúng định dạng hoặc vượt 10MB.`
        : `Đang upload ${validImages.length} ảnh và tạo indexing job nền.`
    );
    event.target.value = "";

    if (validImages.length > 0) {
      uploadImagesMutation.mutate(validImages);
    }
  };

  const handleRemoveImage = (imageId) => {
    setLocalImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(image.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter((previewUrl) => previewUrl !== image.previewUrl);
      }

      const nextImages = current.filter((item) => item.id !== imageId);
      const nextTotalPages = Math.max(1, Math.ceil(nextImages.length / imagesPerPage));
      setJobPage((currentPage) => Math.min(currentPage, nextTotalPages));
      return nextImages;
    });
  };

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">Direct Upload Indexing</p>
          <h2 className="mt-1 text-2xl font-semibold text-zinc-900">Upload ảnh và theo dõi indexing job</h2>
          {/* <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Frontend này đã bỏ khái niệm batch. Mỗi lần upload sẽ tạo job nền và ảnh được index ngay sau khi upload thành công.
          </p> */}
        </div>
        <button
          type="button"
          onClick={() => {
            jobsQuery.refetch();
            if (effectiveSelectedJobId) {
              itemsQuery.refetch();
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          <FiRefreshCw className="size-4" />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Job gần đây" value={pagination.totalElements} hint="Tổng số indexing job trong hệ thống" />
        <StatCard label="Job đang chọn" value={selectedJob ? `#${selectedJob.id}` : "--"} hint={selectedJob?.status || "Chưa chọn job"} />
        <StatCard label="Ảnh preview local" value={localImages.length} hint="Bao gồm ảnh đang upload và ảnh vừa trả về từ backend" />
        <StatCard label="Item trong job" value={itemsQuery.data?.totalElements ?? 0} hint="Số image item backend trả về cho job đang chọn" />
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-indigo-50/50 px-6 py-8 text-center transition hover:bg-indigo-50">
            <FiUploadCloud className="size-8 text-indigo-700" />
            <span className="mt-3 text-sm font-semibold text-zinc-900">Upload ảnh trực tiếp để index</span>
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

          {selectedJob && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Job đang theo dõi: #{selectedJob.id}</p>
                <p className="mt-1 text-sm text-gray-600">
                  Trạng thái {selectedJob.status} • {Number(selectedJob.progressPercentage || 0).toFixed(0)}% hoàn tất
                </p>
              </div>
              <button
                type="button"
                onClick={() => retryJobMutation.mutate(selectedJob.id)}
                disabled={retryJobMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <FiRotateCcw className="size-4" />
                {retryJobMutation.isPending ? "Đang retry..." : "Retry job"}
              </button>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Ảnh vừa upload</h3>
              <p className="text-sm text-gray-500">{localImages.length} ảnh trong danh sách preview</p>
            </div>
            <div className="text-sm text-gray-500">20 ảnh / trang</div>
          </div>

          {localImages.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-center">
              <FiImage className="size-8 text-gray-400" />
              <p className="mt-3 text-sm font-medium text-zinc-900">Chưa có ảnh trong preview</p>
              <p className="mt-1 text-sm text-gray-500">Ảnh mới upload sẽ hiển thị ở đây ngay khi request bắt đầu.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visibleImages.map((image) => (
                  <div key={image.id} className="group overflow-hidden rounded-lg border border-zinc-200 bg-white">
                    <div className="relative aspect-square bg-slate-100">
                      <ImageWithFallback
                        src={image.previewUrl}
                        imageId={typeof image.id === "number" ? image.id : undefined}
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
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
                        <span>{formatFileSize(image.size)}</span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-gray-600">
                          {image.status}
                        </span>
                      </div>
                      {image.width && image.height && (
                        <p className="mt-2 text-xs text-gray-500">{image.width} x {image.height}px</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm text-gray-600">
                <button
                  type="button"
                  disabled={jobPage <= 1}
                  onClick={() => setJobPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiChevronLeft className="size-4" />
                  Trước
                </button>
                <span>
                  Trang {jobPage} / {totalImagePages}
                </span>
                <button
                  type="button"
                  disabled={jobPage >= totalImagePages}
                  onClick={() => setJobPage((current) => Math.min(totalImagePages, current + 1))}
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

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <h3 className="text-base font-semibold text-zinc-900">Danh sách indexing job</h3>
          <p className="mt-1 text-sm text-gray-500">Mỗi lần upload ảnh sẽ tạo một job và job này được xử lý nền bởi backend.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="border-b border-zinc-200 px-4 py-3">ID</th>
                <th className="border-b border-zinc-200 px-4 py-3">Trạng thái</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Tổng ảnh</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Đã index</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Thất bại</th>
                <th className="border-b border-zinc-200 px-4 py-3">Tiến độ</th>
                <th className="border-b border-zinc-200 px-4 py-3">Bắt đầu</th>
                <th className="border-b border-zinc-200 px-4 py-3">Kết thúc</th>
              </tr>
            </thead>
            <tbody>
              {jobsQuery.isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={8} className="border-b border-zinc-100 px-4 py-3">
                      <div className="h-8 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))}

              {jobsQuery.isError && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-rose-700">
                    {getApiErrorMessage(jobsQuery.error, "Không tải được danh sách indexing job")}
                  </td>
                </tr>
              )}

              {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-500">
                    Chưa có indexing job nào.
                  </td>
                </tr>
              )}

              {!jobsQuery.isLoading &&
                !jobsQuery.isError &&
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setItemPage(1);
                    }}
                    className={`cursor-pointer transition hover:bg-indigo-50/70 ${selectedJobId === job.id ? "bg-indigo-50/60" : ""}`}
                  >
                    <td className="border-b border-zinc-100 px-4 py-4 font-semibold text-zinc-900">#{job.id}</td>
                    <td className="border-b border-zinc-100 px-4 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{job.totalImages ?? 0}</td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{job.successCount ?? 0}</td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{job.failedCount ?? 0}</td>
                    <td className="border-b border-zinc-100 px-4 py-4">
                      <div className="flex min-w-32 items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-indigo-700"
                            style={{ width: `${Math.min(Number(job.progressPercentage || 0), 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs font-medium text-gray-600">
                          {Number(job.progressPercentage || 0).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-gray-600">{formatDateTime(job.startedAt || job.createdAt)}</td>
                    <td className="border-b border-zinc-100 px-4 py-4 text-gray-600">{formatDateTime(job.finishedAt)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Tổng {pagination.totalElements} job • 10 job / trang
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

      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-900">Chi tiết item của job</h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedJob ? `Đang xem item của job #${selectedJob.id}` : "Chọn một job ở bảng trên để xem chi tiết."}
              </p>
            </div>
            {selectedJob?.errorMessage && (
              <div className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <FiAlertCircle className="size-4" />
                {selectedJob.errorMessage}
              </div>
            )}
          </div>
        </div>

        {!effectiveSelectedJobId ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">Chưa có job nào để hiển thị.</div>
        ) : itemsQuery.isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-12 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        ) : itemsQuery.isError ? (
          <div className="px-5 py-10 text-center text-sm text-rose-700">
            {getApiErrorMessage(itemsQuery.error, "Không tải được danh sách item của job")}
          </div>
        ) : selectedJobItems.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-500">Job này chưa có item nào.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="border-b border-zinc-200 px-4 py-3">Image ID</th>
                    <th className="border-b border-zinc-200 px-4 py-3">Trạng thái</th>
                    <th className="border-b border-zinc-200 px-4 py-3 text-right">Retry</th>
                    <th className="border-b border-zinc-200 px-4 py-3">Xử lý lúc</th>
                    <th className="border-b border-zinc-200 px-4 py-3">Lỗi</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedJobItems.map((item) => (
                    <tr key={item.id}>
                      <td className="border-b border-zinc-100 px-4 py-4 font-medium text-zinc-900">#{item.imageId}</td>
                      <td className="border-b border-zinc-100 px-4 py-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{item.retryCount ?? 0}</td>
                      <td className="border-b border-zinc-100 px-4 py-4 text-gray-600">{formatDateTime(item.processedAt)}</td>
                      <td className="border-b border-zinc-100 px-4 py-4 text-gray-600">{item.errorMessage || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-gray-600">
              <span>
                {itemsQuery.data?.totalElements ?? selectedJobItems.length} item
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={itemPage <= 1}
                  onClick={() => setItemPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FiChevronLeft className="size-4" />
                  Trước
                </button>
                <span>
                  Trang {itemsQuery.data?.page ?? itemPage} / {itemsQuery.data?.totalPages ?? 1}
                </span>
                <button
                  type="button"
                  disabled={!itemsQuery.data?.hasNext}
                  onClick={() => setItemPage((current) => current + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sau
                  <FiChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
