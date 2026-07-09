import apiClient from "./apiClient";

export const getBookmarks = async ({ page = 0, pageSize = 20 }) => {
  const response = await apiClient.get("/bookmarks", {
    params: {
      page,
      pageSize,
    },
  });

  return response.data;
};

export const saveBookmark = async (imageId) => {
  const response = await apiClient.post(`/bookmarks/${imageId}`);
  return response.data;
};

export const deleteBookmark = async (imageId) => {
  const response = await apiClient.delete(`/bookmarks/${imageId}`);
  return response.data;
};
