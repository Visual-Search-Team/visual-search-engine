// # Cấu hình Axios instance (gắn JWT token vào header)

import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

// Khởi tạo một bản sao của Axios với cấu hình mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Timeout sau 10s nếu backend không phản hồi
});

const maskHeaders = (headers = {}) => {
  const plainHeaders = typeof headers.toJSON === 'function'
    ? headers.toJSON()
    : { ...headers };

  if (plainHeaders.Authorization) {
    plainHeaders.Authorization = 'Bearer <hidden>';
  }

  return plainHeaders;
};

const formatRequestData = (data) => {
  if (data instanceof FormData) {
    return Array.from(data.entries()).reduce((formattedData, [key, value]) => {
      formattedData[key] = value instanceof File
        ? {
            name: value.name,
            type: value.type,
            size: value.size,
          }
        : value;

      return formattedData;
    }, {});
  }

  return data;
};

const shouldLogRequest = (url = '') => {
  return url.startsWith('/search');
};

// Interceptor: Tự động đính kèm Token trước khi gửi Request
apiClient.interceptors.request.use(
  (config) => {
    const requestUrl = config.url || '';
    const isAuthEndpoint = requestUrl.startsWith('/auth/login') || requestUrl.startsWith('/auth/register');
    const token = localStorage.getItem('accessToken');

    if (token && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (shouldLogRequest(requestUrl)) {
      console.log('[API SEARCH REQUEST]', {
        method: config.method?.toUpperCase(),
        url: `${config.baseURL || ''}${requestUrl}`,
        params: config.params,
        headers: maskHeaders(config.headers),
        data: formatRequestData(config.data),
        hasAccessToken: !!token,
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => {
    if (shouldLogRequest(response.config?.url || '')) {
      console.log('[API SEARCH RESPONSE]', {
        status: response.status,
        method: response.config?.method?.toUpperCase(),
        url: `${response.config?.baseURL || ''}${response.config?.url || ''}`,
        data: response.data,
      });
    }

    return response;
  },
  (error) => {
    const requestUrl = error.config?.url || '';

    if (shouldLogRequest(requestUrl)) {
      console.log('[API SEARCH ERROR]', {
        status: error.response?.status,
        method: error.config?.method?.toUpperCase(),
        url: `${error.config?.baseURL || ''}${requestUrl}`,
        params: error.config?.params,
        headers: maskHeaders(error.config?.headers),
        requestData: formatRequestData(error.config?.data),
        response: error.response?.data,
        message: error.message,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
