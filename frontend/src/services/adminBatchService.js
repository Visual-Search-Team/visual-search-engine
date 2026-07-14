import apiClient from "./apiClient";

const unwrapResponse = (response) => response.data?.data ?? response.data;

const getFirstArray = (...values) => {
  return values.find((value) => Array.isArray(value)) || [];
};

const normalizeBatchPage = (pageData) => {
  const content = getFirstArray(
    pageData?.content,
    pageData?.data,
    pageData?.items,
    pageData?.records,
    pageData?.content?.content,
    pageData?.data?.content
  );

  return {
    ...pageData,
    content,
    page: Number(pageData?.page ?? 0) + 1,
    size: pageData?.size ?? 10,
    totalElements: pageData?.totalElements ?? content.length,
    totalPages: pageData?.totalPages ?? 1,
    hasNext: pageData?.hasNext ?? false,
    hasPrevious: pageData?.hasPrevious ?? false,
  };
};

export const getBatches = async ({ name, status, fromDate, toDate, page = 1, size = 10 } = {}) => {
  const params = {
    page: Math.max(Number(page) - 1, 0),
    size,
  };

  if (name?.trim()) params.name = name.trim();
  if (status) params.status = status;
  if (fromDate) params.fromDate = fromDate;
  if (toDate) params.toDate = toDate;

  const response = await apiClient.get("/admin/batches", { params });
  return normalizeBatchPage(unwrapResponse(response));
};

export const getBatch = async (batchId) => {
  const response = await apiClient.get(`/admin/batches/${batchId}`);
  return unwrapResponse(response);
};

export const createBatch = async (payload) => {
  const response = await apiClient.post("/admin/batches", payload);
  return unwrapResponse(response);
};
