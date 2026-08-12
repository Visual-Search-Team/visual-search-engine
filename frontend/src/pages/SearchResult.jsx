import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FaAlignLeft, FaChevronLeft, FaChevronRight, FaFont, FaImage, FaArrowLeft, FaArrowUp, FaCheckCircle } from "react-icons/fa";
import { FiArrowDown, FiTrash2, FiCheck } from "react-icons/fi";
import { SearchDetailModal } from "../components/common/SearchDetailModal";
import { getMockSearchResponse } from "../mocks/searchResultsMock";
import { searchByImage, searchByText } from "../services/searchService";
import { searchSimilarImages } from "../services/searchSimilarService";
import { deleteImageByAdmin, deleteImagesByAdmin } from "../services/adminImageService";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { searchStore } from "../utils/searchStore";
import { useAuth } from "../contexts/AuthContext";
import AOS from 'aos';
import { lazy, Suspense } from "react";
import { CardSkeleton } from "../components/ui/CardSkeleton";
import { useInView } from "react-intersection-observer";
import { CompactSearchBar } from "../components/common/CompactSearchBar";
import Masonry from 'react-masonry-css';
import Swal from "sweetalert2";

const SearchResultCard = lazy(() =>
  import("../components/ui/SearchResultCard").then(module => ({ default: module.SearchResultCard }))
);


const PAGE_SIZE = 20;
const USE_MOCK_SEARCH_RESULTS = import.meta.env.VITE_USE_MOCK_SEARCH_RESULTS === "true";

const breakpointColumnsObj = {
  default: 4,
  1280: 4,
  1024: 3,
  768: 2,
  640: 2,
  500: 2
};

const getModeLabel = (type, mode) => {
  if (type === "similar") return "Tìm ảnh tương tự";
  if (type === "image") return "Tìm bằng ảnh";
  if (mode === "OCR") return "Tìm chữ trong ảnh";
  return "Tìm bằng text";
};

const getDescriptionLabel = (type, mode) => {
  if (type === "similar") return "Kết quả tương tự cho ảnh";
  if (type === "image") return "Kết quả cho ảnh";
  if (mode === "OCR") return "Kết quả cho chữ";
  return "Kết quả cho mô tả";
};

const normalizeSearchResponse = (response) => {
  const data = response?.data || {};

  return {
    results: (data.results || []).map((result) => ({
      ...result,
      score: result.score ?? result.similarityScore ?? 0,
    })),
    pageNumber: data.page ?? data.pageNumber ?? 0,
    pageSize: data.size ?? data.pageSize ?? PAGE_SIZE,
    totalElements: data.totalElements || 0,
    totalPages: data.totalPages || 0,
    processingTimeMs: data.processingTimeMs,
    queryImageUrl: data.queryImageUrl || null,
  };
};

const getApiErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

