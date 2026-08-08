import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";
import { FaBookmark, FaArrowUp, FaImage, FaTrash, FaTrashRestore, FaArrowLeft, FaHome, FaTimes } from "react-icons/fa";
import { useSearchParams, useNavigate } from "react-router-dom";
import { deleteBookmark, getBookmarks } from "../services/bookmarkService";
import { getImageBlob } from "../services/imageService";
import { resolveStorageUrl } from "../utils/imageUrl";
import AOS from "aos";
import { ImagePreviewModal } from "../components/common/ImagePreviewModal";

const PAGE_SIZE = 20;

const normalizeBookmarkResponse = (response) => {
  const data = response?.data || {};

  return {
    results: data.results || data.masks || [],
    page: data.page ?? data.pageNumber ?? 0,
    pageSize: data.pageSize ?? data.size ?? PAGE_SIZE,
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
        if (isMounted) {
          setHasError(true);
        }
      });

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [bookmark.imageId, canUseDirectUrl]);

  if (hasError) {
    return (
      <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-gray-500">
        Không tải được ảnh
      </div>
    );
  }

  if (!imageUrl) {
    return <div className="h-full w-full animate-pulse bg-gray-100" />;
  }

  return (
    <img
      src={imageUrl}
      alt={fileName}
      loading="lazy"
      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      onError={() => {
        setHasError(true);
      }}
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

export const BookMark = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const page = Math.max(Number(searchParams.get("page") || 0), 0);
  const navigate = useNavigate();

  const [previewImage, setPreviewImage] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const { ref, inView } = useInView();

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


  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ["bookmarks"],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getBookmarks({ page: pageParam, pageSize: PAGE_SIZE }),
    getNextPageParam: (lastPage, allPages) => {
      const normalizedLastPage = normalizeBookmarkResponse(lastPage);
      return normalizedLastPage.results?.length === PAGE_SIZE ? allPages.length : undefined;
    },
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allBookmarks = data?.pages.flatMap((page) => {
    const normalizedPage = normalizeBookmarkResponse(page);
    return normalizedPage.results || [];
  }) || [];

  const bookmarkData = normalizeBookmarkResponse(data?.pages?.[0]);

  const deleteMutation = useMutation({
    mutationFn: deleteBookmark,
    onSuccess: (data, deletedImageId) => {
      if (data && data.success === false) {
        addToast(`Xoá ảnh #${deletedImageId} thất bại!`, "error");
      } else {
        queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
        addToast(`Xoá ảnh #${deletedImageId} thành công`, "success");
      }
    },
    onError: (error, deletedImageId) => {
      console.error("Lỗi khi xoá ảnh:", error);
      addToast(`Xoá ảnh #${deletedImageId} thất bại!`, "error");
    },
  });


  useEffect(() => {
    setTimeout(() => {
      AOS.refresh();
    }, 100);
  }, [allBookmarks]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const duration = 500; // Thời gian trượt (ms)
    const start = window.scrollY || document.documentElement.scrollTop;
    const startTime = performance.now();

    const easeOutCubic = (t) => --t * t * t + 1;
    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeOutCubic(progress);

      window.scrollTo(0, start * (1 - easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
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

        <div className="flex flex-row justify-between items-center gap-4 border-b border-gray-200 pb-6">
          <div className="hidden sm:flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex w-[200px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-indigo-700 bg-white px-5 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50"
            >
              <FaArrowLeft />
              <span>Quay lại trang trước</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex w-[200px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-800"
            >
              <FaHome className="h-4 w-4" />
              <span>Quay lại trang chủ</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/bookmarks/trash")}
            className="flex w-[200px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-red-500 bg-white px-5 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            <FaTrashRestore className="h-4 w-4" />
            <span>Thùng rác</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-700/10 px-3 py-1 text-xs font-semibold text-indigo-700">
              <FaBookmark className="h-3.5 w-3.5" />
              Bookmark
            </p>
            <h1 className="text-3xl font-semibold leading-10 text-zinc-900">Ảnh đã lưu</h1>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Xem lại những hình ảnh bạn đã lưu trong quá trình tìm kiếm.
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
            Tổng cộng:{" "}
            <span className="font-semibold text-zinc-900">{bookmarkData.totalElements}</span> ảnh
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Không thể tải danh sách ảnh đã lưu. Vui lòng thử lại sau.
        </div>
      ) : allBookmarks.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-700/10 text-indigo-700">
            <FaImage className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-zinc-900">Chưa có ảnh đã lưu</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-gray-600">
            Khi bạn bấm Lưu ảnh trong phần chi tiết kết quả, ảnh đó sẽ xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {allBookmarks.map((bookmark, index) => {
              const fileName = bookmark.originalFilename || `Ảnh #${bookmark.imageId}`;
              const isDeleting = deleteMutation.isPending && deleteMutation.variables === bookmark.imageId;

              return (
                <article
                  data-aos="fade-up"
                  data-aos-delay={index * 20}
                  key={bookmark.bookmarkId || bookmark.id || bookmark.imageId}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div
                    className="relative aspect-[4/5] overflow-hidden cursor-pointer bg-gray-100"
                    onClick={() => setPreviewImage(bookmark)}
                  >
                    <BookmarkImage bookmark={bookmark} fileName={fileName} />

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(bookmark.imageId);
                      }}
                      disabled={isDeleting || !bookmark.imageId}
                      aria-label="Xóa ảnh khỏi Bookmark"
                      className="absolute right-3 top-3 cursor-pointer flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-600 opacity-100 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <FaTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div ref={ref} className="flex justify-center py-6">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                <span>Đang tải thêm...</span>
              </div>
            ) : !hasNextPage && allBookmarks.length > 0 ? (
              <>
                <p className="text-green-600 text-sm">Bạn đã xem hết {" "}</p>
                <span className="text-sm text-green-600">• {allBookmarks.length} ảnh đã lưu.</span>
              </>
            ) : null}
          </div>

          {/* Nút cuộn lên đầu trang */}
          {showScrollTop && (
            <button
              type="button"
              onClick={scrollToTop}
              className="fixed bottom-20 cursor-pointer right-8 z-[999] h-12 w-12 flex items-center justify-center rounded-full bg-indigo-600 p-2 text-white shadow-md transition hover:bg-indigo-700"
            >
              <FaArrowUp className="h-5 w-5" />
            </button>
          )}
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
