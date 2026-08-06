import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiChevronLeft, FiChevronRight, FiTrash2, FiArrowLeft, FiX, FiZoomIn, FiZoomOut, FiMaximize, FiEye } from "react-icons/fi";
import { getIndexingJobItems, deleteJobImages } from "../../services/adminIndexingService";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { resolveImageUrl } from "../../utils/imageUrl";
import Swal from "sweetalert2";
import { ImagePreviewModal } from "../../components/common/ImagePreviewModal";


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

const StatusBadge = ({ status }) => (
    <span
        className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[status] || "border-zinc-200 bg-zinc-50 text-zinc-700"
            }`}
    >
        {status || "UNKNOWN"}
    </span>
);

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


export const AdminJobDetail = () => {

    const { jobId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [itemPage, setItemPage] = useState(1);
    const [selectedImages, setSelectedImages] = useState([]);
    const [previewImageId, setPreviewImageId] = useState(null);

    // 1. Fetch danh sách items của Job
    const itemsQuery = useQuery({
        queryKey: ["admin-indexing-job-items", jobId, itemPage],
        queryFn: () => getIndexingJobItems(jobId, { page: itemPage, size: 10 }),
        refetchInterval: (query) => {
            const statuses = query.state.data?.content?.map((item) => item.status) || [];
            return statuses.some((status) => status === "PENDING" || status === "PROCESSING") ? 5000 : false;
        },
    });

    const selectedJobItems = itemsQuery.data?.content || [];

    // 2. Mutation để xóa ảnh
    const deleteMutation = useMutation({
        mutationFn: (imageIds) => deleteJobImages(jobId, imageIds),
        onSuccess: (data, variables) => {
            setSelectedImages([]);
            queryClient.invalidateQueries({ queryKey: ["admin-indexing-job-items", jobId] });
            Swal.fire({
                title: "Thành công!",
                text: `${data?.deletedCount || variables.length} ảnh đã được chuyển vào thùng rác.`,
                icon: "success",
                timer: 2000,
                showConfirmButton: false
            });
        },
        onError: (error) => {
            Swal.fire({
                title: "Thất bại!",
                text: "Có lỗi xảy ra khi xóa ảnh!",
                icon: "error"
            });
            console.error(error);
        }
    });

    // 3. Logic xử lý Checkbox
    const handleSelectAll = (e) => {
        const currentPageImageIds = selectedJobItems.map(item => item.imageId);
        if (e.target.checked) {
            setSelectedImages(prev => {
                const newSelection = new Set([...prev, ...currentPageImageIds]);
                return Array.from(newSelection);
            });
        } else {
            setSelectedImages(prev => prev.filter(id => !currentPageImageIds.includes(id)));
        }
    };

    const handleSelectOne = (imageId) => {
        setSelectedImages(prev =>
            prev.includes(imageId)
                ? prev.filter(id => id !== imageId)
                : [...prev, imageId]
        );
    };

    const handleDelete = () => {
        Swal.fire({
            title: "Xác nhận xóa?",
            text: `Bạn có chắc chắn muốn xoá ${selectedImages.length} ảnh đã chọn?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#6b7280",
            confirmButtonText: "Đồng ý xóa",
            cancelButtonText: "Hủy bỏ"
        }).then((result) => {
            if (result.isConfirmed) {
                deleteMutation.mutate(selectedImages);
            }
        });
    };

    const isAllSelected = selectedJobItems.length > 0 && selectedImages.length === selectedJobItems.length;

    return (
        <>
            <div className="p-6">
                {/* Header & Controls */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/indexing')}
                            className="flex items-center justify-center cursor-pointer rounded-full p-2 hover:bg-slate-100 transition"
                        >
                            <FiArrowLeft className="size-5 text-gray-600" />
                        </button>
                        <h1 className="text-2xl font-bold text-gray-800">Chi tiết Job #{jobId}</h1>
                    </div>

                    <button
                        onClick={handleDelete}
                        disabled={selectedImages.length === 0 || deleteMutation.isPending}
                        className="flex items-center gap-2 cursor-pointer rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 hover:bg-red-700"
                    >
                        <FiTrash2 className="size-4" />
                        {deleteMutation.isPending ? "Đang xóa..." : `Xóa ảnh (${selectedImages.length})`}
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    {itemsQuery.isLoading ? (
                        <div className="space-y-3 p-5">
                            {Array.from({ length: 4 }).map((_, index) => (
                                <div key={index} className="h-12 animate-pulse rounded bg-slate-100" />
                            ))}
                        </div>
                    ) : itemsQuery.isError ? (
                        <div className="px-5 py-10 text-center text-sm text-rose-700">
                            Không tải được chi tiết job.
                        </div>
                    ) : selectedJobItems.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-gray-500">
                            Job này chưa có item nào.
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-[860px] w-full border-separate border-spacing-0 text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            <th className="border-b border-zinc-200 px-4 py-3 w-12 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllSelected}
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </th>
                                            <th className="border-b border-zinc-200 px-4 py-3">Ảnh</th>
                                            <th className="border-b border-zinc-200 px-4 py-3">Image ID</th>
                                            <th className="border-b border-zinc-200 px-4 py-3">Trạng thái</th>
                                            <th className="border-b border-zinc-200 px-4 py-3 text-right">Retry</th>
                                            <th className="border-b border-zinc-200 px-4 py-3">Xử lý lúc</th>
                                            <th className="border-b border-zinc-200 px-4 py-3 text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedJobItems.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="border-b border-zinc-100 px-4 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedImages.includes(item.imageId)}
                                                        onChange={() => handleSelectOne(item.imageId)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="border-b border-zinc-100 px-4 py-4">
                                                    <div className="h-24 w-32 cursor-pointer flex-shrink-0 overflow-hidden rounded-md border border-gray-200"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewImageId(item.imageId);
                                                        }}
                                                    >
                                                        <ImageWithFallback
                                                            src={resolveImageUrl(item.imageUrl, item.imageId)}
                                                            alt={`Image ${item.imageId}`}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="border-b border-zinc-100 px-4 py-4 font-medium text-zinc-900">
                                                    #{item.imageId}
                                                </td>
                                                <td className="border-b border-zinc-100 px-4 py-4">
                                                    <StatusBadge status={item.status} />
                                                </td>
                                                <td className="border-b border-zinc-100 px-4 py-4 text-right text-gray-700">
                                                    {item.retryCount ?? 0}
                                                </td>
                                                <td className="border-b border-zinc-100 px-4 py-4 text-gray-600">
                                                    {formatDateTime(item.processedAt)}
                                                </td>
                                                <td className="border-b border-zinc-100 px-4 py-4 text-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewImageId(item.imageId);
                                                        }}
                                                        className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-indigo-600 shadow-sm transition hover:bg-indigo-50 hover:text-indigo-800"
                                                        title="Xem chi tiết ảnh"
                                                    >
                                                        <FiEye className="size-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Hiển thị Modal preview ảnh nếu có ảnh được chọn */}
                            {previewImageId && (
                                <ImagePreviewModal
                                    imageId={previewImageId}
                                    onClose={() => setPreviewImageId(null)}
                                />
                            )}

                            {/* Phân trang */}
                            <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 text-sm text-gray-600">
                                <span>{itemsQuery.data?.totalElements ?? selectedJobItems.length} item</span>
                                <div className="flex items-center gap-3">
                                    <button
                                        disabled={itemPage <= 1}
                                        onClick={() => {
                                            setItemPage(c => Math.max(1, c - 1));
                                        }}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        <FiChevronLeft className="size-4" /> Trước
                                    </button>
                                    <span>Trang {itemsQuery.data?.page ?? itemPage} / {itemsQuery.data?.totalPages ?? 1}</span>
                                    <button
                                        disabled={!itemsQuery.data?.hasNext}
                                        onClick={() => {
                                            setItemPage(c => c + 1);
                                        }}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 font-medium text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Sau <FiChevronRight className="size-4" />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </>
    )
}