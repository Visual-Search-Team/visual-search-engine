import { API_BASE_URL } from "../config/constants";

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);
const MINIO_PUBLIC_URL = import.meta.env.VITE_MINIO_PUBLIC_URL || "http://localhost:9000";
const MINIO_PUBLIC_URLS = (import.meta.env.VITE_MINIO_PUBLIC_URLS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const MINIO_BUCKET = import.meta.env.VITE_MINIO_BUCKET || "images";
const INTERNAL_MINIO_HOSTS = new Set(["minio", "visualsearch-minio"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const isLocalHost = (host) => LOCAL_HOSTS.has((host || "").toLowerCase());

const toValidUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const getCurrentBrowserHost = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.location.hostname || "";
};

const getSelectedMinioBaseUrl = () => {
  const candidateValues = [];

  if (MINIO_PUBLIC_URL) {
    candidateValues.push(MINIO_PUBLIC_URL);
  }

  for (const item of MINIO_PUBLIC_URLS) {
    candidateValues.push(item);
  }

  const uniqueValues = [...new Set(candidateValues)];
  const candidates = uniqueValues.map(toValidUrl).filter(Boolean);

  if (candidates.length === 0) {
    return new URL("http://localhost:9000");
  }

  const currentHost = getCurrentBrowserHost();
  const isCurrentLocal = isLocalHost(currentHost);

  if (isCurrentLocal) {
    const localCandidate = candidates.find((item) => isLocalHost(item.hostname));
    if (localCandidate) {
      return localCandidate;
    }
  }

  if (currentHost) {
    const exactHostCandidate = candidates.find(
      (item) => item.hostname.toLowerCase() === currentHost.toLowerCase()
    );
    if (exactHostCandidate) {
      return exactHostCandidate;
    }
  }

  return candidates[0];
};

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

      const publicBaseUrl = getSelectedMinioBaseUrl();
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

  const publicBaseUrl = getSelectedMinioBaseUrl().toString().replace(/\/+$/, "");
  return `${publicBaseUrl}/${MINIO_BUCKET}/${objectName}`;
};

export const resolveImageUrl = (value, imageId) => {
  if (!value || typeof value !== 'string') return getImageApiUrl(imageId);

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
