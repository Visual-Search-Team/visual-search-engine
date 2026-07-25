import apiClient from "./apiClient";

export const searchSimilarImages = async (imageId, page = 1, size = 20) => {
    try {
        const response = await apiClient.post(`/search/image/similar`, {
            imageId,
            page,
            size,
        });
        return response.data;
    } catch (error) {
        console.error("Lỗi search tương tự:", error);
        throw error;
    }
};
