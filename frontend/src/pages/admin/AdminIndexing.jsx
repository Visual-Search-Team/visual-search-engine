import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FiAlertCircle, FiChevronLeft, FiChevronRight, FiImage, FiRefreshCw, FiRotateCcw, FiTrash2, FiUploadCloud, FiEye
} from "react-icons/fi";
import {
  getIndexingJobItems,
  getIndexingJobs,
  retryIndexingJob,
  deleteMultipleIndexingJobs,
  deleteIndexingJob,
} from "../../services/adminIndexingService";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { uploadImages } from "../../services/imageService";
import { validateFile } from "../../utils/fileValidation";
import Swal from "sweetalert2";
import { SmoothProgressBar } from "../../components/ui/SmoothProgressBar";
import { formatDateTime } from "../../utils/formatDateTime";

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
    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || "border-zinc-200 bg-zinc-50 text-zinc-700"
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

  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [uploadMessage, setUploadMessage] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [jobPage, setJobPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const [localImages, setLocalImages] = useState([]);
  const [page, setPage] = useState(1);
  const previewUrlsRef = useRef([]);
  const [retryingJobId, setRetryingJobId] = useState(null);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  
  const [brandEnabled, setBrandEnabled] = useState(false);
  const [uploadBrand, setUploadBrand] = useState("");


  // Thêm state cho bộ lọc Job
  const [jobStatusFilter, setJobStatusFilter] = useState("ALL");

  const jobsQuery = useQuery({
    queryKey: ["admin-indexing-jobs", page, jobStatusFilter],
    queryFn: () => getIndexingJobs({
      page,
      size: 10,
      status: jobStatusFilter === "ALL" ? undefined : jobStatusFilter
    }),
    refetchInterval: (query) => {
      const jobs = query.state.data?.content || [];
      return jobs.some((job) => job.status === "RUNNING" || job.status === "PENDING") ? 5000 : false;
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: deleteIndexingJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-indexing-jobs"] });
      setSelectedJobIds(prev => prev.filter(id => id !== selectedJobId));
      Swal.fire({
        title: "Đã xóa!",
        text: "Đã xóa job thành công!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
    },
    onError: (error) => {
      Swal.fire({
        title: "Lỗi!",
        text: "Có lỗi xảy ra khi xóa job!",
        icon: "error"
      });
      console.error(error);
    }
  });

  const deleteMultipleJobsMutation = useMutation({
    mutationFn: deleteMultipleIndexingJobs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-indexing-jobs"] });
      setSelectedJobIds([]);
      Swal.fire({
        title: "Thành công!",
        text: "Đã xóa các job được chọn!",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
      });
    },
    onError: (error) => {
      Swal.fire({ title: "Lỗi!", text: "Có lỗi xảy ra khi xóa các job!", icon: "error" });
      console.error(error);
    }
  });

  const jobs = jobsQuery.data?.content || [];

  // Xử lý tick chọn 1 job
  const handleSelectJob = (jobId, isChecked) => {
    if (isChecked) {
      setSelectedJobIds(prev => [...prev, jobId]);
    } else {
      setSelectedJobIds(prev => prev.filter(id => id !== jobId));
    }
  };

  const isAllCurrentPageSelected = jobs.length > 0 && jobs.every(job => selectedJobIds.includes(job.id));

  // Xử lý tick chọn tất cả ở trang hiện tại
  const handleSelectAllCurrentPage = (isChecked) => {
    if (isChecked) {
      const newIds = jobs.map(j => j.id).filter(id => !selectedJobIds.includes(id));
      setSelectedJobIds(prev => [...prev, ...newIds]);
    } else {
      const currentPageIds = jobs.map(j => j.id);
      setSelectedJobIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    }
  };

  const handleConfirmBulkDelete = () => {
    if (selectedJobIds.length === 0) return;
    Swal.fire({
      title: "Cảnh báo nguy hiểm!",
      text: `Bạn có chắc chắn muốn xóa ${selectedJobIds.length} Job đã chọn và toàn bộ ảnh bên trong không? Hành động này không thể hoàn tác.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: `Xóa ${selectedJobIds.length} job`,
      cancelButtonText: "Hủy"
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMultipleJobsMutation.mutate(selectedJobIds);
      }
    });
  };



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
    onSettled: () => {
      setRetryingJobId(null);
    }
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

  useEffect(() => {
    if (
      selectedJob &&
      selectedJob.status === "COMPLETED" &&
      selectedJob.progressPercentage === 100
    ) {
      setUploadMessage(`Index ${selectedJob.totalImages} ảnh hoàn tất!`);
    }
  }, [selectedJob?.status, selectedJob?.progressPercentage, selectedJob?.totalImages]);

  const handleUploadPreview = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const validImages = files.filter(validateFile).map(file => {
      if (brandEnabled && uploadBrand.trim()) {
        const newName = `_BRAND_${uploadBrand.trim()}_BRAND_${file.name}`;
        return new File([file], newName, { type: file.type, lastModified: file.lastModified });
      }
      return file;
    });
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
          <div className="mb-4 rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input 
                type="checkbox" 
                checked={brandEnabled} 
                onChange={e => setBrandEnabled(e.target.checked)} 
                className="size-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" 
              />
              <span className="text-sm font-semibold text-zinc-900">Brand</span>
            </label>
            {brandEnabled && (
              <div className="mt-3">
                <input 
                  type="text" 
                  placeholder="Nhập tên Brand (VD: Owen, Zara...)" 
                  value={uploadBrand} 
                  onChange={e => setUploadBrand(e.target.value)} 
                  className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" 
                />
                <p className="mt-1 text-xs text-gray-500">Mọi ảnh trong lô tải lên lần này sẽ tự động được gán Brand này.</p>
              </div>
            )}
          </div>

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
            <div className="mt-6">
              <SmoothProgressBar
                jobId={selectedJob.id}
                actualProgress={Number(selectedJob.progressPercentage || 0)}
                status={selectedJob.status}
              />

              <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Job đang theo dõi: #{selectedJob.id}</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Trạng thái {selectedJob.status}
                    {/* • {Number(selectedJob.progressPercentage || 0).toFixed(0)}% hoàn tất */}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => retryJobMutation.mutate(selectedJob.id)}
                  disabled={retryJobMutation.isPending}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <FiRotateCcw className="size-4" />
                  {retryJobMutation.isPending ? "Đang retry..." : "Retry job"}
                </button>
              </div>
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
        <div className="flex flex-col gap-4 border-b border-zinc-200 p-4 sm:p-5 md:flex-row md:items-start md:justify-between">

          {/* CỘT TRÁI (Tiêu đề + Lọc + Mobile Checkbox) */}
          <div className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-zinc-900">Danh sách indexing job</h3>

            {/* Khối Lọc trạng thái */}
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm font-medium text-gray-700">Lọc trạng thái:</span>
              <select
                value={jobStatusFilter}
                onChange={(e) => {
                  setJobStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full max-w-[200px] cursor-pointer rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">PENDING</option>
                <option value="RUNNING">RUNNING</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
                <option value="PARTIALLY_FAILED">PARTIALLY_FAILED</option>
              </select>
            </div>

            {/* Checkbox "Chọn tất cả" */}
            <div className="mt-1 flex items-center gap-3 rounded-lg border border-zinc-200 bg-slate-50 p-3 lg:hidden">
              <input
                type="checkbox"
                className="size-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                checked={isAllCurrentPageSelected}
                onChange={(e) => handleSelectAllCurrentPage(e.target.checked)}
                disabled={jobs.length === 0}
              />
              <span className="text-[15px] font-semibold text-gray-700">Chọn tất cả</span>
            </div>
          </div>

          {/* CỘT PHẢI (Nút Xóa) */}
          <button
            onClick={handleConfirmBulkDelete}
            disabled={selectedJobIds.length === 0 || deleteMultipleJobsMutation.isPending}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors md:w-auto md:py-2
            ${selectedJobIds.length > 0 && !deleteMultipleJobsMutation.isPending
                ? "bg-rose-600 text-white shadow-sm hover:bg-rose-700"
                : "cursor-not-allowed bg-gray-100 text-gray-400"
              }
        `}
          >
            {deleteMultipleJobsMutation.isPending ? (
              <FiRotateCcw className="size-4 animate-spin" />
            ) : (
              <FiTrash2 className="size-4" />
            )}
            Xóa {selectedJobIds.length > 0 ? `(${selectedJobIds.length})` : ""}
          </button>
        </div>

        {/* Bảng danh sách indexing job */}

        <div className="w-full lg:overflow-x-auto">
          <table className="w-full text-sm block lg:table lg:min-w-[1040px] lg:border-separate lg:border-spacing-0">

            <thead className="hidden lg:table-header-group">
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="border-b border-zinc-200 px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    checked={isAllCurrentPageSelected}
                    onChange={(e) => handleSelectAllCurrentPage(e.target.checked)}
                    disabled={jobs.length === 0}
                  />
                </th>
                <th className="border-b border-zinc-200 px-4 py-3">ID</th>
                <th className="border-b border-zinc-200 px-4 py-3">Trạng thái</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Tổng ảnh</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Đã index</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-right">Thất bại</th>
                <th className="border-b border-zinc-200 px-4 py-3">Tiến độ</th>
                <th className="border-b border-zinc-200 px-4 py-3">Bắt đầu</th>
                <th className="border-b border-zinc-200 px-4 py-3">Kết thúc</th>
                <th className="border-b border-zinc-200 px-4 py-3 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="block lg:table-row-group">

              {/* TRẠNG THÁI LOADING */}
              {jobsQuery.isLoading &&
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="block mb-4 rounded-xl border border-zinc-200 p-4 lg:mb-0 lg:table-row lg:rounded-none lg:border-0 lg:p-0">
                    <td colSpan={10} className="lg:border-b lg:border-zinc-100 lg:px-4 lg:py-3">
                      <div className="h-8 lg:h-8 h-24 animate-pulse rounded bg-slate-100" />
                    </td>
                  </tr>
                ))}

              {/* TRẠNG THÁI LỖI */}
              {jobsQuery.isError && (
                <tr className="block lg:table-row">
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-rose-700 block lg:table-cell">
                    {getApiErrorMessage(jobsQuery.error, "Không tải được danh sách indexing job")}
                  </td>
                </tr>
              )}

              {/* TRẠNG THÁI TRỐNG */}
              {!jobsQuery.isLoading && !jobsQuery.isError && jobs.length === 0 && (
                <tr className="block lg:table-row">
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-gray-500 block lg:table-cell">
                    Chưa có indexing job nào.
                  </td>
                </tr>
              )}

              {/* HIỂN THỊ DỮ LIỆU */}
              {!jobsQuery.isLoading &&
                !jobsQuery.isError &&
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => {
                      setSelectedJobId(job.id);
                      setItemPage(1);
                    }}
                    className={`cursor-pointer block mb-4 rounded-xl border border-zinc-200 bg-white shadow-sm transition-all lg:mb-0 lg:table-row lg:rounded-none lg:border-0 lg:shadow-none lg:hover:bg-indigo-50/70 ${selectedJobIds.includes(job.id)
                      ? "border-indigo-400 ring-1 ring-indigo-400 lg:bg-indigo-50/60 lg:ring-0 lg:border-0"
                      : "hover:border-indigo-300"
                      }`}
                  >
                    {/* Giao diện Mobile */}
                    <td className="block p-4 lg:hidden">
                      {/* Card Header: Checkbox + ID + Badge */}
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            className="size-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                            checked={selectedJobIds.includes(job.id)}
                            onChange={(e) => {
                              handleSelectJob(job.id, e.target.checked);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="font-semibold text-zinc-900 text-base">#{job.id}</span>
                        </div>
                        <StatusBadge status={job.status} />
                      </div>

                      {/* Card Body: 3 cột số liệu (Tổng, Thành công, Thất bại) */}
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-slate-50 py-2">
                          <p className="text-xs text-gray-500">Tổng ảnh</p>
                          <p className="mt-1 font-semibold text-gray-700">{job.totalImages ?? 0}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 py-2">
                          <p className="text-xs text-emerald-600/80">Đã index</p>
                          <p className="mt-1 font-semibold text-emerald-700">{job.successCount ?? 0}</p>
                        </div>
                        <div className="rounded-lg bg-rose-50 py-2">
                          <p className="text-xs text-rose-600/80">Thất bại</p>
                          <p className="mt-1 font-semibold text-rose-700">{job.failedCount ?? 0}</p>
                        </div>
                      </div>

                      {/* Card Body: Tiến độ */}
                      <div className="mt-4 flex items-center gap-3 border-b border-zinc-100 pb-4">
                        <span className="text-xs font-medium text-gray-500 w-16">Tiến độ</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-indigo-700 transition-all"
                            style={{ width: `${Math.min(Number(job.progressPercentage || 0), 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">
                          {Number(job.progressPercentage || 0).toFixed(0)}%
                        </span>
                      </div>

                      {/* Card Body: Thời gian */}
                      <div className="mt-3 flex flex-col gap-2 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bắt đầu:</span>
                          <span className="font-medium">{formatDateTime(job.startedAt || job.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Kết thúc:</span>
                          <span className="font-medium">{formatDateTime(job.finishedAt) || "-"}</span>
                        </div>
                      </div>

                      {/* Card Footer: Buttons */}
                      <div className="mt-4 flex justify-end gap-3 pt-3 border-t border-zinc-100">
                        {['FAILED', 'PARTIALLY_FAILED', 'UPLOAD_FAILED'].includes(job.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              retryJobMutation.mutate(job.id);
                            }}
                            disabled={retryJobMutation.isPending && retryingJobId === job.id}
                            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white p-2.5 text-amber-600 shadow-sm border border-amber-200 transition hover:bg-amber-50"
                          >
                            <FiRotateCcw className={`size-4 ${retryJobMutation.isPending && retryingJobId === job.id ? "animate-spin" : ""}`} />
                            <span className="font-medium text-sm">Thử lại</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/indexing/${job.id}`);
                          }}
                          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white p-2.5 text-indigo-600 shadow-sm border border-indigo-100 transition hover:bg-indigo-50"
                        >
                          <FiEye className="size-4" />
                          <span className="font-medium text-sm">Chi tiết</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            Swal.fire({
                              title: "Cảnh báo nguy hiểm!",
                              text: `Bạn có chắc chắn muốn xóa toàn bộ Job #${job.id} và các ảnh bên trong không?`,
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#ef4444",
                              cancelButtonColor: "#6b7280",
                              confirmButtonText: "Xóa toàn bộ",
                              cancelButtonText: "Hủy"
                            }).then((result) => {
                              if (result.isConfirmed) {
                                deleteJobMutation.mutate(job.id);
                              }
                            });
                          }}
                          disabled={deleteJobMutation.isPending}
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white p-2.5 text-rose-600 shadow-sm border border-rose-200 transition hover:bg-rose-50"
                        >
                          <FiTrash2 className="size-4" />
                        </button>
                      </div>
                    </td>


                    {/* Giao diện desktop */}
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        checked={selectedJobIds.includes(job.id)}
                        onChange={(e) => handleSelectJob(job.id, e.target.checked)}
                      />
                    </td>
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4 font-semibold text-zinc-900">#{job.id}</td>
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{job.totalImages ?? 0}</td>
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{job.successCount ?? 0}</td>
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4 text-right text-gray-700">{job.failedCount ?? 0}</td>
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4">
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
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4 text-gray-600">{formatDateTime(job.startedAt || job.createdAt)}</td>
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4 text-gray-600">{formatDateTime(job.finishedAt)}</td>
                    <td className="hidden lg:table-cell border-b border-zinc-100 px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">

                        {['FAILED', 'PARTIALLY_FAILED', 'UPLOAD_FAILED'].includes(job.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              retryJobMutation.mutate(job.id);
                            }}
                            disabled={retryJobMutation.isPending && retryingJobId === job.id}
                            className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white p-2 text-amber-600 shadow-sm border border-amber-200 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Thử lại (Retry) các ảnh bị lỗi"
                          >
                            <FiRotateCcw className={`size-4 ${retryJobMutation.isPending && retryingJobId === job.id ? "animate-spin" : ""}`} />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/indexing/${job.id}`);
                          }}
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white p-2 text-indigo-600 shadow-sm border border-indigo-100 transition hover:bg-indigo-50 hover:text-indigo-700"
                          title="Xem chi tiết"
                        >
                          <FiEye className="size-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            Swal.fire({
                              title: "Cảnh báo nguy hiểm!",
                              text: `Bạn có chắc chắn muốn xóa toàn bộ Job #${job.id} và các ảnh bên trong không?`,
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#ef4444",
                              cancelButtonColor: "#6b7280",
                              confirmButtonText: "Xóa toàn bộ",
                              cancelButtonText: "Hủy"
                            }).then((result) => {
                              if (result.isConfirmed) {
                                deleteJobMutation.mutate(job.id);
                              }
                            });
                          }}
                          disabled={deleteJobMutation.isPending}
                          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white p-2 text-rose-600 shadow-sm border border-rose-200 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Xóa Job"
                        >
                          <FiTrash2 className="size-4" />
                        </button>

                      </div>
                    </td>
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
              disabled={!pagination.hasNext && page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
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
