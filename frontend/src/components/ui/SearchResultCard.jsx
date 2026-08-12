import { formatScore } from "../../utils/formatScore";
import { resolveImageUrl } from "../../utils/imageUrl";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { FiTrash2 } from "react-icons/fi";

export const SearchResultCard = ({
  result,
  onViewDetails,
  isSelectable = false,
  isSelected = false,
  onToggleSelect,
  showDeleteAction = false,
  onDelete,
}) => {
  const imageUrl = resolveImageUrl(
    result.thumbnailUrl || result.imageUrl || result.thumbnailPath || result.storagePath,
    result.imageId
  );
  // const fileName = result.originalFilename || `Ảnh #${result.imageId}`;
  const similarityScore = result.similarityScore ?? result.score ?? 0;

  const aspectRatioStyle = result.width && result.height
    ? { aspectRatio: `${result.width} / ${result.height}` }
    : {}; 

  return (
    <article
      onClick={() => onViewDetails?.(result)}
      className={`group relative cursor-pointer overflow-hidden rounded-xl bg-gray-100 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md ${
        isSelected ? "ring-2 ring-indigo-500 ring-offset-1" : ""
      }`}
      style={aspectRatioStyle}
    >
      {isSelectable && (
        <label
          className="absolute left-3 top-3 z-20 inline-flex cursor-pointer items-center rounded-md bg-white/90 p-1.5 shadow"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(result.imageId)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </label>
      )}

      {showDeleteAction && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.(result.imageId);
          }}
          className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600/90 text-white shadow transition hover:bg-red-700"
          title={`Xóa ảnh #${result.imageId}`}
          aria-label={`Xóa ảnh #${result.imageId}`}
        >
          <FiTrash2 className="h-4 w-4" />
        </button>
      )}

      {imageUrl ? (
        <ImageWithFallback
          src={imageUrl}
          imageId={result.imageId}
          alt={`Ảnh #${result.imageId}`}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full min-h-[200px] w-full items-center justify-center px-4 text-center text-sm text-gray-500">
          Không có ảnh
        </div>
      )}

      {/* Hiển thị % tương đồng */}
      {similarityScore > 0 && (
        <div className="absolute bottom-3 right-3 rounded-full bg-zinc-900/85 px-3 py-1 text-xs font-semibold text-white shadow-sm opacity-90 transition-opacity group-hover:opacity-100">
          {formatScore(similarityScore)}
        </div>
      )}
    </article>
  );
};
