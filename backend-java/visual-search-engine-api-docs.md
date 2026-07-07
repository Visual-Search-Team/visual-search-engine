# Visual Search Engine API Documentation

> Tài liệu API cho các chức năng **Authentication**, **Search**, **Search History** và **Bookmarks**.  
> Postman documentation: https://documenter.getpostman.com/view/38186866/2sBY4HT3dJ

---

## 1. Thông tin chung

### Base URL

```text
http://localhost:8080/visual-search/v1
```

Khi triển khai thực tế, thay địa chỉ trên bằng domain của môi trường tương ứng.

### Content-Type

| Loại request | Content-Type |
|---|---|
| JSON request | `application/json` |
| Upload ảnh | `multipart/form-data` |

### Authorization

Các API được bảo vệ sử dụng access token trong header:

```http
Authorization: Bearer <access_token>
```

Refresh token được lưu trong **HttpOnly Cookie** và trình duyệt tự động gửi kèm khi gọi API refresh hoặc logout.

### Quyền truy cập

| Nhóm API | Yêu cầu đăng nhập |
|---|---|
| Register | Không |
| Login | Không |
| Refresh token | Không cần access token, cần refresh-token cookie |
| Logout | Có |
| Thông tin cá nhân | Có |
| Đổi mật khẩu | Có |
| Search | Có |
| Search History | Có |
| Bookmarks | Có |

---

## 2. Cấu trúc response chuẩn

### 2.1. Response thành công

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2026-07-03T09:30:00+07:00"
}
```

### 2.2. Response lỗi

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi"
  },
  "timestamp": "2026-07-03T09:30:00+07:00"
}
```

### 2.3. Response phân trang

```json
{
  "success": true,
  "data": {
    "results": [],
    "page": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0,
    "first": true,
    "last": true
  },
  "error": null,
  "timestamp": "2026-07-03T09:30:00+07:00"
}
```

### 2.4. HTTP status code

| Status | Ý nghĩa |
|---:|---|
| `200 OK` | Request thành công |
| `201 Created` | Tạo mới dữ liệu thành công |
| `204 No Content` | Xóa thành công và không trả body |
| `400 Bad Request` | Dữ liệu request không hợp lệ |
| `401 Unauthorized` | Chưa đăng nhập hoặc token không hợp lệ |
| `403 Forbidden` | Không đủ quyền truy cập |
| `404 Not Found` | Không tìm thấy tài nguyên |
| `409 Conflict` | Dữ liệu bị trùng hoặc xung đột |
| `413 Payload Too Large` | File upload vượt dung lượng cho phép |
| `415 Unsupported Media Type` | Định dạng file không được hỗ trợ |
| `500 Internal Server Error` | Lỗi hệ thống |

---

# 3. Authentication APIs

## 3.1. Đăng ký tài khoản

```http
POST /auth/register
```

### Authorization

Không yêu cầu.

### Request body

```json
{
  "username": "quannh08",
  "email": "quan@example.com",
  "password": "StrongPassword@123"
}
```

### cURL

```bash
curl --location 'http://localhost:8080/visual-search/v1/auth/register' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "username": "quannh08",
    "email": "quan@example.com",
    "password": "StrongPassword@123"
  }'
```

### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "id": 101,
    "username": "quannh08",
    "email": "quan@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-07-03T09:30:00+07:00"
  },
  "error": null,
  "timestamp": "2026-07-03T09:30:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Username, email hoặc password không hợp lệ |
| 409 | `USERNAME_ALREADY_EXISTS` | Username đã tồn tại |
| 409 | `EMAIL_ALREADY_EXISTS` | Email đã tồn tại |

---

## 3.2. Đăng nhập

```http
POST /auth/login
```

### Authorization

Không yêu cầu.

### Request body

```json
{
  "usernameOrEmail": "quannh08",
  "password": "StrongPassword@123"
}
```

### cURL

```bash
curl --location 'http://localhost:8080/visual-search/v1/auth/login' \
  --header 'Content-Type: application/json' \
  --cookie-jar cookies.txt \
  --data-raw '{
    "usernameOrEmail": "quannh08",
    "password": "StrongPassword@123"
  }'
```

