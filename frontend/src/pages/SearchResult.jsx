import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FaAlignLeft, FaChevronLeft, FaChevronRight, FaFont, FaImage, FaArrowLeft } from "react-icons/fa";
import { SearchDetailModal } from "../components/common/SearchDetailModal";
import { SearchResultCard } from "../components/ui/SearchResultCard";
import { getMockSearchResponse } from "../mocks/searchResultsMock";
import { searchByImage, searchByText } from "../services/searchService";
import { ImageWithFallback } from "../components/common/ImageWithFallback";
import { searchStore } from "../utils/searchStore";
import AOS from 'aos';

const PAGE_SIZE = 20;
const USE_MOCK_SEARCH_RESULTS = import.meta.env.VITE_USE_MOCK_SEARCH_RESULTS === "true";

const getModeLabel = (type, mode) => {
  if (type === "image") return "Tìm bằng ảnh";
  if (mode === "OCR") return "Tìm chữ trong ảnh";
  return "Tìm bằng text";
};

const getDescriptionLabel = (type, mode) => {
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
    pageNumber: data.pageNumber || 0,
    pageSize: data.pageSize || PAGE_SIZE,
    totalElements: data.totalElements || 0,
    totalPages: data.totalPages || 0,
    processingTimeMs: data.processingTimeMs,
  };
};

export const SearchResult = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const searchState = location.state || {};
  const [selectedResult, setSelectedResult] = useState(null);

  const type = searchParams.get("type") || searchState.type || "text";
  const query = searchParams.get("q") || searchState.query || "";
  const mode = (searchParams.get("mode") || searchState.mode || "SEMANTIC").toUpperCase();
  const page = Math.max(Number(searchParams.get("page") || 0), 0);
  const imageFile = searchState.imageFile || searchStore.imageFile;

  const previewImageUrl = useMemo(() => {
    if (imageFile) return URL.createObjectURL(imageFile);
    return null;
  }, [imageFile]);

  const isImageSearch = type === "image";
  const canSearch = isImageSearch ? !!imageFile : !!query.trim();
  const canShowResults = USE_MOCK_SEARCH_RESULTS || canSearch;

  const searchQuery = useQuery({
    queryKey: ["search-results", type, query, mode, page, imageFile?.name],
    queryFn: async () => {
      if (USE_MOCK_SEARCH_RESULTS) {
        return getMockSearchResponse({
          page,
          size: PAGE_SIZE,
          searchType: isImageSearch ? "IMAGE_TO_IMAGE" : mode,
        });
      }

      if (isImageSearch) {
        return searchByImage({ image: imageFile, page, size: PAGE_SIZE });
      }

      return searchByText({ query, mode, page, size: PAGE_SIZE });
    },
    enabled: canShowResults,
    placeholderData: keepPreviousData,
  });

  const searchData = useMemo(
    () => normalizeSearchResponse(searchQuery.data),
    [searchQuery.data]
  );

  useEffect(() => {
    setTimeout(() => {
      AOS.refresh();
    }, 100); 
  }, [searchData.results]);

  const modeLabel = getModeLabel(type, mode);
  const descriptionLabel = getDescriptionLabel(type, mode);
  const descriptionValue = USE_MOCK_SEARCH_RESULTS
    ? "dữ liệu mock"
    : isImageSearch
      ? imageFile?.name || "ảnh đã tải lên"
      : query;
  const currentPage = searchData.pageNumber + 1;
  const totalPages = searchData.totalPages || 1;

  const updatePage = (nextPage) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(nextPage));
    nextParams.set("size", String(PAGE_SIZE));
    navigate(
      {
        pathname: "/search-result",
        search: nextParams.toString(),
      },
      { state: searchState }
    );
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
          className="mt-6 cursor-pointer rounded-xl bg-indigo-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-indigo-800"
        >
          Quay lại tìm kiếm
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-[1280px] space-y-8">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-6">

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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold leading-10 text-zinc-900">
              Kết quả tìm kiếm
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {isImageSearch ? (
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
              {/* <p className="text-base leading-7 text-gray-700">
                {descriptionLabel}:{" "}
                <span className="font-medium text-zinc-900">{descriptionValue}</span>
              </p> */}

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
      </div>

      {searchQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <div
              key={index}
              className="h-72 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {searchData.results.map((result, index) => (
              <div 
                key={`${result.imageId}-${result.rankPosition}`} 
                data-aos="fade-up"
                data-aos-delay={index * 20}
              >
                <SearchResultCard
                  key={`${result.imageId}-${result.rankPosition}`}
                  result={result}
                  onViewDetails={setSelectedResult}
                />
              </div>

            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
            <p className="text-sm text-gray-600">
              Trang <span className="font-semibold text-zinc-900">{currentPage}</span> /{" "}
              <span className="font-semibold text-zinc-900">{totalPages}</span>
              {" "}• {searchData.totalElements} kết quả
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updatePage(page - 1)}
                disabled={page <= 0 || searchQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaChevronLeft className="h-3 w-3" />
                Trước
              </button>
              <button
                type="button"
                onClick={() => updatePage(page + 1)}
                disabled={currentPage >= totalPages || searchQuery.isFetching}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
                <FaChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </>
      )}

      <SearchDetailModal
        isOpen={!!selectedResult}
        result={selectedResult}
        onClose={() => setSelectedResult(null)}
      />
    </section>
  );
};
