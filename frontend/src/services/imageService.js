import apiClient from "./apiClient";

export const getImageBlob = async (imageId) => {
  const response = await apiClient.get(`/images/${imageId}`, {
    responseType: "blob",
  });

  return response.data;
};
