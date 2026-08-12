import apiClient from "./apiClient";

const unwrapResponse = (response) => response.data?.data ?? response.data;

export const deleteImageByAdmin = async (imageId) => {
  const response = await apiClient.delete(`/admin/images/${Number(imageId)}`);
  return unwrapResponse(response);
};

export const deleteImagesByAdmin = async (imageIds) => {
  const response = await apiClient.delete("/admin/images", {
    data: { imageIds },
  });
  return unwrapResponse(response);
};
