import apiClient from "./apiClient";

const SEARCH_HISTORY_ENDPOINTS = ["/search-history", "/search/history"];
const legacySearchTypeMap = {
  IMAGE_TO_IMAGE: "image",
  TEXT_SEMANTIC: "semantic",
  TEXT_OCR: "ocr",
};

const getLegacyParams = ({ page, size, searchType }) => ({
  page,
  size,
  ...(searchType
    ? {
        type: legacySearchTypeMap[searchType] || searchType,
      }
    : {}),
});

const getSearchHistoryParams = ({ page, size, searchType }) => ({
  page,
  size,
  ...(searchType ? { searchType } : {}),
});

export const getSearchHistory = async ({ page = 0, size = 20, searchType }) => {
  try {
    const response = await apiClient.get(SEARCH_HISTORY_ENDPOINTS[0], {
      params: getLegacyParams({ page, size, searchType }),
    });

    return response.data;
  } catch (error) {
    const shouldTryFallback = error.response?.status === 404 || error.response?.status === 405;

    if (!shouldTryFallback) {
      throw error;
    }

    const response = await apiClient.get(SEARCH_HISTORY_ENDPOINTS[1], {
      params: getSearchHistoryParams({ page, size, searchType }),
    });

    return response.data;
  }
};

export const deleteAllSearchHistory = async () => {
  try {
    const response = await apiClient.delete(SEARCH_HISTORY_ENDPOINTS[0]);
    return response.data;
  } catch (error) {
    const shouldTryFallback = error.response?.status === 404 || error.response?.status === 405;

    if (!shouldTryFallback) {
      throw error;
    }

    const response = await apiClient.delete(SEARCH_HISTORY_ENDPOINTS[1]);
    return response.data;
  }
};
