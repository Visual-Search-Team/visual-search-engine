import apiClient from "./apiClient";

export const searchByText = async ({ query, mode, page = 1, size = 20 }) => {
  const response = await apiClient.get("/search/text", {
    params: {
      q: query,
      mode,
      page,
      size,
      limit: 100,
    },
  });

  return response.data;
};

export const searchByImage = async ({ image, page = 1, size = 20 }) => {
  const formData = new FormData();
  formData.append("image", image);

  const response = await apiClient.post("/search/image", formData, {
    params: {
      page,
      size,
      limit: 100,
    },
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