`--cookie-jar cookies.txt` lưu refresh-token cookie được server trả về.

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "<access_token>",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": 101,
      "username": "quannh08",
      "email": "quan@example.com",
      "role": "USER",
      "status": "ACTIVE"
    }
  },
  "error": null,
  "timestamp": "2026-07-03T09:35:00+07:00"
}
```

Server đồng thời trả refresh token qua cookie:

```http
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Lax; Path=/visual-search/v1/auth
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Thiếu thông tin đăng nhập |
| 401 | `AUTH_INVALID_CREDENTIALS` | Sai tài khoản hoặc mật khẩu |
| 403 | `AUTH_ACCOUNT_INACTIVE` | Tài khoản chưa hoạt động |
| 403 | `AUTH_ACCOUNT_BLOCKED` | Tài khoản đã bị khóa |

---

## 3.3. Làm mới access token

```http
POST /auth/refresh-token
```

### Authorization

Không gửi access token. Request phải có refresh-token cookie.

### cURL

```bash
curl --location --request POST \
  'http://localhost:8080/visual-search/v1/auth/refresh-token' \
  --cookie cookies.txt \
  --cookie-jar cookies.txt
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "<new_access_token>",
    "tokenType": "Bearer",
    "expiresIn": 900
  },
  "error": null,
  "timestamp": "2026-07-03T09:50:00+07:00"
}
```

Khi sử dụng refresh-token rotation, server thu hồi token cũ và trả refresh-token cookie mới.

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 401 | `AUTH_REFRESH_TOKEN_INVALID` | Refresh token không hợp lệ |
| 401 | `AUTH_REFRESH_TOKEN_EXPIRED` | Refresh token đã hết hạn |
| 401 | `AUTH_REFRESH_TOKEN_REVOKED` | Refresh token đã bị thu hồi |

---

## 3.4. Đăng xuất

```http
POST /auth/logout
```

### Authorization

Yêu cầu Bearer access token và refresh-token cookie.

### cURL

```bash
curl --location --request POST \
  'http://localhost:8080/visual-search/v1/auth/logout' \
  --header 'Authorization: Bearer <access_token>' \
  --cookie cookies.txt
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "Logout successfully"
  },
  "error": null,
  "timestamp": "2026-07-03T10:00:00+07:00"
}
```

Server thu hồi refresh token và xóa cookie trên trình duyệt.

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Access token không hợp lệ hoặc đã hết hạn |
| 401 | `AUTH_REFRESH_TOKEN_INVALID` | Refresh token không hợp lệ |

---

## 3.5. Lấy thông tin người dùng hiện tại

```http
GET /auth/me
```

### Authorization

Yêu cầu Bearer access token.

### cURL

```bash
curl --location \
  'http://localhost:8080/visual-search/v1/auth/me' \
  --header 'Authorization: Bearer <access_token>'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 101,
    "username": "quannh08",
    "email": "quan@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-07-03T09:30:00+07:00"
  },
  "error": null,
  "timestamp": "2026-07-03T10:05:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Chưa đăng nhập |
| 401 | `AUTH_ACCESS_TOKEN_EXPIRED` | Access token đã hết hạn |
| 404 | `USER_NOT_FOUND` | Không tìm thấy người dùng |

---

## 3.6. Đổi mật khẩu

```http
PUT /auth/password
```

### Authorization

Yêu cầu Bearer access token.

### Request body

```json
{
  "currentPassword": "StrongPassword@123",
  "newPassword": "NewStrongPassword@456",
  "confirmNewPassword": "NewStrongPassword@456"
}
```

### cURL

```bash
curl --location --request PUT \
  'http://localhost:8080/visual-search/v1/auth/password' \
  --header 'Authorization: Bearer <access_token>' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "currentPassword": "StrongPassword@123",
    "newPassword": "NewStrongPassword@456",
    "confirmNewPassword": "NewStrongPassword@456"
  }'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully"
  },
  "error": null,
  "timestamp": "2026-07-03T10:10:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Mật khẩu mới không đúng yêu cầu |
| 400 | `PASSWORD_CONFIRMATION_MISMATCH` | Xác nhận mật khẩu không khớp |
| 401 | `CURRENT_PASSWORD_INCORRECT` | Mật khẩu hiện tại không đúng |
| 401 | `UNAUTHORIZED` | Access token không hợp lệ |

