import { API_BASE_URL } from "../config/constants";

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);
const MINIO_PUBLIC_URL = import.meta.env.VITE_MINIO_PUBLIC_URL || "http://localhost:9000";
const MINIO_BUCKET = import.meta.env.VITE_MINIO_BUCKET || "images";
const INTERNAL_MINIO_HOSTS = new Set(["minio", "visualsearch-minio"]);

export const getImageApiUrl = (imageId) => {
  if (!imageId) return "";
  return `${API_BASE_URL}/images/${imageId}`;
};

export const resolveStorageUrl = (value) => {
  if (!value || !isAbsoluteUrl(value)) return value || "";

  try {
    const url = new URL(value);

    if (INTERNAL_MINIO_HOSTS.has(url.hostname)) {

      // if (url.searchParams.has("X-Amz-Signature")) {
      //   console.log("Chuyển qua proxy!", `/minio-proxy${url.pathname}${url.search}`);
      //   return `/minio-proxy${url.pathname}${url.search}`;
      // }

      const publicBaseUrl = new URL(MINIO_PUBLIC_URL);
      url.protocol = publicBaseUrl.protocol;
      url.hostname = publicBaseUrl.hostname;
      url.port = publicBaseUrl.port;
    }

    return url.toString();
  } catch {
    return value;
  }
};

const resolveStorageObjectUrl = (value) => {
  const objectName = value.replace(/^\/+/, "");
  if (!objectName) return "";

  return `${MINIO_PUBLIC_URL.replace(/\/+$/, "")}/${MINIO_BUCKET}/${objectName}`;
};

export const resolveImageUrl = (value, imageId) => {
  if (!value) return getImageApiUrl(imageId);

  if (isAbsoluteUrl(value)) {
    return resolveStorageUrl(value);
  }

  if (value.startsWith("data:") || value.startsWith("blob:")) {
    return value;
  }

  if (value.startsWith("/api/")) {
    return value;
  }

  if (value.startsWith("/visual-search/")) {
    return `/api${value}`;
  }

  if (value.startsWith("visual-search/")) {
    return `/api/${value}`;
  }

  if (/\.(jpe?g|png|webp|gif|bmp)$/i.test(value) || value.includes("/")) {
    return resolveStorageObjectUrl(value);
  }

  return getImageApiUrl(imageId);
};
