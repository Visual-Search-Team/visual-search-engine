import { FaExpandAlt, FaSearch } from "react-icons/fa";
import { formatScore } from "../../utils/formatScore";

export const SearchResultCard = ({ result, onViewDetails }) => {
  const imageUrl = result.thumbnailPath || result.storagePath;
  const fileName = result.originalFilename || `Ảnh #${result.imageId}`;

  return (
    <article className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={fileName}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-gray-500">
            Không có ảnh xem trước
          </div>
        )}

        <div className="absolute bottom-3 right-3 rounded-full bg-zinc-900/85 px-3 py-1 text-xs font-semibold text-white shadow-sm">
          {formatScore(result.score || 0)}
        </div>

        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-indigo-700/0 opacity-0 transition group-hover:bg-indigo-700/35 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onViewDetails?.(result)}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-gray-50"
          >
            <FaExpandAlt className="h-3 w-3" />
            Chi tiết
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-800"
          >
            <FaSearch className="h-3 w-3" />
            Tương tự
          </button>
        </div>
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
