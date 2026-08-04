import { FaExpandAlt, FaSearch } from "react-icons/fa";
import { formatScore } from "../../utils/formatScore";
import { resolveImageUrl } from "../../utils/imageUrl";
import { ImageWithFallback } from "../common/ImageWithFallback";

export const SearchResultCard = ({ result, onViewDetails }) => {
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
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-gray-100 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
      style={aspectRatioStyle}
    >
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
