import { API_BASE_URL } from "../config/constants";

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

export const getImageApiUrl = (imageId) => {
  if (!imageId) return "";
  return `${API_BASE_URL}/images/${imageId}`;
};

export const resolveImageUrl = (value, imageId) => {
  if (!value) return getImageApiUrl(imageId);

  if (isAbsoluteUrl(value) || value.startsWith("data:") || value.startsWith("blob:")) {
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

  return getImageApiUrl(imageId);
};
