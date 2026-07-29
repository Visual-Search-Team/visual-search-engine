import { FaExpandAlt, FaSearch } from "react-icons/fa";
import { formatScore } from "../../utils/formatScore";
import { resolveImageUrl } from "../../utils/imageUrl";
import { ImageWithFallback } from "../common/ImageWithFallback";

export const SearchResultCard = ({ result, onViewDetails }) => {
  const imageUrl = resolveImageUrl(
    result.thumbnailUrl || result.imageUrl || result.thumbnailPath || result.storagePath,
    result.imageId
  );
  const fileName = result.originalFilename || `Ảnh #${result.imageId}`;
  const similarityScore = result.similarityScore ?? result.score ?? 0;

  return (
    <article className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div onClick={() => onViewDetails?.(result)} className="relative cursor-pointer aspect-[4/5] overflow-hidden bg-gray-100">
        {imageUrl ? (
          <ImageWithFallback
            src={imageUrl}
            imageId={result.imageId}
            alt={fileName}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-gray-500">
            Không có ảnh xem trước
          </div>
        )}

        {similarityScore > 0 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-zinc-900/85 px-3 py-1 text-xs font-semibold text-white shadow-sm">
            {formatScore(similarityScore)}
          </div>
        )}

      </div>

      <div className="space-y-1 p-3">
        <h3 className="truncate text-sm font-semibold text-zinc-900" title={fileName}>
          {fileName}
        </h3>
        <p className="text-xs text-gray-500">
          #{result.rankPosition || result.imageId}
          {result.width && result.height ? ` • ${result.width}x${result.height}` : ""}
        </p>
      </div>
    </article>
  );
};
