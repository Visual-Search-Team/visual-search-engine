import apiClient from "./apiClient";

const unwrapResponse = (response) => response.data?.data ?? response.data;

const normalizePage = (pageData) => {
  const content = Array.isArray(pageData?.content) ? pageData.content : [];

  return {
    ...pageData,
    content,
    page: Number(pageData?.page ?? 0) + 1,
    size: Number(pageData?.size ?? 10),
    totalElements: Number(pageData?.totalElements ?? content.length),
    totalPages: Number(pageData?.totalPages ?? 1),
    hasNext: Boolean(pageData?.hasNext),
    hasPrevious: Boolean(pageData?.hasPrevious),
  };
};

export const getTrashImages = async ({ page = 1, size = 10 } = {}) => {
  const response = await apiClient.get("/admin/trash-images", {
    params: {
      page: Math.max(Number(page) - 1, 0),
      size,
    },
  });

  return normalizePage(unwrapResponse(response));
};

export const restoreTrashImage = async (imageId) => {
  const response = await apiClient.post(`/admin/trash-images/${Number(imageId)}/restore`);
  return unwrapResponse(response);
};

export const restoreSelectedTrashImages = async (imageIds) => {
  const response = await apiClient.post("/admin/trash-images/restore-batch", {
    imageIds,
  });
  return unwrapResponse(response);
};

export const restoreAllTrashImages = async () => {
  const response = await apiClient.post("/admin/trash-images/restore-all");
  return unwrapResponse(response);
};

export const permanentlyDeleteTrashImage = async (imageId) => {
  await apiClient.delete(`/admin/trash-images/${Number(imageId)}/permanent`);
  return { imageId: Number(imageId) };
};

export const permanentlyDeleteSelectedTrashImages = async (imageIds) => {
  const response = await apiClient.post("/admin/trash-images/permanent-delete-batch", {
    imageIds,
  });
  return unwrapResponse(response);
};

export const permanentlyDeleteAllTrashImages = async () => {
  const response = await apiClient.post("/admin/trash-images/permanent-delete-all");
  return unwrapResponse(response);
};

export const getTrashPolicy = async () => {
  const response = await apiClient.get("/admin/trash-images/policy");
  return unwrapResponse(response);
};
