import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaImage, FaTrash, FaArrowLeft, FaHome, FaTimes, FaTrashRestore, FaUndo } from "react-icons/fa";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getDeletedBookmarks, restoreBookmark, permanentDeleteBookmark } from "../services/bookmarkService";
import { getImageBlob } from "../services/imageService";
import { resolveStorageUrl } from "../utils/imageUrl";
import AOS from "aos";
import Swal from 'sweetalert2';
import { ImagePreviewModal } from "../components/common/ImagePreviewModal";

const PAGE_SIZE = 20;

const normalizeBookmarkResponse = (response) => {
    const data = response?.data || {};
    return {
        results: data.results || data.masks || [],
        page: data.page ?? data.pageNumber ?? 0,
        pageSize: data.size ?? data.pageSize ?? PAGE_SIZE,
        totalElements: data.totalElements ?? data.totalItems ?? data.results?.length ?? 0,
        totalPages: data.totalPages ?? 0,
    };
};

const isDirectImageUrl = (value) => /^https?:\/\//i.test(value) || value?.startsWith("data:") || value?.startsWith("blob:");
const isInternalMinioUrl = (value) => {
    if (!/^https?:\/\//i.test(value || "")) return false;
    try {
        const url = new URL(value);
        return ["minio", "visualsearch-minio"].includes(url.hostname);
    } catch {
        return false;
    }
};

const BookmarkImage = ({ bookmark, fileName }) => {
    const directUrl = bookmark.thumbnailUrl || bookmark.imageUrl || bookmark.thumbnailPath || bookmark.storagePath;
    const [blobUrl, setBlobUrl] = useState("");
    const [hasError, setHasError] = useState(false);

    const canUseDirectUrl = isDirectImageUrl(directUrl) && !isInternalMinioUrl(directUrl);
    const imageUrl = canUseDirectUrl ? resolveStorageUrl(directUrl) : blobUrl;

    useEffect(() => {
        let isMounted = true;
        let objectUrl = "";

        if (!bookmark.imageId || canUseDirectUrl) {
            return undefined;
        }

        getImageBlob(bookmark.imageId)
            .then((blob) => {
                if (!isMounted) return;
                objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            })
            .catch(() => {
                if (isMounted) setHasError(true);
            });

        return () => {
            isMounted = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [bookmark.imageId, canUseDirectUrl]);

    if (hasError) {
        return (
            <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-gray-500 bg-gray-100">
                Không tải được ảnh
            </div>
        );
    }

    if (!imageUrl) {
        return <div className="h-full w-full animate-pulse bg-gray-200" />;
    }

    return (
        <img
            src={imageUrl}
            alt={fileName}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-50"
            onError={() => setHasError(true)}
        />
    );
};

const SecurePreviewModal = ({ bookmark, onClose }) => {
    const directUrl = bookmark.thumbnailUrl || bookmark.imageUrl || bookmark.thumbnailPath || bookmark.storagePath;
    const [blobUrl, setBlobUrl] = useState("");
    const [hasError, setHasError] = useState(false);

    const canUseDirectUrl = isDirectImageUrl(directUrl) && !isInternalMinioUrl(directUrl);
    const imageUrl = canUseDirectUrl ? resolveStorageUrl(directUrl) : blobUrl;

    useEffect(() => {
        let isMounted = true;
        let objectUrl = "";

        if (!bookmark.imageId || canUseDirectUrl) {
            return undefined;
        }

        getImageBlob(bookmark.imageId)
            .then((blob) => {
                if (!isMounted) return;
                objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            })
            .catch(() => {
                if (isMounted) setHasError(true);
            });

        return () => {
            isMounted = false;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [bookmark.imageId, canUseDirectUrl]);

    if (!imageUrl && !hasError) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm" onMouseDown={onClose}>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            </div>
        );
    }

    if (hasError) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm" onMouseDown={onClose}>
                <div className="rounded-lg bg-white p-6 text-center shadow-xl">
                    <p className="text-red-600 font-medium">Không tải được ảnh độ phân giải cao.</p>
                    <button onClick={onClose} className="mt-4 rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300 transition-colors">Đóng</button>
                </div>
            </div>
        );
    }

    return (
        <ImagePreviewModal
            imageId={bookmark.imageId}
            imageUrl={imageUrl}
            onClose={onClose}
        />
    );
};

export const BookmarkTrash = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const page = Math.max(Number(searchParams.get("page") || 0), 0);
    const navigate = useNavigate();

    const [previewImage, setPreviewImage] = useState(null);

    // Quản lý thông báo 
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = "success") => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Tự động xoá toast sau 2 giây 
        setTimeout(() => {
            removeToast(id);
        }, 2000);
    };

    const removeToast = (id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    };

    // Fetch danh sách ảnh đã xoá
    const trashQuery = useQuery({
        queryKey: ["deletedBookmarks", page],
        queryFn: () => getDeletedBookmarks({ page, pageSize: PAGE_SIZE }),
        placeholderData: keepPreviousData,
    });

    // Khôi phục ảnh
    const restoreMutation = useMutation({
        mutationFn: restoreBookmark,
        onSuccess: (data, restoredImageId) => {
            queryClient.invalidateQueries({ queryKey: ["deletedBookmarks"] });
            queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
            if (data && data.success === false) {
                addToast(`Khôi phục ảnh #${restoredImageId} thất bại!`, "error");
            } else {
                queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
                addToast(`Khôi phục ảnh #${restoredImageId} thành công`, "success");
            }
        },
        onError: (error, restoredImageId) => {
            console.error("Chi tiết lỗi khi khôi phục:", error);
            addToast(`Khôi phục ảnh #${restoredImageId} thất bại!`, "error");
        }
    });

    // Xoá vĩnh viễn ảnh
    const permanentDeleteMutation = useMutation({
        mutationFn: permanentDeleteBookmark,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["deletedBookmarks"] });
        },
    });

    const trashData = normalizeBookmarkResponse(trashQuery.data);
    const currentPage = trashData.page + 1;
    const totalPages = trashData.totalPages || 1;

    useEffect(() => {
        setTimeout(() => {
            AOS.refresh();
        }, 100);
    }, [trashData.results]);

    const updatePage = (nextPage) => {
        setSearchParams({ page: String(Math.max(nextPage, 0)) });
    };

    return (
        <section className="mx-auto w-full max-w-[1280px] space-y-8">

            {/* Hiển thị danh sách các thông báo toast */}
            <div className="fixed right-5 top-[50px] z-50 flex flex-col gap-2">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`flex w-72 transform items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ease-in-out ${toast.type === "success" ? "bg-green-500" : "bg-red-500"
                            }`}
                    >
                        <span>{toast.message}</span>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="rounded-full p-1 transition-colors hover:bg-white/20"
                        >
                            <FaTimes className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-4">
                {/* <div className="flex flex-row gap-4 border-b border-gray-200 pb-6">
                    <button
                        type="button"
                        onClick={() => navigate("/bookmarks")}
                        className="flex w-[200px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-indigo-700 bg-white px-5 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
                    >
                        <FaArrowLeft />
                        <span>Quay lại Bookmark</span>
                    </button>
                </div> */}

                <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600">
                            <FaTrashRestore className="h-3.5 w-3.5" />
                            Thùng rác
                        </p>
                        <h1 className="text-3xl font-semibold leading-10 text-zinc-900">Ảnh đã xóa</h1>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Các ảnh ở đây sẽ bị xóa vĩnh viễn sau 30 ngày kể từ lúc xoá. Bạn có thể khôi phục hoặc xóa ngay lập tức.
                        </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 sm:px-4 py-3 text-sm text-gray-600">
                        Tổng cộng:{" "}
                        <span className="font-semibold text-zinc-900">{trashData.totalElements}</span> ảnh
                    </div>
                </div>
            </div>

            {trashQuery.isLoading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    {Array.from({ length: PAGE_SIZE }).map((_, index) => (
                        <div key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-gray-100" />
                    ))}
                </div>
            ) : trashQuery.isError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Không thể tải danh sách thùng rác. Vui lòng thử lại sau.
                </div>
            ) : trashData.results.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <FaTrashRestore className="h-6 w-6" />
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-zinc-900">Thùng rác trống</h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">
                        Không có ảnh nào trong thùng rác lúc này.
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                        {trashData.results.map((bookmark, index) => {
                            const fileName = bookmark.originalFilename || `Ảnh #${bookmark.imageId}`;
                            const isRestoring = restoreMutation.isPending && restoreMutation.variables === bookmark.imageId;
                            const isDeleting = permanentDeleteMutation.isPending && permanentDeleteMutation.variables === bookmark.imageId;

                            return (
                                <article
                                    data-aos="fade-up"
                                    data-aos-delay={index * 20}
                                    key={bookmark.bookmarkId || bookmark.id || bookmark.imageId}
                                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md flex flex-col"
                                >
                                    {/* Khu vực chứa ảnh */}
                                    <div
                                        className="relative aspect-[4/5] overflow-hidden bg-gray-100 cursor-pointer"
                                        onClick={() => setPreviewImage(bookmark)}
                                    >
                                        <BookmarkImage bookmark={bookmark} fileName={fileName} />

                                        {/* Giao diện laptop */}
                                        <div className="hidden md:flex absolute inset-0 flex-col items-center justify-center gap-3 opacity-0 transition-opacity bg-black/40 group-hover:opacity-100 z-10">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    restoreMutation.mutate(bookmark.imageId);
                                                }}
                                                disabled={isRestoring || isDeleting}
                                                className="flex cursor-pointer items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
                                            >
                                                <FaUndo className="h-3.5 w-3.5" />
                                                Khôi phục
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    Swal.fire({
                                                        title: 'Bạn có chắc chắn?',
                                                        text: "Ảnh này sẽ bị xoá vĩnh viễn và không thể khôi phục!",
                                                        icon: 'warning',
                                                        showCancelButton: true,
                                                        confirmButtonColor: '#dc2626',
                                                        cancelButtonColor: '#6b7280',
                                                        confirmButtonText: 'Xoá vĩnh viễn',
                                                        cancelButtonText: 'Hủy'
                                                    }).then((result) => {
                                                        if (result.isConfirmed) {
                                                            permanentDeleteMutation.mutate(bookmark.imageId);
                                                        }
                                                    });
                                                }}
                                                disabled={isRestoring || isDeleting}
                                                className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                                            >
                                                <FaTrash className="h-3.5 w-3.5" />
                                                Xóa vĩnh viễn
                                            </button>
                                        </div>

                                        {/* Số ngày còn lại */}
                                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-center text-xs font-medium text-white pointer-events-none">
                                            Xóa vĩnh viễn sau {bookmark.remainingDays} ngày
                                        </div>
                                    </div>

                                    {/* Hiển thị mobile */}
                                    <div className="flex md:hidden w-full divide-x divide-gray-200 border-t border-gray-200 bg-gray-50">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                restoreMutation.mutate(bookmark.imageId);
                                            }}
                                            disabled={isRestoring || isDeleting}
                                            className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-green-500  transition hover:bg-green-700 disabled:opacity-50"
                                        >
                                            <FaUndo className="h-4 w-4" />
                                            Khôi phục
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                Swal.fire({
                                                    title: 'Bạn có chắc chắn?',
                                                    text: "Ảnh này sẽ bị xoá vĩnh viễn!",
                                                    icon: 'warning',
                                                    showCancelButton: true,
                                                    confirmButtonColor: '#dc2626',
                                                    cancelButtonColor: '#6b7280',
                                                    confirmButtonText: 'Xoá vĩnh viễn',
                                                    cancelButtonText: 'Hủy'
                                                }).then((result) => {
                                                    if (result.isConfirmed) {
                                                        permanentDeleteMutation.mutate(bookmark.imageId);
                                                    }
                                                });
                                            }}
                                            disabled={isRestoring || isDeleting}
                                            className="flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium text-white bg-red-500 transition hover:bg-red-700 disabled:opacity-50"
                                        >
                                            <FaTrash className="h-4 w-4" />
                                            Xóa
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {/* Phân trang */}
                    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
                        <p className="text-sm text-gray-600">
                            Trang <span className="font-semibold text-zinc-900">{currentPage}</span> /{" "}
                            <span className="font-semibold text-zinc-900">{totalPages}</span>
                            {" "}• {trashData.totalElements} ảnh trong thùng rác
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => updatePage(page - 1)}
                                disabled={page <= 0 || trashQuery.isFetching}
                                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <FaChevronLeft className="h-3 w-3" />
                                Trước
                            </button>
                            <button
                                type="button"
                                onClick={() => updatePage(page + 1)}
                                disabled={currentPage >= totalPages || trashQuery.isFetching}
                                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Sau
                                <FaChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                </>
            )}
            {previewImage && (
                <SecurePreviewModal
                    bookmark={previewImage}
                    onClose={() => setPreviewImage(null)}
                />
            )}
        </section>
    );
};