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

// Interceptor: Tự động đính kèm Token trước khi gửi Request
apiClient.interceptors.request.use(
  (config) => {
    const requestUrl = config.url || '';
    const isAuthEndpoint = requestUrl.startsWith('/auth/login') || requestUrl.startsWith('/auth/register');
    const token = localStorage.getItem('accessToken');

    if (token && !isAuthEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
