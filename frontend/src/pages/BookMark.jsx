import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FaBookmark, FaChevronLeft, FaChevronRight, FaImage, FaTrash } from "react-icons/fa";
import { useSearchParams } from "react-router-dom";
import { deleteBookmark, getBookmarks } from "../services/bookmarkService";
import { getImageBlob } from "../services/imageService";

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

const BookmarkImage = ({ bookmark, fileName }) => {
  const directUrl = bookmark.thumbnailUrl || bookmark.imageUrl || bookmark.thumbnailPath || bookmark.storagePath;
  const [blobUrl, setBlobUrl] = useState("");
  const [hasError, setHasError] = useState(false);
  const imageUrl = isDirectImageUrl(directUrl) ? directUrl : blobUrl;

  useEffect(() => {
    let isMounted = true;
    let objectUrl = "";

    if (!bookmark.imageId || isDirectImageUrl(directUrl)) {
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
  }, [bookmark.imageId, directUrl]);

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

export const BookMark = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const page = Math.max(Number(searchParams.get("page") || 0), 0);

  const bookmarkQuery = useQuery({
    queryKey: ["bookmarks", page],
    queryFn: () => getBookmarks({ page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  const bookmarkData = normalizeBookmarkResponse(bookmarkQuery.data);
  const currentPage = bookmarkData.page + 1;
  const totalPages = bookmarkData.totalPages || 1;

  const updatePage = (nextPage) => {
    setSearchParams({ page: String(Math.max(nextPage, 0)) });
  };

  return (
    <section className="mx-auto w-full max-w-[1280px] space-y-8">
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

      {bookmarkQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : bookmarkQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Không thể tải danh sách ảnh đã lưu. Vui lòng thử lại sau.
        </div>
      ) : bookmarkData.results.length === 0 ? (
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {bookmarkData.results.map((bookmark) => {
              const fileName = bookmark.originalFilename || `Ảnh #${bookmark.imageId}`;
              const isDeleting = deleteMutation.isPending && deleteMutation.variables === bookmark.imageId;

              return (
                <article
                  key={bookmark.bookmarkId || bookmark.id || bookmark.imageId}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
                    <BookmarkImage bookmark={bookmark} fileName={fileName} />

                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(bookmark.imageId)}
                      disabled={isDeleting || !bookmark.imageId}
                      aria-label="Xóa ảnh khỏi Bookmark"
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-600 opacity-0 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 group-hover:opacity-100"
                    >
                      <FaTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
            <p className="text-sm text-gray-600">
              Trang <span className="font-semibold text-zinc-900">{currentPage}</span> /{" "}
              <span className="font-semibold text-zinc-900">{totalPages}</span>
              {" "}• {bookmarkData.totalElements} ảnh đã lưu
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updatePage(page - 1)}
                disabled={page <= 0 || bookmarkQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaChevronLeft className="h-3 w-3" />
                Trước
              </button>
              <button
                type="button"
                onClick={() => updatePage(page + 1)}
                disabled={currentPage >= totalPages || bookmarkQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <FaChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};