---

# 4. Search APIs

## 4.1. Tìm kiếm bằng ảnh

```http
POST /search/image?page=0&size=20
```

### Authorization

Yêu cầu Bearer access token.

### Content-Type

```http
multipart/form-data
```

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mặc định | Mô tả |
|---|---|---:|---:|---|
| `page` | integer | Không | `0` | Trang cần lấy, bắt đầu từ 0 |
| `size` | integer | Không | `20` | Số kết quả trên mỗi trang |

### Form-data

| Field | Kiểu | Bắt buộc | Mô tả |
|---|---|---:|---|
| `image` | file | Có | Ảnh dùng để tìm kiếm |

Định dạng đề xuất: `image/jpeg`, `image/png`, `image/webp`.

### cURL

```bash
curl --location \
  'http://localhost:8080/visual-search/v1/search/image?page=0&size=20' \
  --header 'Authorization: Bearer <access_token>' \
  --form 'image=@"/path/to/query-image.jpg"'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "searchId": 501,
    "searchType": "IMAGE_TO_IMAGE",
    "queryImageUrl": "/search-queries/501/query-image.jpg",
    "processingTimeMs": 245,
    "results": [
      {
        "imageId": 1001,
        "originalFilename": "shoe-001.jpg",
        "imageUrl": "/images/1001",
        "thumbnailUrl": "/thumbnails/1001.jpg",
        "similarityScore": 0.9423175,
        "rankPosition": 1,
        "width": 1200,
        "height": 800,
        "mimeType": "image/jpeg"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "error": null,
  "timestamp": "2026-07-03T10:20:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 400 | `IMAGE_REQUIRED` | Chưa gửi file ảnh |
| 400 | `INVALID_PAGINATION` | Page hoặc size không hợp lệ |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập |
| 413 | `FILE_TOO_LARGE` | File vượt dung lượng cho phép |
| 415 | `UNSUPPORTED_IMAGE_TYPE` | Định dạng ảnh không hỗ trợ |
| 500 | `AI_SERVICE_ERROR` | Không thể tạo embedding |
| 500 | `VECTOR_SEARCH_ERROR` | Lỗi tìm kiếm trên Qdrant |

---

## 4.2. Tìm kiếm bằng văn bản

```http
GET /search/text?q={query}&mode={semantic|ocr}&page=0&size=20
```

### Authorization

Yêu cầu Bearer access token.

### Query parameters

| Tham số | Kiểu | Bắt buộc | Giá trị | Mô tả |
|---|---|---:|---|---|
| `q` | string | Có | — | Nội dung cần tìm |
| `mode` | string | Có | `semantic`, `ocr` | Chế độ tìm kiếm |
| `page` | integer | Không | Mặc định `0` | Trang cần lấy |
| `size` | integer | Không | Mặc định `20` | Số kết quả trên mỗi trang |

### Chế độ tìm kiếm

| Mode | Search type | Cách hoạt động |
|---|---|---|
| `semantic` | `TEXT_SEMANTIC` | Tạo embedding từ văn bản và tìm vector tương đồng trong Qdrant |
| `ocr` | `TEXT_OCR` | Tìm nội dung văn bản đã được OCR từ ảnh |

### cURL — Semantic search

```bash
curl --location --get \
  'http://localhost:8080/visual-search/v1/search/text' \
  --header 'Authorization: Bearer <access_token>' \
  --data-urlencode 'q=red running shoes' \
  --data-urlencode 'mode=semantic' \
  --data-urlencode 'page=0' \
  --data-urlencode 'size=20'
