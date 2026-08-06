import apiClient from "./apiClient";

// Lấy danh sách bookmark (hiện tại)
export const getBookmarks = async ({ page = 0, pageSize = 20 }) => {
  const response = await apiClient.get("/bookmarks", {
    params: {
      page,
      pageSize,
    },
  });

  return response.data;
};

// Lưu bookmark
export const saveBookmark = async (imageId) => {
  const response = await apiClient.post(`/bookmarks/${imageId}`);
  return response.data;
};

// Xoá mềm bookmark (chuyển vào thùng rác)
export const deleteBookmark = async (imageId) => {
  const response = await apiClient.delete(`/bookmarks/${imageId}`);
  return response.data;
};

// Lấy danh sách bookmark đã xoá (trong thùng rác)
export const getDeletedBookmarks = async ({ page = 0, pageSize = 20 }) => {
  const response = await apiClient.get("/bookmarks/deleted", {
    params: { page, pageSize },
  });
  return response.data;
};

// Khôi phục bookmark từ thùng rác
export const restoreBookmark = async (imageId) => {
  const response = await apiClient.post(`/bookmarks/${imageId}/restore`);
  return response.data;
};

// Xoá vĩnh viễn bookmark
export const permanentDeleteBookmark = async (imageId) => {
  const response = await apiClient.delete(`/bookmarks/${imageId}/permanent`);
  return response.data;
};