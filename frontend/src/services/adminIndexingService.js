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

export const getAdminStats = async () => {
  const response = await apiClient.get("/admin/stats");
  return unwrapResponse(response);
};

export const triggerIndexingJob = async (imageIds) => {
  const payload = Array.isArray(imageIds) && imageIds.length > 0
    ? { imageIds, startImmediately: true }
    : { startImmediately: true };

  const response = await apiClient.post("/admin/indexing-jobs", payload);
  return unwrapResponse(response);
};

export const getIndexingJobs = async ({ page = 1, size = 10 } = {}) => {
  const response = await apiClient.get("/admin/indexing-jobs", {
    params: {
      page: Math.max(Number(page) - 1, 0),
      size,
    },
  });

  return normalizePage(unwrapResponse(response));
};

export const getIndexingJobItems = async (jobId, { page = 1, size = 10, status } = {}) => {
  const response = await apiClient.get(`/admin/indexing-jobs/${jobId}/items`, {
    params: {
      page: Math.max(Number(page) - 1, 0),
      size,
      ...(status && status !== "ALL" && { status }),
    },
  });

  return normalizePage(unwrapResponse(response));
};

export const retryIndexingJob = async (jobId) => {
  const response = await apiClient.post("/admin/indexing-jobs/retry", {
    jobId: Number(jobId),
  });

  return unwrapResponse(response);
};

export const getIndexingJobStatus = async (jobId) => {
  const response = await apiClient.get(`/admin/indexing-jobs/status/${jobId}`);
  return unwrapResponse(response);
};

// Xóa một danh sách ảnh cụ thể trong một job
export const deleteJobImages = async (jobId, imageIds) => {
  const response = await apiClient.delete(`/admin/indexing-jobs/${jobId}/images`, {
    data: { imageIds }, 
  });
  return unwrapResponse(response);
};

// Xóa hoàn toàn một indexing job
export const deleteIndexingJob = async (jobId) => {
  const response = await apiClient.delete(`/admin/indexing-jobs/${jobId}`);
  return unwrapResponse(response);
};

// Xóa nhiều indexing job cùng lúc
export const deleteMultipleIndexingJobs = async (jobIds) => {
  const response = await apiClient.delete(`/admin/indexing-jobs`, {
    data: { jobIds }, 
  });
  return unwrapResponse(response);
};