```

### cURL — OCR search

```bash
curl --location --get \
  'http://localhost:8080/visual-search/v1/search/text' \
  --header 'Authorization: Bearer <access_token>' \
  --data-urlencode 'q=Nike Air Max' \
  --data-urlencode 'mode=ocr' \
  --data-urlencode 'page=0' \
  --data-urlencode 'size=20'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "searchId": 502,
    "searchType": "TEXT_SEMANTIC",
    "queryText": "red running shoes",
    "mode": "semantic",
    "processingTimeMs": 128,
    "results": [
      {
        "imageId": 1002,
        "originalFilename": "red-shoe.jpg",
        "imageUrl": "/images/1002",
        "thumbnailUrl": "/thumbnails/1002.jpg",
        "similarityScore": 0.9138421,
        "rankPosition": 1,
        "width": 1000,
        "height": 1000,
        "mimeType": "image/jpeg"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "error": null,
  "timestamp": "2026-07-03T10:25:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 400 | `QUERY_REQUIRED` | Thiếu tham số `q` |
| 400 | `INVALID_SEARCH_MODE` | Mode không phải `semantic` hoặc `ocr` |
| 400 | `INVALID_PAGINATION` | Page hoặc size không hợp lệ |
| 401 | `UNAUTHORIZED` | Chưa đăng nhập |
| 500 | `AI_SERVICE_ERROR` | Không thể tạo text embedding |
| 500 | `VECTOR_SEARCH_ERROR` | Lỗi tìm kiếm vector |
| 500 | `OCR_SEARCH_ERROR` | Lỗi tìm kiếm OCR |

---

# 5. Search History APIs

Người dùng chỉ được xem và xóa lịch sử tìm kiếm thuộc tài khoản của chính mình.

## 5.1. Lấy danh sách lịch sử tìm kiếm

```http
GET /search-history?page=0&size=20&type=semantic
```

### Authorization

Yêu cầu Bearer access token.

### Query parameters

| Tham số | Kiểu | Bắt buộc | Mặc định |
|---|---|---:|---:|
| `page` | integer | Không | `0` |
| `size` | integer | Không | `20` |
| `type` | string | Không | - |

`type` hỗ trợ: `image`, `semantic`, `ocr`.

### cURL

```bash
curl --location \
  'http://localhost:8080/visual-search/v1/search-history?page=0&size=20&type=semantic' \
  --header 'Authorization: Bearer <access_token>'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": 502,
        "searchType": "TEXT_SEMANTIC",
        "queryText": "red running shoes",
        "queryImageUrl": null,
        "resultCount": 20,
        "processingTimeMs": 128,
        "createdAt": "2026-07-03T10:25:00+07:00"
      },
      {
        "id": 501,
        "searchType": "IMAGE_TO_IMAGE",
        "queryText": null,
        "queryImageUrl": "/search-queries/501/query-image.jpg",
        "resultCount": 20,
        "processingTimeMs": 245,
        "createdAt": "2026-07-03T10:20:00+07:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 2,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "error": null,
  "timestamp": "2026-07-03T10:30:00+07:00"
}
```

---

## 5.2. Lấy chi tiết một lịch sử tìm kiếm

```http
GET /search-history/{historyId}?page=0&size=20
```

### Authorization

Yêu cầu Bearer access token.

### Path parameter

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `historyId` | long | ID lượt tìm kiếm |

### cURL

```bash
curl --location \
  'http://localhost:8080/visual-search/v1/search-history/502?page=0&size=20' \
  --header 'Authorization: Bearer <access_token>'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 502,
    "searchType": "TEXT_SEMANTIC",
    "queryText": "red running shoes",
    "queryImageUrl": null,
    "resultCount": 20,
    "processingTimeMs": 128,
    "createdAt": "2026-07-03T10:25:00+07:00",
    "results": {
      "results": [
        {
          "imageId": 1002,
          "originalFilename": "red-shoe.jpg",
          "imageUrl": "/images/1002",
          "thumbnailUrl": "/thumbnails/1002.jpg",
          "similarityScore": 0.9138421,
          "rankPosition": 1
        }
      ],
      "page": 0,
      "size": 20,
      "totalElements": 20,
      "totalPages": 1,
      "first": true,
      "last": true
    }
  },
  "error": null,
  "timestamp": "2026-07-03T10:32:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Chưa đăng nhập |
| 404 | `SEARCH_HISTORY_NOT_FOUND` | Không tồn tại hoặc không thuộc người dùng hiện tại |

---

## 5.3. Xóa một lịch sử tìm kiếm

```http
DELETE /search-history/{historyId}
```

### Authorization

Yêu cầu Bearer access token.

### cURL

```bash
curl --location --request DELETE \
  'http://localhost:8080/visual-search/v1/search-history/502' \
  --header 'Authorization: Bearer <access_token>'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 502,
    "deleted": true
  },
  "error": null,
  "timestamp": "2026-07-03T10:35:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Chưa đăng nhập |
| 404 | `SEARCH_HISTORY_NOT_FOUND` | Không tồn tại hoặc không thuộc người dùng hiện tại |

---

## 5.4. Xóa toàn bộ lịch sử tìm kiếm

```http
DELETE /search-history
```

### Authorization

Yêu cầu Bearer access token.

### cURL

```bash
curl --location --request DELETE \
  'http://localhost:8080/visual-search/v1/search-history' \
  --header 'Authorization: Bearer <access_token>'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "deletedCount": 12
  },
  "error": null,
  "timestamp": "2026-07-03T10:40:00+07:00"
}
```

Khi xóa `search_history`, backend xóa metadata lịch sử tìm kiếm tương ứng.

---

# 6. Bookmark APIs

Bookmark là danh sách ảnh người dùng đã lưu. Backend lấy `userId` từ access token, frontend không gửi `userId` trong request.

## 6.1. Lấy danh sách ảnh đã lưu

```http
GET /bookmarks?page=0&size=20
```

### Authorization

Yêu cầu Bearer access token.

### cURL

```bash
curl --location \
  'http://localhost:8080/visual-search/v1/bookmarks?page=0&size=20' \
  --header 'Authorization: Bearer <access_token>'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "bookmarkId": 801,
        "imageId": 1002,
        "originalFilename": "red-shoe.jpg",
        "imageUrl": "/images/1002",
        "thumbnailUrl": "/thumbnails/1002.jpg",
        "width": 1000,
        "height": 1000,
        "mimeType": "image/jpeg",
        "bookmarkedAt": "2026-07-03T10:45:00+07:00"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "first": true,
    "last": true
  },
  "error": null,
  "timestamp": "2026-07-03T10:46:00+07:00"
}
```

---

## 6.2. Lưu ảnh vào mục đã lưu

```http
POST /bookmarks/{imageId}
```

### Authorization

Yêu cầu Bearer access token.

### Path parameter

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `imageId` | long | ID ảnh cần lưu |

Request không cần body.

### cURL

```bash
curl --location --request POST \
  'http://localhost:8080/visual-search/v1/bookmarks/1002' \
  --header 'Authorization: Bearer <access_token>'
```

### Response `201 Created`

```json
{
  "success": true,
  "data": {
    "id": 801,
    "imageId": 1002,
    "createdAt": "2026-07-03T10:45:00+07:00"
  },
  "error": null,
  "timestamp": "2026-07-03T10:45:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Chưa đăng nhập |
| 404 | `IMAGE_NOT_FOUND` | Không tìm thấy ảnh |
| 409 | `BOOKMARK_ALREADY_EXISTS` | Ảnh đã có trong mục đã lưu |

---

## 6.3. Xóa ảnh khỏi mục đã lưu

```http
DELETE /bookmarks/{imageId}
```

### Authorization

Yêu cầu Bearer access token.

### cURL

```bash
curl --location --request DELETE \
  'http://localhost:8080/visual-search/v1/bookmarks/1002' \
  --header 'Authorization: Bearer <access_token>'
```

### Response `200 OK`

```json
{
  "success": true,
  "data": {
    "imageId": 1002,
    "deleted": true
  },
  "error": null,
  "timestamp": "2026-07-03T10:50:00+07:00"
}
```

### Lỗi có thể xảy ra

| HTTP | Error code | Ý nghĩa |
|---:|---|---|
| 401 | `UNAUTHORIZED` | Chưa đăng nhập |
| 404 | `BOOKMARK_NOT_FOUND` | Ảnh chưa được lưu hoặc không thuộc người dùng hiện tại |

---

# 7. Danh sách error code

## Authentication

| Error code | Ý nghĩa |
|---|---|
| `VALIDATION_ERROR` | Dữ liệu request không hợp lệ |
| `USERNAME_ALREADY_EXISTS` | Username đã tồn tại |
| `EMAIL_ALREADY_EXISTS` | Email đã tồn tại |
| `AUTH_INVALID_CREDENTIALS` | Sai thông tin đăng nhập |
| `AUTH_ACCESS_TOKEN_EXPIRED` | Access token hết hạn |
| `AUTH_REFRESH_TOKEN_INVALID` | Refresh token không hợp lệ |
| `AUTH_REFRESH_TOKEN_EXPIRED` | Refresh token hết hạn |
| `AUTH_REFRESH_TOKEN_REVOKED` | Refresh token đã bị thu hồi |
| `AUTH_ACCOUNT_INACTIVE` | Tài khoản chưa hoạt động |
| `AUTH_ACCOUNT_BLOCKED` | Tài khoản bị khóa |
| `CURRENT_PASSWORD_INCORRECT` | Mật khẩu hiện tại không đúng |
| `PASSWORD_CONFIRMATION_MISMATCH` | Xác nhận mật khẩu mới không khớp |
| `UNAUTHORIZED` | Chưa xác thực hoặc token không hợp lệ |
| `FORBIDDEN` | Không đủ quyền |

## Search

| Error code | Ý nghĩa |
|---|---|
| `IMAGE_REQUIRED` | Thiếu ảnh query |
| `FILE_TOO_LARGE` | File vượt dung lượng |
| `UNSUPPORTED_IMAGE_TYPE` | Định dạng ảnh không hỗ trợ |
| `QUERY_REQUIRED` | Thiếu nội dung tìm kiếm |
| `INVALID_SEARCH_MODE` | Chế độ search không hợp lệ |
| `INVALID_PAGINATION` | Tham số phân trang không hợp lệ |
| `AI_SERVICE_ERROR` | AI Service xử lý thất bại |
| `VECTOR_SEARCH_ERROR` | Qdrant search thất bại |
| `OCR_SEARCH_ERROR` | OCR search thất bại |

## Search History và Bookmark

| Error code | Ý nghĩa |
|---|---|
| `SEARCH_HISTORY_NOT_FOUND` | Không tìm thấy lịch sử tìm kiếm |
| `IMAGE_NOT_FOUND` | Không tìm thấy ảnh |
| `BOOKMARK_ALREADY_EXISTS` | Bookmark đã tồn tại |
| `BOOKMARK_NOT_FOUND` | Không tìm thấy bookmark |

---

# 8. Lưu ý tích hợp frontend

## Gửi access token

```javascript
fetch("/visual-search/v1/auth/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
```

## Gửi refresh-token cookie

```javascript
fetch("/visual-search/v1/auth/refresh-token", {
  method: "POST",
  credentials: "include"
});
```

Với Axios:

```javascript
axios.post(
  "/visual-search/v1/auth/refresh-token",
  {},
  { withCredentials: true }
);
```

## Upload ảnh

```javascript
const formData = new FormData();
formData.append("image", file);

const response = await fetch(
  "/visual-search/v1/search/image?page=0&size=20",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: formData
  }
);
```

Không tự đặt header `Content-Type` khi gửi `FormData`; trình duyệt sẽ tự tạo multipart boundary.

---

# 9. Tóm tắt endpoint

| Method | Endpoint | Authorization | Chức năng |
|---|---|---|---|
| POST | `/auth/register` | Public | Đăng ký |
| POST | `/auth/login` | Public | Đăng nhập |
| POST | `/auth/refresh-token` | Refresh cookie | Làm mới access token |
| POST | `/auth/logout` | Bearer + cookie | Đăng xuất |
| GET | `/auth/me` | Bearer | Lấy thông tin người dùng |
| PUT | `/auth/password` | Bearer | Đổi mật khẩu |
| POST | `/search/image` | Bearer | Tìm kiếm bằng ảnh |
| GET | `/search/text` | Bearer | Tìm kiếm semantic hoặc OCR |
| GET | `/search-history` | Bearer | Danh sách lịch sử |
| GET | `/search-history/{historyId}` | Bearer | Chi tiết lịch sử |
| DELETE | `/search-history/{historyId}` | Bearer | Xóa một lịch sử |
| DELETE | `/search-history` | Bearer | Xóa toàn bộ lịch sử |
| GET | `/bookmarks` | Bearer | Danh sách ảnh đã lưu |
| POST | `/bookmarks/{imageId}` | Bearer | Lưu ảnh |
| DELETE | `/bookmarks/{imageId}` | Bearer | Bỏ lưu ảnh |
