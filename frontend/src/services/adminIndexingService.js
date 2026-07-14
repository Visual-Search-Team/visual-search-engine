import apiClient from "./apiClient";

const unwrapResponse = (response) => response.data?.data ?? response.data;

export const triggerIndexingJob = async (batchId) => {
  const response = await apiClient.post("/admin/indexing-jobs", { batchId: Number(batchId) });
  return unwrapResponse(response);
};

export const getIndexingJobStatus = async (jobId) => {
  const response = await apiClient.get(`/admin/indexing-jobs/status/${jobId}`);
  return unwrapResponse(response);
};
