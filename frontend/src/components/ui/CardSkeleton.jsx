export const CardSkeleton = () => {
  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Ảnh */}
      <div className="relative aspect-[4/5] bg-gray-200 animate-pulse">
        {/* Badge điểm */}
        <div className="absolute bottom-3 right-3 h-6 w-12 rounded-full bg-gray-300" />
      </div>

      {/* Nội dung */}
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
      </div>
    </article>
  );
};