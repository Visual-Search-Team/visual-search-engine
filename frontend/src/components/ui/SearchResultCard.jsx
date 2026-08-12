import { formatScore } from "../../utils/formatScore";
import { resolveImageUrl } from "../../utils/imageUrl";
import { ImageWithFallback } from "../common/ImageWithFallback";
import { FiTrash2, FiCheck } from "react-icons/fi";

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
  const similarityScore = result.similarityScore ?? result.score ?? 0;

  const aspectRatioStyle = result.width && result.height
    ? { aspectRatio: `${result.width} / ${result.height}` }
    : {}; 

  const actionVisibilityClasses = isSelected 
    ? "opacity-100" 
    : "opacity-100 md:opacity-0 md:group-hover:opacity-100";

  return (
    <article
      onClick={() => onViewDetails?.(result)}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-zinc-100 transition-all duration-300 ${
        isSelected ? "ring-4 ring-indigo-500 scale-[0.98] shadow-md" : "hover:shadow-xl"
      }`}
      style={aspectRatioStyle}
    >
      <div 
        className={`pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-black/40 transition-opacity duration-300 ${actionVisibilityClasses}`} 
      />

      {isSelectable && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect?.(result.imageId);
          }}
          className={`absolute left-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border-[1.5px] shadow-sm backdrop-blur-sm transition-all duration-200 hover:scale-110 ${
            isSelected
              ? "border-indigo-500 bg-indigo-500 text-white"
              : "border-white/80 bg-black/20 text-transparent hover:border-white hover:bg-black/40"
          } ${actionVisibilityClasses}`}
          aria-label="Chọn ảnh"
        >
          <FiCheck className={`h-4 w-4 transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
        </button>
      )}

      {showDeleteAction && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.(result.imageId);
          }}
          className={`absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white shadow-sm backdrop-blur-md transition-all hover:scale-110 hover:bg-red-500 ${actionVisibilityClasses}`}
          title={`Xóa ảnh #${result.imageId}`}
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
          // Zoom nhẹ ảnh khi hover
          className={`h-full w-full object-cover transition-transform duration-500 ${
            isSelected ? "scale-105" : "group-hover:scale-110"
          }`}
        />
      ) : (
        <div className="flex h-full min-h-[200px] w-full items-center justify-center px-4 text-center text-sm text-gray-500">
          Không có ảnh
        </div>
      )}

      {/* Hiển thị % tương đồng */}
      {similarityScore > 0 && (
        <div 
          className={`absolute bottom-3 right-3 z-20 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-md transition-opacity duration-300 ${actionVisibilityClasses}`}
        >
          {formatScore(similarityScore)}
        </div>
      )}
    </article>
  );
};