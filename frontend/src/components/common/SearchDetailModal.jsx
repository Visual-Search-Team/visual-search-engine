import { useState, useEffect } from "react";
import { 
  FaBookmark, FaFileImage, FaHashtag, FaImage, FaInfoCircle, 
  FaRulerCombined, FaSearch, FaStar, FaTimes, FaChevronDown, FaChevronUp 
} from "react-icons/fa";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatScore } from "../../utils/formatScore";
import { resolveImageUrl } from "../../utils/imageUrl";
import { saveBookmark } from "../../services/bookmarkService";
import { ImageWithFallback } from "./ImageWithFallback";
import { Link } from "react-router-dom";

const DetailRow = ({ icon: Icon, label, value, highlight = false }) => (
  <div className="flex items-center justify-between gap-4 border-b border-zinc-200/70 pb-3">
    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
      <Icon className="h-4 w-4 text-gray-500" />
      {label}
    </div>
    <div
      className={`max-w-[220px] truncate text-right text-sm font-semibold ${
        highlight ? "text-indigo-700" : "text-zinc-900"
      }`}
      title={String(value)}
    >
      {value}
    </div>
  </div>
);

export const SearchDetailModal = ({ isOpen, result, onClose, onSearchSimilar }) => {
  const [showDetails, setShowDetails] = useState(false);

  const queryClient = useQueryClient();
  const saveBookmarkMutation = useMutation({
    mutationFn: saveBookmark,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });
  const { reset: resetSaveBookmark } = saveBookmarkMutation;

  useEffect(() => {
    resetSaveBookmark();
  }, [isOpen, result?.imageId, resetSaveBookmark]);

  if (!isOpen || !result) return null;

  const imageUrl = resolveImageUrl(
    result.imageUrl || result.storagePath || result.thumbnailUrl || result.thumbnailPath,
    result.imageId
  );
  const fileName = result.originalFilename || `Ảnh #${result.imageId}`;
  const dimensions =
    result.width && result.height ? `${result.width} x ${result.height} px` : "Chưa có dữ liệu";
  const ocrText = result.ocrText || result.extractedText || result.textContent;
  const isMockOnly = result.isMock && !result.canBookmark;
  const canSave = !!result.imageId && !isMockOnly && !saveBookmarkMutation.isPending;

  const similarityScore = result.similarityScore ?? result.score ?? 0;

  const handleSaveBookmark = () => {
    if (!result.imageId) return;
    saveBookmarkMutation.mutate(result.imageId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 p-2 sm:px-4 sm:py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-detail-title"
      onMouseDown={onClose}
    >
      <div
        className="relative flex flex-col lg:grid max-h-[95vh] lg:max-h-[92vh] w-full max-w-[1180px] overflow-y-auto lg:overflow-hidden rounded-2xl bg-gray-50 shadow-2xl lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng modal"
          className="absolute cursor-pointer right-3 top-3 z-10 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm transition hover:bg-red-600 hover:text-white sm:right-6 sm:top-6"
        >
          <FaTimes className="h-4 w-4" />
        </button>

        {/* Khung chứa ảnh */}
        <div className="relative flex h-[35vh] min-h-[250px] sm:h-[45vh] lg:h-auto lg:min-h-[720px] items-center justify-center bg-white">
          {imageUrl ? (
            <ImageWithFallback
              src={imageUrl}
              imageId={result.imageId}
              alt={fileName}
              loading="eager"
              className="h-full w-full object-contain lg:max-h-[92vh]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-500">
              Không có ảnh để hiển thị
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-zinc-900/45 to-transparent p-4 sm:p-6">
            <p className="max-w-xl truncate text-sm font-medium text-white" title={fileName}>
              {fileName}
            </p>
          </div>
        </div>

        <aside className="flex flex-col lg:max-h-[92vh] lg:overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-700/10 px-3 py-1 text-xs font-semibold text-indigo-700">
              <FaInfoCircle className="h-3.5 w-3.5" />
              Chi tiết kết quả
            </p>
            
            {/* Header sidebar + Nút Xem thêm */}
            <div className="flex items-center justify-between">
              <h2
                id="search-detail-title"
                className="text-xl sm:text-2xl font-semibold leading-9 text-zinc-900"
              >
                Thông tin hình ảnh
              </h2>
              
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-zinc-200/50 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-200 lg:hidden"
              >
                {showDetails ? "Thu gọn" : "Xem thêm"}
                {showDetails ? <FaChevronUp className="h-3 w-3" /> : <FaChevronDown className="h-3 w-3" />}
              </button>
            </div>
          </div>

          {/* Cụm thông tin chi tiết */}
          <div className={`mt-4 sm:mt-6 space-y-3 sm:space-y-4 rounded-xl bg-white p-4 sm:p-5 shadow-sm transition-all duration-300 ease-in-out ${showDetails ? 'block' : 'hidden lg:block'}`}>
            <DetailRow icon={FaHashtag} label="Mã ảnh" value={`IMG-${result.imageId}`} />
            {similarityScore > 0 && (
              <DetailRow
                icon={FaStar}
                label="Điểm tương đồng"
                value={formatScore(similarityScore)}
                highlight
              />
            )}
            <DetailRow icon={FaRulerCombined} label="Kích thước" value={dimensions} />
            <DetailRow icon={FaSearch} label="Rank" value={result.rankPosition || "N/A"} />
            <DetailRow icon={FaFileImage} label="Định dạng" value={result.mimeType || "N/A"} />
            <DetailRow icon={FaImage} label="Tên file" value={fileName} />
          </div>

          {/* Các nút Action */}
          <div className="mt-6 sm:mt-auto border-t border-zinc-200/70 pt-5">
            {saveBookmarkMutation.isSuccess && (
              <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                Đã lưu ảnh vào Bookmark! {' '}
                <Link
                  to="/bookmarks"
                  className="underline hover:text-emerald-900 transition-colors"
                >
                  Click vào đây để xem ảnh đã lưu
                </Link>
              </p>
            )}
            {saveBookmarkMutation.isError && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                Ảnh đã có trong Bookmark! {' '}
                <Link
                  to="/bookmarks"
                  className="underline hover:text-emerald-900 transition-colors"
                >
                  Click vào đây để xem ảnh đã lưu
                </Link>
              </p>
            )}
            {isMockOnly && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                Đây là ảnh mock chỉ để xem giao diện, không thể lưu vào Bookmark.
              </p>
            )}
            {result.isMock && result.canBookmark && (
              <p className="mb-3 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700">
                Ảnh mock này đang trỏ tới ảnh thật IMG-{result.imageId}, có thể lưu vào Bookmark.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onSearchSimilar?.(result)}
                className="cursor-pointer inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-800"
              >
                <FaSearch className="h-4 w-4" />
                Tìm ảnh tương tự
              </button>

              <button
                type="button"
                onClick={handleSaveBookmark}
                disabled={!canSave}
                className="inline-flex cursor-pointer w-full items-center justify-center gap-2 rounded-xl border-2 border-indigo-700 px-5 py-3 text-sm font-medium text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaBookmark className="h-4 w-4" />
                {isMockOnly ? "Ảnh mock" : saveBookmarkMutation.isPending ? "Đang lưu..." : "Lưu ảnh"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};