export const SearchResult = () => {

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const searchState = location.state || {};
  const [selectedResult, setSelectedResult] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState([]);

  const type = searchParams.get("type") || searchState.type || "text";
  const isImageSearch = type === "image";
  const isSimilarSearch = type === "similar";
  const isTextSearch = type === "text";
  const isAdmin = role === "ADMIN";
  const canAdminBulkDelete = isAdmin && !USE_MOCK_SEARCH_RESULTS && (isImageSearch || isTextSearch || isSimilarSearch);

  const query = searchParams.get("q") || searchState.query || "";
  const imageId = searchParams.get("imageId") || searchState.imageId || null;
  const mode = (searchParams.get("mode") || searchState.mode || "SEMANTIC").toUpperCase();

  const size = Number(searchParams.get("size")) || PAGE_SIZE;

  const imageFile = searchState.imageFile || searchStore.imageFile;

  const canSearch = isImageSearch ? !!imageFile : isSimilarSearch ? !!imageId : !!query.trim();
  const canShowResults = USE_MOCK_SEARCH_RESULTS || canSearch;

  const initialPage = Math.max(Number(searchParams.get("page") || 1), 1);
  const searchQueryKey = ["search-results", type, query, mode, size, imageFile?.name, imageId];

  const searchQuery = useInfiniteQuery({
    queryKey: searchQueryKey,
    initialPageParam: initialPage,
    queryFn: async ({ pageParam = initialPage }) => {

      if (USE_MOCK_SEARCH_RESULTS) {
        return getMockSearchResponse({
          page: pageParam,
          size,
          searchType: isImageSearch ? "IMAGE_TO_IMAGE" : mode,
        });
      }

      if (isSimilarSearch && imageId) {
        return searchSimilarImages(Number(imageId), pageParam, size);
      }

      if (isImageSearch) {
        return searchByImage({ image: imageFile, page: pageParam, size });
      }

      return searchByText({ query, mode, page: pageParam, size });
    },
    getNextPageParam: (lastPageRaw) => {
      const lastPage = normalizeSearchResponse(lastPageRaw);
      const current = lastPage.pageNumber + 1;
      if (current < lastPage.totalPages) {
        return current + 1;
      }
      return undefined;
    },
    enabled: canShowResults,
    placeholderData: keepPreviousData,

    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });


  const searchData = useMemo(() => {
    if (!searchQuery.data) return { results: [], totalElements: 0 };

    const allResults = searchQuery.data.pages.flatMap((pageRaw) => {
      const normalized = normalizeSearchResponse(pageRaw);
      return normalized.results;
    });

    const firstPageInfo = normalizeSearchResponse(searchQuery.data.pages[0]);

    return {
      results: allResults,
      totalElements: firstPageInfo.totalElements,
      queryImageUrl: firstPageInfo.queryImageUrl,
    };
  }, [searchQuery.data]);

  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: '200px',
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: deleteImagesByAdmin,
    onSuccess: async (data, deletedImageIds) => {
      const deletedCount = Number(data?.deletedCount ?? deletedImageIds?.length ?? 0);
      const deletedIdSet = new Set(deletedImageIds || []);

      queryClient.setQueryData(searchQueryKey, (oldData) => {
        if (!oldData?.pages) {
          return oldData;
        }

        return {
          ...oldData,
          pages: oldData.pages.map((page) => {
            if (!page?.data || !Array.isArray(page.data.results)) {
              return page;
            }

            return {
              ...page,
              data: {
                ...page.data,
                results: page.data.results.filter((item) => !deletedIdSet.has(item.imageId)),
                totalElements: Math.max(Number(page.data.totalElements ?? 0) - deletedCount, 0),
              },
            };
          }),
        };
      });

      setSelectedImageIds([]);
      setSelectedResult((prev) => (prev && deletedIdSet.has(prev.imageId) ? null : prev));

      await Swal.fire({
        title: "Xóa thành công",
        text: `Đã chuyển ${deletedCount} ảnh vào thùng rác.`,
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: async (error) => {
      await Swal.fire({
        title: "Xóa thất bại",
        text: getApiErrorMessage(error, "Không thể xóa ảnh đã chọn."),
        icon: "error",
      });
    },
  });

  const deleteSingleMutation = useMutation({
    mutationFn: deleteImageByAdmin,
    onSuccess: async (_data, deletedImageId) => {
      const deletedIdSet = new Set([deletedImageId]);

      queryClient.setQueryData(searchQueryKey, (oldData) => {
        if (!oldData?.pages) {
          return oldData;
        }

        return {
          ...oldData,
          pages: oldData.pages.map((page) => {
            if (!page?.data || !Array.isArray(page.data.results)) {
              return page;
            }

            return {
              ...page,
              data: {
                ...page.data,
                results: page.data.results.filter((item) => !deletedIdSet.has(item.imageId)),
                totalElements: Math.max(Number(page.data.totalElements ?? 0) - 1, 0),
              },
            };
          }),
        };
      });

      setSelectedImageIds((prev) => prev.filter((id) => id !== deletedImageId));
      setSelectedResult((prev) => (prev && prev.imageId === deletedImageId ? null : prev));

      await Swal.fire({
        title: "Xóa thành công",
        text: `Ảnh #${deletedImageId} đã được chuyển vào thùng rác.`,
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
      });
    },
    onError: async (error) => {
      await Swal.fire({
        title: "Xóa thất bại",
        text: getApiErrorMessage(error, "Không thể xóa ảnh."),
        icon: "error",
      });
    },
  });

  useEffect(() => {
    if (inView && searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
      searchQuery.fetchNextPage();
    }
  }, [inView, searchQuery.hasNextPage, searchQuery.isFetchingNextPage, searchQuery.fetchNextPage]);

  useEffect(() => {
    if (!canAdminBulkDelete) {
      setSelectedImageIds([]);
      return;
    }

    const visibleImageIds = new Set(searchData.results.map((item) => item.imageId));
    setSelectedImageIds((prev) => prev.filter((id) => visibleImageIds.has(id)));
  }, [canAdminBulkDelete, searchData.results]);

  const previewImageUrl = useMemo(() => {
    if (isImageSearch && imageFile) return URL.createObjectURL(imageFile);
    if (isSimilarSearch && searchData?.queryImageUrl) {
      return searchData.queryImageUrl;
    }
    return null;
  }, [imageFile, isImageSearch, isSimilarSearch, searchData?.queryImageUrl]);

  useEffect(() => {
    setTimeout(() => {
      AOS.refresh();
    }, 100);
  }, [searchData.results]);

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

  const modeLabel = getModeLabel(type, mode);
  const descriptionLabel = getDescriptionLabel(type, mode);
  const descriptionValue = USE_MOCK_SEARCH_RESULTS
    ? "dữ liệu mock"
    : isSimilarSearch
      ? `ảnh có ID: #${imageId}`
      : isImageSearch
        ? imageFile?.name || "ảnh đã tải lên"
        : query;

  const visibleImageIds = useMemo(
    () => [...new Set(searchData.results.map((item) => item.imageId))],
    [searchData.results]
  );

  const selectedCount = selectedImageIds.length;
  const allVisibleSelected = visibleImageIds.length > 0
    && visibleImageIds.every((id) => selectedImageIds.includes(id));

  const toggleSelectImage = (targetImageId) => {
    if (!canAdminBulkDelete || deleteSelectedMutation.isPending) {
      return;
    }

    setSelectedImageIds((prev) => (
      prev.includes(targetImageId)
        ? prev.filter((id) => id !== targetImageId)
        : [...prev, targetImageId]
    ));
  };

  const toggleSelectAllVisible = () => {
    if (!canAdminBulkDelete || deleteSelectedMutation.isPending || visibleImageIds.length === 0) {
      return;
    }

    setSelectedImageIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleImageIds.includes(id));
      }

      const next = new Set(prev);
      visibleImageIds.forEach((id) => next.add(id));
      return [...next];
    });
  };

  const handleDeleteSelected = async () => {
    if (!canAdminBulkDelete || selectedCount === 0 || deleteSelectedMutation.isPending) {
      return;
    }

    const confirmed = await Swal.fire({
      title: `Xóa ${selectedCount} ảnh đã chọn?`,
      text: "Ảnh sẽ được chuyển vào thùng rác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Đồng ý xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });

    if (confirmed.isConfirmed) {
      deleteSelectedMutation.mutate(selectedImageIds);
    }
  };

  const handleDeleteSingle = async (targetImageId) => {
    if (!canAdminBulkDelete || deleteSingleMutation.isPending || deleteSelectedMutation.isPending) {
      return;
    }

    const confirmed = await Swal.fire({
      title: `Xóa ảnh #${targetImageId}?`,
      text: "Ảnh sẽ được chuyển vào thùng rác.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Đồng ý xóa",
      cancelButtonText: "Hủy",
      confirmButtonColor: "#dc2626",
    });

    if (confirmed.isConfirmed) {
      deleteSingleMutation.mutate(targetImageId);
    }
  };

  const handleSearchSimilar = (result) => {
    if (!result?.imageId) return;

    setSelectedResult(null);

    navigate(`/search-result?type=similar&imageId=${result.imageId}&page=1&size=${size}`);
    window.scrollTo(0, 0);
  };

  if (!canShowResults) {
    return (
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <h1 className="text-3xl font-semibold text-zinc-900">Kết quả tìm kiếm</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-gray-600">
          Chưa có dữ liệu tìm kiếm. Vui lòng quay lại trang chủ để nhập mô tả hoặc chọn ảnh.
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 hidden md:block cursor-pointer rounded-xl bg-indigo-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-800"
        >
          Quay lại tìm kiếm
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8">

      <div className="flex w-full items-center mb-4">

        <CompactSearchBar className="w-full md:flex-1" />
      </div>

      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-semibold leading-10 text-zinc-900">
              Kết quả tìm kiếm
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {isImageSearch || isSimilarSearch ? (
                <div className="flex items-center gap-3">
                  <span className="text-base leading-7 text-gray-700">
                    {descriptionLabel}:
                  </span>

                  <div
                    className="h-30 w-30 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm"
                  >
                    <ImageWithFallback
                      src={previewImageUrl}
                      // src={URL.createObjectURL(imageFile)}
                      imageId={imageFile?.name}
                      alt={imageFile?.name}
                      className="h-full w-full object-cover p-1"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-base leading-7 text-gray-700">
                  {descriptionLabel}:{" "}
                  <span className="font-medium text-zinc-900">
                    {descriptionValue}
                  </span>
                </p>
              )}

              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-700/10 px-3 py-1 text-sm font-medium text-indigo-700">
                {type === "image" ? (
                  <FaImage className="h-3.5 w-3.5" />
                ) : mode === "OCR" ? (
                  <FaFont className="h-3.5 w-3.5" />
                ) : (
                  <FaAlignLeft className="h-3.5 w-3.5" />
                )}
                {modeLabel}
              </span>
            </div>
          </div>

          {searchData.processingTimeMs && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Thời gian xử lý:{" "}
              <span className="font-semibold text-zinc-900">
                {searchData.processingTimeMs}ms
              </span>
            </div>
          )}
        </div>

        {canAdminBulkDelete && searchData.results.length > 0 && (
          <div className={`mb-6 flex flex-col gap-3 rounded-2xl border p-3.5 shadow-sm transition-all sm:flex-row sm:items-center sm:justify-between sm:p-4 ${selectedCount > 0
              ? "border-indigo-200 bg-indigo-50/80"
              : "border-gray-200 bg-white"
            }`}>

            <div className="flex items-center justify-between">
              <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-medium text-gray-700 hover:text-gray-900">
                <div className="relative flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={deleteSelectedMutation.isPending || visibleImageIds.length === 0}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-all checked:border-indigo-500 checked:bg-indigo-500 hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  />
                  <FiCheck className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={3} />
                </div>
                <span className="truncate">
                  Chọn toàn bộ <span className="hidden sm:inline">({searchData.results.length} ảnh)</span>
                </span>
              </label>

              {selectedCount > 0 && (
                <span className="text-sm font-semibold text-indigo-600 sm:hidden">
                  Đã chọn: {selectedCount}
                </span>
              )}
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
              {selectedCount > 0 && (
                <span className="hidden text-sm font-semibold text-indigo-600 sm:inline-block">
                  Đã chọn {selectedCount}
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedImageIds([])}
                disabled={selectedCount === 0 || deleteSelectedMutation.isPending}
                className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50 sm:flex-none sm:px-4 sm:py-2"
              >
                Bỏ chọn
              </button>

              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={selectedCount === 0 || deleteSelectedMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-600 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:flex-none sm:px-4 sm:py-2"
              >
                <FiTrash2 className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {deleteSelectedMutation.isPending
                    ? "Đang xử lý..."
                    : <>
                      <span className="sm:hidden">Xóa</span>
                      <span className="hidden sm:inline">Xóa đã chọn</span>
                    </>
                  }
                </span>
              </button>
            </div>
          </div>
        )}
      </div>


      {searchQuery.isLoading ? (
        <Masonry
          breakpointCols={breakpointColumnsObj}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {Array.from({ length: PAGE_SIZE }).map((_, index) => {
            const heights = ['h-64', 'h-80', 'h-96', 'h-72'];
            const randomHeight = heights[index % heights.length];

            return (
              <div key={index}>
                <CardSkeleton heightClass={randomHeight} />
              </div>
            );
          })}
        </Masonry>
      ) : searchQuery.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          Không thể tải kết quả tìm kiếm. Vui lòng thử lại sau.
        </div>
      ) : searchData.results.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-600">
          Không tìm thấy kết quả phù hợp.
        </div>
      ) : (
        <>
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {searchData.results.map((result, index) => (
              <div
                key={`${result.imageId}-${result.rankPosition}`}
                data-aos="fade-up"
                data-aos-delay={index < 20 ? index * 20 : 0}
              >
                <Suspense fallback={<CardSkeleton />}>
                  <SearchResultCard
                    result={result}
                    onViewDetails={setSelectedResult}
                    isSelectable={canAdminBulkDelete}
                    isSelected={selectedImageIds.includes(result.imageId)}
                    onToggleSelect={toggleSelectImage}
                    showDeleteAction={canAdminBulkDelete}
                    onDelete={handleDeleteSingle}
                  />
                </Suspense>
              </div>
            ))}
          </Masonry>

          {/* Cảm biến cuộn và Loading Indicator cho trang tiếp theo */}

          <div ref={loadMoreRef} className="flex justify-center py-6">
            {searchQuery.isFetchingNextPage ? (
              <div className="flex items-center gap-3 rounded-full bg-white px-4 py-2 shadow">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                <span className="text-sm text-gray-600">
                  Đang tải thêm kết quả...
                </span>
              </div>
            ) : searchQuery.hasNextPage ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FiArrowDown className="animate-bounce" />
                <span>Cuộn xuống để tải thêm</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                <FaCheckCircle />
                <span>
                  Đã hiển thị toàn bộ {searchData.totalElements} kết quả
                </span>
              </div>
            )}
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

      <SearchDetailModal
        isOpen={!!selectedResult}
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
        onSearchSimilar={handleSearchSimilar}
      />
    </section>
  );
};
