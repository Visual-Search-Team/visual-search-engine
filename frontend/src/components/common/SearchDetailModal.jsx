import {
  FaFileImage,
  FaHashtag,
  FaImage,
  FaInfoCircle,
  FaRulerCombined,
  FaSearch,
  FaStar,
  FaTimes,
} from "react-icons/fa";
import { formatScore } from "../../utils/formatScore";

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
  if (!isOpen || !result) return null;

  const imageUrl = result.storagePath || result.thumbnailPath;
  const fileName = result.originalFilename || `Ảnh #${result.imageId}`;
  const dimensions =
    result.width && result.height ? `${result.width} x ${result.height} px` : "Chưa có dữ liệu";
  const ocrText = result.ocrText || result.extractedText || result.textContent;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-detail-title"
      onMouseDown={onClose}
    >
      <div
        className="relative grid max-h-[92vh] w-full max-w-[1180px] overflow-hidden rounded-2xl bg-gray-50 shadow-2xl lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng modal"
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-sm transition hover:bg-white hover:text-zinc-900"
        >
          <FaTimes className="h-4 w-4" />
        </button>

        <div className="relative flex min-h-[420px] items-center justify-center bg-white lg:min-h-[720px]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={fileName}
              className="h-full max-h-[92vh] w-full object-contain"
            />
          ) : (
            <div className="flex h-full min-h-[420px] w-full items-center justify-center text-gray-500">
              Không có ảnh để hiển thị
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-zinc-900/45 to-transparent p-6">
            <p className="max-w-xl truncate text-sm font-medium text-white" title={fileName}>
              {fileName}
            </p>
          </div>
        </div>

        <aside className="flex max-h-[92vh] flex-col overflow-y-auto bg-gray-50 p-6 sm:p-8">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-700/10 px-3 py-1 text-xs font-semibold text-indigo-700">
              <FaInfoCircle className="h-3.5 w-3.5" />
              Chi tiết kết quả
            </p>
            <h2
              id="search-detail-title"
              className="text-2xl font-semibold leading-9 text-zinc-900"
            >
              Thông tin hình ảnh
            </h2>
          </div>

          <div className="mt-6 space-y-4 rounded-xl bg-white p-5 shadow-sm">
            <DetailRow icon={FaHashtag} label="Mã ảnh" value={`IMG-${result.imageId}`} />
            <DetailRow
              icon={FaStar}
              label="Điểm tương đồng"
              value={formatScore(result.score || 0)}
              highlight
            />
            <DetailRow icon={FaRulerCombined} label="Kích thước" value={dimensions} />
            <DetailRow icon={FaSearch} label="Rank" value={result.rankPosition || "N/A"} />
            <DetailRow icon={FaFileImage} label="Định dạng" value={result.mimeType || "N/A"} />
            <DetailRow icon={FaImage} label="Tên file" value={fileName} />
          </div>

          <div className="mt-5 rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-900">OCR text</h3>
            <p className="mt-2 rounded-lg bg-gray-50 p-3 text-sm leading-6 text-gray-600">
              {ocrText || "Chưa có dữ liệu OCR cho ảnh này."}
            </p>
          </div>

          <div className="mt-6 border-t border-zinc-200/70 pt-5">
            <button
              type="button"
              onClick={() => onSearchSimilar?.(result)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-800"
            >
              <FaSearch className="h-4 w-4" />
              Tìm ảnh tương tự
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
