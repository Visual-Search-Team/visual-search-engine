import { useEffect, useMemo, useState } from "react";
import { getImageBlob } from "../../services/imageService";
import { resolveImageUrl } from "../../utils/imageUrl";

const isBlobUrl = (value) => value?.startsWith("blob:");

export const ImageWithFallback = ({
  src,
  imageId,
  alt,
  className = "",
  loading = "lazy",
  fallbackClassName = "flex h-full w-full items-center justify-center px-4 text-center text-sm text-gray-500",
  fallbackText = "Không tải được ảnh",
  ...props
}) => {
  const resolvedSrc = useMemo(() => resolveImageUrl(src, imageId), [src, imageId]);
  const [blobFallback, setBlobFallback] = useState(null);
  const [failedSrc, setFailedSrc] = useState("");
  const [loadingBlobForSrc, setLoadingBlobForSrc] = useState("");

  const hasFailedCurrentSrc = failedSrc === resolvedSrc;
  const displaySrc = blobFallback?.source === resolvedSrc
    ? blobFallback.url
    : hasFailedCurrentSrc
      ? ""
      : resolvedSrc;

  useEffect(() => {
    const objectUrl = blobFallback?.url;

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [blobFallback]);

  const loadBlobFallback = () => {
    if (!imageId || loadingBlobForSrc === resolvedSrc || isBlobUrl(displaySrc)) {
      setFailedSrc(resolvedSrc);
      return;
    }

    setFailedSrc(resolvedSrc);
    setLoadingBlobForSrc(resolvedSrc);
    getImageBlob(imageId)
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        setBlobFallback((currentFallback) => {
          if (currentFallback?.url) URL.revokeObjectURL(currentFallback.url);
          return {
            url: objectUrl,
            source: resolvedSrc,
          };
        });
      })
      .catch(() => {
        setFailedSrc(resolvedSrc);
      })
      .finally(() => {
        setLoadingBlobForSrc("");
      });
  };

  if (!displaySrc && !imageId) {
    return <div className={fallbackClassName}>{fallbackText}</div>;
  }

  if (!displaySrc && hasFailedCurrentSrc) {
    return <div className={fallbackClassName}>{fallbackText}</div>;
  }

  if (!displaySrc && imageId) {
    return <div className="h-full w-full animate-pulse bg-gray-100" />;
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      loading={loading}
      className={className}
      onError={loadBlobFallback}
      {...props}
    />
  );
};
