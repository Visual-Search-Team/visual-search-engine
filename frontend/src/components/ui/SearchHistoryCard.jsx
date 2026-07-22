import { FaAlignLeft, FaClock, FaFont, FaHashtag, FaImage } from "react-icons/fa";
import { resolveImageUrl } from "../../utils/imageUrl";
import { ImageWithFallback } from "../common/ImageWithFallback";

const searchTypeConfig = {
  IMAGE_TO_IMAGE: {
    label: "Tìm bằng hình ảnh",
    Icon: FaImage,
    className: "bg-indigo-700/10 text-indigo-700",
  },
  TEXT_SEMANTIC: {
    label: "Text Semantic",
    Icon: FaAlignLeft,
    className: "bg-emerald-700/10 text-emerald-700",
  },
  TEXT_OCR: {
    label: "Text OCR",
    Icon: FaFont,
    className: "bg-sky-700/10 text-sky-700",
  },
};

const formatDateTime = (value) => {
  if (!value) return "Chưa có thời gian";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getHistoryId = (history) => {
  return history.searchId || history.id;
};

const getHistorySearchType = (history) => {
  return history.searchType || history.search_type || "TEXT_SEMANTIC";
};

const getHistoryImagePath = (history) => {
  return (
    history.thumbnailPath ||
    history.thumbnailUrl ||
    history.thumbnail_path ||
    history.thumbnail_url ||
    history.queryImageUrl ||
    history.queryImagePath ||
    history.query_image_url ||
    history.query_image_path ||
    history.storagePath ||
    history.storage_path ||
    ""
  );
};

export const SearchHistoryCard = ({ history, onClick }) => {
  const searchType = getHistorySearchType(history);
  const config = searchTypeConfig[searchType] || searchTypeConfig.TEXT_SEMANTIC;
  const Icon = config.Icon;
  const isImageSearch = searchType === "IMAGE_TO_IMAGE";
  const historyId = getHistoryId(history);
  const imagePath = getHistoryImagePath(history);
  const imageUrl = resolveImageUrl(imagePath);
  const queryText = history.queryText || history.query_text || history.query || "Không có nội dung tìm kiếm";

  return (
    <article onClick={onClick} className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {isImageSearch && imageUrl ? (
          <ImageWithFallback
            src={imageUrl}
            imageId={history.queryImageId}
            alt={`Lịch sử tìm kiếm #${historyId}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full flex-col justify-between bg-gray-50 p-4">
            <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </span>
            <p className="line-clamp-4 text-base font-semibold leading-6 text-zinc-900" title={queryText}>
              "{queryText}"
            </p>
          </div>
        )}

        {isImageSearch && (
          <span className={`absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${config.className}`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate text-sm font-semibold text-zinc-900">
            {isImageSearch ? `Ảnh tìm kiếm #${historyId}` : queryText}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {formatDateTime(history.createdAt || history.createAt)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <FaHashtag className="h-3 w-3 text-gray-400" />
            {historyId ? `ID ${historyId}` : "Chưa có ID"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FaClock className="h-3 w-3 text-gray-400" />
            {history.processingTimeMs ?? 0}ms
          </span>
        </div>

        {isImageSearch && history.width && history.height && (
          <p className="text-xs text-gray-500">
            {history.width}x{history.height}
            {history.mimeType ? ` • ${history.mimeType}` : ""}
          </p>
        )}

        {/* {isImageSearch && imagePath && (
          <p className="truncate text-xs text-gray-400" title={imagePath}>
            {imagePath}
          </p>
        )} */}
      </div>
    </article>
  );
};
