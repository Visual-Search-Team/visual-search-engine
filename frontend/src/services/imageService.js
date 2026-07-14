import apiClient from "./apiClient";

const UPLOAD_BATCH_SIZE = 50;

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
  const uploadedImages = [];

  for (let startIndex = 0; startIndex < files.length; startIndex += UPLOAD_BATCH_SIZE) {
    const formData = new FormData();
    const chunk = files.slice(startIndex, startIndex + UPLOAD_BATCH_SIZE);

    chunk.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiClient.post(`/images/batches/${batchId}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    });

    uploadedImages.push(...(response.data?.data || response.data || []));
  }

  return uploadedImages;
};
