import apiClient from "./apiClient";

export const getImageBlob = async (imageId) => {
  const response = await apiClient.get(`/images/${imageId}`, {
    responseType: "blob",
  });

  return response.data;
};

export const getImageUrl = async (imageId) => {
  const response = await apiClient.get(`/images/${imageId}/url`);
  return response.data?.url || response.data?.data?.url || "";
};

export const uploadBatchImages = async (batchId, files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await apiClient.post(`/images/batches/${batchId}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 60000,
  });

  return response.data?.data || response.data || [];
};
