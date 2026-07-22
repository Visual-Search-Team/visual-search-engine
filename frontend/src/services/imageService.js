import apiClient from "./apiClient";

const UPLOAD_CHUNK_SIZE = 50;

const unwrapUploadResponse = (response) => response.data?.data || response.data || [];

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

export const uploadImages = async (files) => {
  const uploadedImages = [];

  for (let startIndex = 0; startIndex < files.length; startIndex += UPLOAD_CHUNK_SIZE) {
    const formData = new FormData();
    const chunk = files.slice(startIndex, startIndex + UPLOAD_CHUNK_SIZE);

    chunk.forEach((file) => {
      formData.append("files", file);
    });

    const response = await apiClient.post("/images/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    });

    uploadedImages.push(...unwrapUploadResponse(response));
  }

  return uploadedImages;
};
