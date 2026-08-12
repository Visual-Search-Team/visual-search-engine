# Báo cáo phân tích Frontend - Visual Search Engine

> Phạm vi phân tích: chỉ các file trong `frontend/`.  
> Không phân tích backend, database, Docker, Qdrant, MinIO server hay các thư mục ngoài frontend. Các nhận định dưới đây chỉ dựa trên code, cấu hình, dependency và cấu trúc frontend quan sát được.

---

## 1. Tổng quan Frontend

Frontend là một SPA xây dựng bằng React + Vite cho dự án Visual Search Engine. Giao diện cho phép người dùng đăng ký, đăng nhập, tìm kiếm ảnh bằng ảnh upload hoặc bằng mô tả text, xem kết quả dạng lưới ảnh, xem chi tiết ảnh, lưu bookmark, xem lịch sử tìm kiếm và quản lý bookmark đã xoá.

Với tài khoản `ADMIN`, frontend mở thêm khu vực quản trị gồm dashboard thống kê, upload nhiều ảnh để tạo indexing job, theo dõi tiến độ indexing, xem chi tiết item trong job, xoá ảnh/job, quản lý thùng rác ảnh hệ thống và xem danh sách người dùng.

Kiến trúc tổng thể:

```text
main.jsx
  ↓
QueryClientProvider + BrowserRouter + AuthProvider
  ↓
AppRoutes
  ↓
Layout theo nhóm route
  ↓
Page
  ↓
Component
  ↓
TanStack Query / AuthContext / local state
  ↓
services/* dùng apiClient Axios
  ↓
REST API qua base URL /api/visual-search/v1
```

Frontend giao tiếp backend thông qua `src/services/apiClient.js`. `apiClient` cấu hình `baseURL`, timeout, `withCredentials`, header JSON mặc định và interceptor tự gắn JWT từ `localStorage.accessToken` cho các request không phải login/register. Các service như `searchService`, `imageService`, `bookmarkService`, `adminIndexingService` gọi các endpoint REST cụ thể.

Chức năng chính xác nhận từ code:

- Public: `/`, `/login`, `/register`.
- User đã đăng nhập: tìm kiếm, xem kết quả, xem lịch sử, bookmark, bookmark trash.
- Admin: dashboard, indexing jobs, job detail, admin trash, users.
- Search: text semantic, image-to-image, similar image; OCR có dấu vết trong config/history nhưng tab OCR đang bị comment ở UI chính.
- Image UX: preview, crop trước khi search, lazy loading, fallback sang blob API, modal xem ảnh có zoom.
- Performance: TanStack Query cache, infinite scroll, lazy import `SearchResultCard`, Masonry layout, skeleton loading, upload batch 50 file/lần.

---

## 2. Tech Stack

| Công nghệ | Vai trò | Đã sử dụng ở đâu | Ý nghĩa |
| --------- | ------- | ---------------- | ------- |
| React 19 | Framework UI | `src/main.jsx`, toàn bộ `src/pages`, `src/components` | Xây SPA bằng component, hooks, state và props. |
| Vite 8 | Build/dev server | `package.json`, `vite.config.js`, `index.html` | Dev server nhanh, build frontend, proxy `/api` tới backend local. |
| JavaScript/JSX | Ngôn ngữ source | Toàn bộ `src/**/*.jsx`, `src/**/*.js` | Project chưa dùng TypeScript. |
| Tailwind CSS 4 | Styling utility-first | `src/index.css`, className trong toàn bộ component | Responsive, spacing, grid/flex, state hover/focus/disabled. |
| `@tailwindcss/vite` | Tích hợp Tailwind với Vite | `vite.config.js` | Tailwind v4 chạy qua plugin Vite. |
| React Router DOM 7 | Routing SPA | `src/routes/AppRoutes.jsx`, route guards, layouts, pages | Điều hướng, route protected/admin, query params bằng `useSearchParams`. |
| TanStack React Query 5 | Server state | `main.jsx`, search/bookmark/history/admin pages | Cache, loading/error state, mutation, invalidation, pagination/infinite query, polling. |
| React Query Devtools | Debug server state | `src/main.jsx` | Công cụ kiểm tra query/cache trong môi trường dev. |
| Axios | HTTP client | `src/services/apiClient.js`, các service | Base URL, interceptor token, timeout, multipart upload. |
| React Icons | Icon UI | Header, search, admin, modal, buttons | Tăng nhận diện thao tác bằng icon. |
| React Image Crop | Crop ảnh | `components/common/CropModal.jsx` | Cho phép cắt vùng ảnh trước khi tìm kiếm bằng image. |
| React Intersection Observer | Infinite scroll trigger | `SearchResult.jsx`, `BookMark.jsx` | Tự tải trang tiếp theo khi sentinel vào viewport. |
| React Masonry CSS | Masonry image grid | `SearchResult.jsx`, `index.css` | Hiển thị ảnh nhiều tỉ lệ trong lưới masonry. |
| SweetAlert2 | Confirm dialog/toast dạng modal | `SearchHistory`, `BookmarkTrash`, admin pages | Xác nhận xoá/khôi phục, cảnh báo thao tác nguy hiểm. |
| AOS | Animation on scroll | `main.jsx`, search/bookmark/history pages | Hiệu ứng fade-up khi render danh sách/card. |
| Web Speech API | Voice input | `CompactSearchBar.jsx` | Tìm kiếm text bằng giọng nói nếu trình duyệt hỗ trợ. |
| Browser APIs | Object URL, Canvas, localStorage/sessionStorage | Crop/upload/search/auth/image fallback | Preview ảnh local, crop canvas, lưu token/user, nhớ mode tìm kiếm. |

Các dependency có trong `package.json` nhưng không thấy dùng trực tiếp trong source thì không được tính là kỹ thuật đã triển khai. Ví dụ project không có TypeScript, không có virtualization library, không có form validation library chuyên dụng.

---

## 3. Cấu trúc thư mục Frontend

```text
frontend/
├── .dockerignore
├── .env
├── .gitignore
├── baocaoFE.md
├── Dockerfile
├── eslint.config.js
├── frontend-summary-report.md
├── frontend-technical-report.md
├── huongdanchayFE.md
├── index.html
├── nginx.conf
├── package-lock.json
├── package.json
├── README.md
├── vite.config.js
├── yeucau.md
├── dist/
│   ├── favicon.svg
│   ├── icons.svg
│   ├── index.html
│   └── assets/
├── node_modules/
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── .env
    ├── App.css
    ├── App.jsx
    ├── index.css
    ├── main.jsx
    ├── assets/
    │   ├── hero.png
    │   ├── react.svg
    │   └── vite.svg
    ├── components/
    │   ├── common/
    │   │   ├── CompactSearchBar.jsx
    │   │   ├── CropModal.jsx
    │   │   ├── ImagePreviewModal.jsx
    │   │   ├── ImageWithFallback.jsx
    │   │   ├── SearchDetailModal.jsx
    │   │   ├── SearchHistoryDetail.jsx
    │   │   ├── SearchMethods.jsx
    │   │   ├── SearchModeTabs.jsx
    │   │   └── VisualSearchPanel.jsx
    │   └── ui/
    │       ├── Button.jsx
    │       ├── CardSkeleton.jsx
    │       ├── Footer.jsx
    │       ├── Header.jsx
    │       ├── HeaderAdmin.jsx
    │       ├── Input.jsx
    │       ├── Modal.jsx
    │       ├── PasswordInput.jsx
    │       ├── SearchHistoryCard.jsx
    │       ├── SearchMethodCard.jsx
    │       ├── SearchResultCard.jsx
    │       ├── SidebarAdmin.jsx
    │       └── SmoothProgressBar.jsx
    ├── config/
    │   └── constants.js
    ├── contexts/
    │   └── AuthContext.jsx
    ├── layouts/
    │   ├── AdminLayout.jsx
    │   ├── AuthLayout.jsx
    │   └── MainLayout.jsx
    ├── mocks/
    │   └── searchResultsMock.js
    ├── pages/
    │   ├── BookMark.jsx
    │   ├── BookmarkTrash.jsx
    │   ├── Home.jsx
    │   ├── Login.jsx
    │   ├── Register.jsx
    │   ├── SearchHistory.jsx
    │   ├── SearchResult.jsx
    │   └── admin/
    │       ├── AdminDashboard.jsx
    │       ├── AdminIndexing.jsx
    │       ├── AdminJobDetail.jsx
    │       ├── AdminTrash.jsx
    │       └── AdminUser.jsx
    ├── routes/
    │   ├── AdminRoute.jsx
    │   ├── AppRoutes.jsx
    │   └── ProtectedRoute.jsx
    ├── services/
    │   ├── adminIndexingService.js
    │   ├── adminTrashService.js
    │   ├── adminUserService.js
    │   ├── apiClient.js
    │   ├── authService.js
    │   ├── bookmarkService.js
    │   ├── imageService.js
    │   ├── searchHistoryService.js
    │   ├── searchService.js
    │   └── searchSimilarService.js
    └── utils/
        ├── fileValidation.js
        ├── formatDateTime.js
        ├── formatScore.js
        ├── imageUrl.js
        └── searchStore.js
```

Vai trò chính:

- `src/main.jsx`: entry point, mount React, cấu hình `QueryClient`, `BrowserRouter`, `AuthProvider`, AOS và React Query Devtools.
- `src/App.jsx`: wrapper đơn giản render `AppRoutes`.
- `src/routes`: định nghĩa route và guard.
- `src/layouts`: shell UI theo ngữ cảnh: user, auth, admin.
- `src/pages`: page-level component, nơi gọi query/mutation và phối hợp component con.
- `src/components/common`: component nghiệp vụ dùng lại cho search/image/modal.
- `src/components/ui`: component UI dùng lại như header, sidebar, card, skeleton, progress.
- `src/services`: tầng API abstraction, toàn bộ request đi qua `apiClient`.
- `src/utils`: helper validate file, format score/date, resolve image URL, lưu tạm file search.
- `src/config/constants.js`: cấu hình `MAX_FILE_SIZE`, `API_BASE_URL`.
- `src/index.css`: Tailwind import, font Inter, CSS Masonry grid.

Ghi chú theo yêu cầu phạm vi:

- `Dockerfile`, `nginx.conf`, `.dockerignore` có nằm trong frontend nhưng không được phân tích vì yêu cầu không phân tích Docker.
- `node_modules` không được đọc implementation; dependency thực tế được xác nhận từ `package.json` và import trong source.
- `dist` là build output, không phải source chính.
- `Input.jsx` và `Modal.jsx` hiện rỗng. `Button.jsx` có code nhưng không thấy được import trong source hiện tại.

---

## 4. Kiến trúc và luồng dữ liệu Frontend

Luồng tổng quát thực tế:

```text
User interaction
 ↓
Page / Component
 ↓
Local state hoặc AuthContext
 ↓
TanStack Query useQuery/useInfiniteQuery/useMutation
 ↓
service function
 ↓
apiClient Axios
 ↓
REST API
 ↓
response normalization tại service/page
 ↓
React Query cache + local UI state
 ↓
render loading/error/empty/data UI
```

### Component giao tiếp API thế nào

Component không gọi `axios` trực tiếp. Các page gọi service thông qua TanStack Query:

```jsx
const searchQuery = useInfiniteQuery({
  queryKey: ["search-results", type, query, mode, size, imageFile?.name, imageId],
  queryFn: ({ pageParam }) => searchByText({ query, mode, page: pageParam, size }),
  getNextPageParam: (lastPageRaw) => { /* normalize page */ },
});
```

Ý nghĩa: Page mô tả dữ liệu cần fetch, service biết endpoint, `apiClient` xử lý base URL/token. Cách này tách UI khỏi chi tiết HTTP.

### State nằm ở đâu

- Local state: form login/register, query text, selected file, modal open/close, selected result, selected image IDs, current page, toast local.
- Global state: `AuthContext` giữ `accessToken`, `user`, `role`, `isAuthenticated`, `loginSuccess`, `logout`.
- Server state: TanStack Query giữ kết quả search, bookmark, history, admin jobs, trash, users.
- Temporary cross-route state: `searchStore.imageFile` giữ `File` ảnh search khi navigate sang `/search-result`, vì `File` không phù hợp để serialize vào URL.

### Search flow

```text
Home / CompactSearchBar
 ↓
VisualSearchPanel chọn mode text/image
 ↓
Text: navigate /search-result?type=text&q=...&mode=SEMANTIC&page=1&size=20
Image: validate file → CropModal → searchStore.imageFile → navigate /search-result?type=image&page=1&size=20
 ↓
SearchResult đọc query params + location.state + searchStore
 ↓
useInfiniteQuery
 ↓
searchByText / searchByImage / searchSimilarImages
 ↓
Masonry grid + SearchResultCard + SearchDetailModal
```

### Authentication flow

```text
Login form
 ↓
authService.login()
 ↓
extract token từ response
 ↓
decode JWT payload nếu cần để lấy role
 ↓
AuthContext.loginSuccess()
 ↓
localStorage accessToken + user
 ↓
ProtectedRoute/AdminRoute quyết định route
```

`AdminRoute` yêu cầu `role === "ADMIN"`. User không phải admin bị redirect về `/`.

### Upload/admin indexing flow

```text
AdminIndexing
 ↓
input type=file multiple
 ↓
validateFile JPG/PNG/WebP + < 10MB
 ↓
tạo preview bằng URL.createObjectURL
 ↓
uploadImagesMutation
 ↓
imageService.uploadImages(files)
 ↓
chia batch 50 file/lần, multipart/form-data tới /images/upload
 ↓
invalidate admin-indexing-jobs + admin-dashboard-stats
 ↓
polling job/items mỗi 5s nếu còn PENDING/RUNNING/PROCESSING
```

---

## 5. Routing và Page Architecture

| Route | Page | Layout | Guard | Chức năng |
| ----- | ---- | ------ | ----- | --------- |
| `/` | `Home` | `MainLayout` | Public | Trang chủ, nếu đã login thì hiển thị panel search, chưa login thì CTA login/register. |
| `/login` | `Login` | `AuthLayout` | Public | Đăng nhập, lưu token/user vào AuthContext. |
| `/register` | `Register` | `AuthLayout` | Public | Đăng ký, validate confirm password, chuyển sang login. |
| `/search-result` | `SearchResult` | `MainLayout` | `ProtectedRoute` | Hiển thị kết quả text/image/similar search, infinite scroll, detail modal. |
| `/bookmarks` | `BookMark` | `MainLayout` | `ProtectedRoute` | Danh sách ảnh đã lưu, infinite scroll, xoá mềm bookmark, preview. |
| `/bookmarks/trash` | `BookmarkTrash` | `MainLayout` | `ProtectedRoute` | Bookmark đã xoá, restore/xoá vĩnh viễn, pagination. |
| `/search-history` | `SearchHistory` | `MainLayout` | `ProtectedRoute` | Lịch sử tìm kiếm, filter type, pagination, modal detail. |
| `/admin` | `AdminDashboard` | `AdminLayout` | `AdminRoute` | Thống kê admin. |
| `/admin/indexing` | `AdminIndexing` | `AdminLayout` | `AdminRoute` | Upload ảnh, theo dõi indexing jobs, retry/delete job. |
| `/admin/indexing/:jobId` | `AdminJobDetail` | `AdminLayout` | `AdminRoute` | Chi tiết item trong indexing job, preview và xoá ảnh. |
| `/admin/users` | `AdminUser` | `AdminLayout` | `AdminRoute` | Danh sách user có pagination. |
| `/admin/trash` | `AdminTrash` | `AdminLayout` | `AdminRoute` | Quản lý ảnh trong thùng rác hệ thống. |

URL state thực tế:

- Search dùng query params: `type`, `q`, `mode`, `page`, `size`, `imageId`.
- Similar search dùng `type=similar&imageId=...`.
- Bookmark trash dùng `page` trong URL qua `useSearchParams`.
- Search result dùng URL để có thể reload/điều hướng lại với text/similar search; riêng image search vẫn cần `searchStore.imageFile` hoặc `location.state.imageFile`.

Protected route:

```jsx
if (!isAuthenticated) {
  return <Navigate to="/login" replace state={{ from: location }} />;
}
```

Admin route:

```jsx
if (role !== "ADMIN") {
  return <Navigate to="/" replace />;
}
```

---

## 6. Component Architecture

### Shared/common components

`VisualSearchPanel`

```text
Input: search mode, file/text input
State: activeMode, selectedFile, previewUrl, fileError, query, crop modal state
API: không gọi API trực tiếp
Rendering: tab mode, upload/drop zone, preview, text form
Output: navigate sang /search-result với query params/state
```

Điểm đáng chú ý: validate file trước, crop trước khi search, dùng `sessionStorage.lastSearchMode`, dùng `searchStore.imageFile` để chuyển `File` qua route.

`CompactSearchBar`

- Dùng trong `SearchResult` để search lại nhanh.
- Hỗ trợ text search, image upload + crop và voice input bằng Web Speech API.
- Khi text search thì `navigate(..., { replace: true })`, giúp cập nhật URL hiện tại.

`CropModal`

- Dùng `react-image-crop`.
- Khi user xác nhận, canvas vẽ vùng crop rồi `canvas.toBlob` tạo `File` JPEG mới.
- Dùng `createPortal(document.body)` để modal nằm ngoài layout thường.

`ImageWithFallback`

- Reusable image component quan trọng nhất.
- Resolve URL qua `resolveImageUrl`.
- Mặc định `loading="lazy"`.
- Nếu ảnh lỗi và có `imageId`, gọi `getImageBlob(imageId)`, tạo blob URL để fallback.
- Revoke blob URL khi unmount/change để tránh leak bộ nhớ.

`ImagePreviewModal`

- Modal full-screen xem ảnh.
- Chặn scroll body khi mở modal.
- Zoom bằng button, wheel, click; giữ `transformOrigin` theo vị trí pointer/touch.
- Dùng `object-contain`, responsive width/height.

`SearchDetailModal`

- Hiển thị ảnh lớn, similarity score, rank, mime type, kích thước, file name.
- Cho phép `Tìm ảnh tương tự` và `Lưu ảnh`.
- Lưu bookmark bằng `useMutation(saveBookmark)` và invalidate query `bookmarks`.

### UI components

- `Header`: navigation user, responsive mobile menu, hiển thị greeting/logout/admin link.
- `Footer`: footer responsive.
- `HeaderAdmin`, `SidebarAdmin`: admin shell, responsive sidebar overlay trên mobile.
- `SearchResultCard`: card ảnh trong Masonry, giữ aspect ratio theo `width/height`, hiển thị score.
- `SearchHistoryCard`: card lịch sử, phân biệt image/text search, render thumbnail hoặc query text.
- `CardSkeleton`: skeleton loading dạng khối.
- `SmoothProgressBar`: progress bar mượt cho indexing job, có fake progress nhẹ tới gần actual progress.
- `PasswordInput`: input mật khẩu có toggle show/hide.

### Component có tính reusable cao

- `ImageWithFallback`: dùng ở search result, history, bookmark, admin trash/job detail.
- `ImagePreviewModal`: dùng ở bookmark, admin trash, job detail.
- `CardSkeleton`: dùng trong search result loading.
- `PasswordInput`: dùng cho login/register.
- `SearchModeTabs`: tách UI tab mode khỏi logic search.

---

## 7. State Management

### Local UI State

Ví dụ local state:

- `Login`: `form`, `error`, `isSubmitting`.
- `Register`: `form`, `error`, `isSubmitting`.
- `VisualSearchPanel`: `activeMode`, `selectedFile`, `previewUrl`, `fileError`, `query`, `showCropModal`.
- `SearchResult`: `selectedResult`, `showScrollTop`.
- `BookMark`: `previewImage`, `toasts`, `showScrollTop`.
- `AdminIndexing`: `uploadMessage`, `selectedJobId`, `page`, `itemPage`, `localImages`, `selectedJobIds`.
- `AdminTrash`: `selectedImageIds`, `feedback`, `previewImageId`.

Không đưa tất cả state vào global là hợp lý vì phần lớn chỉ phục vụ UI của một page/component. Ví dụ modal open/close hoặc selected image chỉ cần sống trong page hiện tại.

### Global State

`AuthContext` là global state chính:

```jsx
const [accessToken, setAccessToken] = useState(() => {
  return localStorage.getItem("accessToken");
});

const [user, setUser] = useState(() => {
  const savedUser = localStorage.getItem("user");
  return savedUser ? JSON.parse(savedUser) : null;
});
```

Context cung cấp:

- `accessToken`
- `user`
- `role: user?.role`
- `isAuthenticated`
- `loginSuccess`
- `logout`

### Server State

TanStack Query quản lý dữ liệu API:

- `useQuery`: dashboard stats, history, admin users, admin trash, job items, policy.
- `useInfiniteQuery`: search result, bookmark list.
- `useMutation`: login không dùng mutation nhưng nhiều thao tác thay đổi dữ liệu có dùng mutation: save/delete bookmark, upload images, retry/delete job, restore/delete trash.
- `queryClient.invalidateQueries`: cập nhật lại cache sau mutation.
- `placeholderData: keepPreviousData`: giữ dữ liệu cũ khi chuyển page/filter.
- `refetchInterval`: polling admin jobs/trash khi trạng thái đang xử lý.

Ví dụ:

```jsx
const trashQuery = useQuery({
  queryKey: ["admin-trash-images", page],
  queryFn: () => getTrashImages({ page, size: 10 }),
  refetchInterval: 10000,
});
```

Code này tự refetch thùng rác admin mỗi 10 giây, phù hợp với dữ liệu có thể thay đổi theo thời gian.

---

## 8. API Integration

Tầng API:

```text
apiClient
  ↓
service function
  ↓
page/component qua TanStack Query
```

`apiClient.js`:

- `baseURL = API_BASE_URL`.
- `API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/visual-search/v1"`.
- `withCredentials: true`.
- JSON header mặc định.
- Timeout 10 giây.
- Request interceptor tự thêm `Authorization: Bearer <token>` trừ endpoint `/auth/login`, `/auth/register`.
- Search request/response/error có logging riêng, có mask Authorization.
- FormData log được format để không dump file raw.

Các service chính:

| Service | API chính | Vai trò |
| ------- | --------- | ------- |
| `authService.js` | `POST /auth/register`, `POST /auth/login` | Đăng ký, đăng nhập. |
| `searchService.js` | `GET /search/text`, `POST /search/image` | Text search và image search. |
| `searchSimilarService.js` | `POST /search/image/similar` | Tìm ảnh tương tự theo `imageId`. |
| `imageService.js` | `GET /images/:id`, `GET /images/:id/url`, `POST /images/upload` | Lấy blob/url ảnh, upload nhiều ảnh. |
| `bookmarkService.js` | `/bookmarks...` | Lấy/lưu/xoá/restore bookmark. |
| `searchHistoryService.js` | `/search-history`, fallback `/search/history` | Lịch sử tìm kiếm và detail. |
| `adminIndexingService.js` | `/admin/stats`, `/admin/indexing-jobs...` | Dashboard, jobs, job items, retry/delete. |
| `adminTrashService.js` | `/admin/trash-images...` | Thùng rác ảnh admin. |
| `adminUserService.js` | `/admin/users` | Danh sách user admin. |

Multipart upload:

```js
const formData = new FormData();
formData.append("image", image);

apiClient.post("/search/image", formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
```

Upload nhiều ảnh:

```js
const UPLOAD_CHUNK_SIZE = 50;
for (let startIndex = 0; startIndex < files.length; startIndex += UPLOAD_CHUNK_SIZE) {
  const chunk = files.slice(startIndex, startIndex + UPLOAD_CHUNK_SIZE);
  const formData = new FormData();
  chunk.forEach((file) => formData.append("files", file));
  await apiClient.post("/images/upload", formData, { timeout: 60000 });
}
```

Ý nghĩa: tránh gửi quá nhiều file trong một request duy nhất, giảm rủi ro timeout/request quá lớn.

---

## 9. Search Feature - Phân tích chuyên sâu

### Text Search

Input:

- `VisualSearchPanel` mode `description`.
- `CompactSearchBar` trong trang kết quả.

Flow:

```text
User nhập query
 ↓
handleTextSearch()
 ↓
/search-result?type=text&q=<query>&mode=SEMANTIC&page=1&size=20
 ↓
SearchResult
 ↓
useInfiniteQuery
 ↓
searchByText({ query, mode, page, size })
 ↓
GET /search/text?q=...&mode=...&page=...&size=...&limit=100
```

`mode` thực tế có `SEMANTIC`. OCR có code xử lý `mode === "OCR"` trong `SearchResult` và history, nhưng tab OCR trong `VisualSearchPanel` đang bị comment nên từ UI chính chưa bật.

### Image Search

Input:

- File input hoặc drag/drop trong `VisualSearchPanel`.
- File input icon ảnh trong `CompactSearchBar`.

Validation:

- Type: `image/jpeg`, `image/png`, `image/webp`.
- Size: tối đa 10MB từ `MAX_FILE_SIZE`.

Flow:

```text
Chọn/kéo thả ảnh
 ↓
validate file
 ↓
CropModal
 ↓
canvas.toBlob → File cropped_*.jpeg
 ↓
searchStore.imageFile = croppedFile
 ↓
navigate /search-result?type=image&page=1&size=20
 ↓
searchByImage(FormData image)
 ↓
POST /search/image?page=...&size=...&limit=100
```

### Similar Image Search

Trong `SearchDetailModal`, nút `Tìm ảnh tương tự` gọi `onSearchSimilar(result)`. `SearchResult` navigate sang:

```text
/search-result?type=similar&imageId=<id>&page=1&size=20
```

Sau đó gọi:

```js
searchSimilarImages(Number(imageId), pageParam, size)
```

Endpoint:

```text
POST /search/image/similar
body: { imageId }
params: page, size, limit
```

### Search Result rendering

`SearchResult` normalize response để thống nhất:

- `results`
- `score`
- `pageNumber`
- `pageSize`
- `totalElements`
- `totalPages`
- `processingTimeMs`
- `queryImageUrl`

Kết quả hiển thị bằng:

- Masonry grid.
- `SearchResultCard`.
- `ImageWithFallback`.
- Similarity score format bằng `formatScore(score)`.
- Skeleton khi loading.
- Error box khi query lỗi.
- Empty state khi không có kết quả.
- Infinite scroll bằng `useInView`.
- Modal detail để xem ảnh và thao tác bookmark/similar.

---

## 10. Image Handling và Image Performance

### Lazy loading

File/component:

- `ImageWithFallback.jsx`
- `SearchResultCard.jsx`
- `SearchHistoryCard.jsx`
- Bookmark image components trong `BookMark.jsx`, `BookmarkTrash.jsx`

Code:

```jsx
<img
  src={displaySrc}
  alt={alt}
  loading={loading}
  className={className}
  onError={loadBlobFallback}
/>
```

Vấn đề giải quyết: không tải tất cả ảnh ngay khi render, đặc biệt khi danh sách có nhiều ảnh. Lợi ích: giảm bandwidth ban đầu, cải thiện perceived performance.

### Infinite scrolling

File:

- `SearchResult.jsx`
- `BookMark.jsx`

Code:

```jsx
const { ref: loadMoreRef, inView } = useInView({ rootMargin: "200px" });

useEffect(() => {
  if (inView && searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
    searchQuery.fetchNextPage();
  }
}, [inView, searchQuery.hasNextPage, searchQuery.isFetchingNextPage]);
```

Vấn đề giải quyết: backend có thể trả nhiều kết quả, frontend không render/tải toàn bộ ngay. Page đầu chỉ lấy `PAGE_SIZE = 20`, sau đó cuộn tới gần cuối mới fetch tiếp.

### Masonry grid

File:

- `SearchResult.jsx`
- `index.css`

Code:

```jsx
<Masonry
  breakpointCols={breakpointColumnsObj}
  className="my-masonry-grid"
  columnClassName="my-masonry-grid_column"
>
  {searchData.results.map(...)}
</Masonry>
```

Vấn đề giải quyết: ảnh có tỉ lệ khác nhau. Masonry giúp lưới tự cân bằng chiều cao thay vì ép tất cả ảnh cùng kích thước.

### Aspect ratio tránh layout shift

File: `SearchResultCard.jsx`

```jsx
const aspectRatioStyle = result.width && result.height
  ? { aspectRatio: `${result.width} / ${result.height}` }
  : {};
```

Vấn đề giải quyết: nếu backend trả `width/height`, card có tỉ lệ trước khi ảnh load, giảm layout shift.

### Fallback ảnh bằng blob API

File: `ImageWithFallback.jsx`

```jsx
getImageBlob(imageId)
  .then((blob) => {
    const objectUrl = URL.createObjectURL(blob);
    setBlobFallback({ url: objectUrl, source: resolvedSrc });
  });
```

Vấn đề giải quyết: URL storage/direct URL có thể lỗi hoặc là host nội bộ. Component fallback sang endpoint ảnh theo `imageId`.

### Resolve URL storage/MinIO public

File: `utils/imageUrl.js`

- Nếu URL absolute có hostname nội bộ như `minio`, `visualsearch-minio`, đổi sang public base URL cấu hình frontend.
- Nếu là object path, build URL theo `VITE_MINIO_PUBLIC_URL` + bucket.
- Nếu không có path hợp lệ, fallback `/images/:imageId`.

Lợi ích: frontend không phụ thuộc cứng vào một dạng URL duy nhất từ backend.

### Modal preview và zoom

File: `ImagePreviewModal.jsx`

- Full-screen overlay.
- `object-contain`.
- Zoom in/out/reset.
- Wheel zoom.
- Pointer/touch origin.
- Chặn scroll body khi modal mở.

### Object URL lifecycle

File:

- `VisualSearchPanel.jsx`
- `CompactSearchBar.jsx`
- `ImageWithFallback.jsx`
- `BookMark.jsx`
- `BookmarkTrash.jsx`
- `AdminIndexing.jsx`

Code có `URL.createObjectURL` và `URL.revokeObjectURL`.

Lợi ích: preview ảnh local/blob nhưng giảm nguy cơ memory leak khi component unmount hoặc ảnh bị xoá khỏi danh sách.

### Khi backend trả hàng trăm/hàng nghìn ảnh

Frontend hiện có:

- Search dùng `useInfiniteQuery`, `PAGE_SIZE = 20`, chỉ fetch thêm khi scroll.
- Bookmark dùng `useInfiniteQuery`, `PAGE_SIZE = 20`.
- Admin job/trash/users dùng pagination.
- Ảnh dùng lazy loading.
- Search card lazy import bằng `React.lazy`.

Frontend chưa có:

- Virtualization (`react-window`, `react-virtual`) không xuất hiện trong code.
- Debounce/throttle search input chưa có.
- Responsive `srcset`/multi-size image chưa có.
- Progressive image placeholder nâng cao chưa có ngoài skeleton/pulse.

---

## 11. Responsive Design và UX/UI

Kỹ thuật responsive có trong code:

- Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`.
- Mobile-first layout: nhiều component mặc định `flex-col`, lên desktop chuyển `sm:flex-row`, `lg:grid`, `xl:grid-cols-*`.
- Header user có hamburger menu trên mobile (`lg:hidden`).
- Sidebar admin là drawer overlay trên mobile, static sidebar trên desktop.
- Search result Masonry đổi số cột theo breakpoint.
- Bookmark grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`.
- Admin table có hai rendering style: desktop table, mobile card row (`hidden lg:table-cell`, `lg:hidden`).
- Modal preview dùng `w-[95vw] md:w-[80vw] lg:w-[50vw]`, `h-[70vh] lg:h-[80vh]`.
- Crop modal giới hạn `max-h-[95vh]`, vùng crop `overflow-auto`.
- Buttons có disabled/hover/focus state ở nhiều nơi.

UX states đã xử lý:

- Loading: skeleton/pulse/spinner/loading text.
- Error: box đỏ hoặc feedback message.
- Empty state: không có kết quả, chưa có bookmark, thùng rác trống, chưa có history.
- Disabled state: button submit khi đang gửi, pagination disabled, mutation pending.
- Confirmation: SweetAlert2 cho xoá vĩnh viễn/xoá hàng loạt.
- Toast local trong bookmark.
- Scroll-to-top button khi scroll quá 300px trong search/bookmark.
- Sticky compact search bar trong search result.

---

## 12. Authentication và Authorization phía Frontend

### Login

```text
Login page
 ↓
login(payload)
 ↓
extract accessToken
 ↓
getRoleFromResponse(response, token)
 ↓
loginSuccess({ token, user })
 ↓
localStorage + AuthContext
 ↓
navigate theo role/fromPath
```

`Login.jsx` đọc role từ nhiều nguồn:

- `response.data.user.role`
- `response.data.role`
- `response.user.role`
- `response.role`
- JWT payload `role`, `authorities[0]`, `roles[0]`
- fallback `USER`

Sau đó normalize `ROLE_` và uppercase.

### Register

- Form có username, email, password, confirmPassword.
- Kiểm tra password nhập lại có khớp.
- Gọi `register`.
- Thành công chuyển sang `/login` kèm message.

### Logout

`AuthContext.logout()` xoá:

- `localStorage.accessToken`
- `localStorage.user`
- state `accessToken`, `user`

### Protected Routes

- `ProtectedRoute`: yêu cầu có token.
- `AdminRoute`: yêu cầu có token và `role === "ADMIN"`.

### Role-based UI

- `Header` hiển thị link `Về Admin Dashboard` nếu `role === "ADMIN"`.
- Admin routes bị chặn nếu user không phải admin.
- Sidebar/header admin hiển thị user admin hiện tại.

---

## 13. Admin Frontend

### AdminDashboard

File: `pages/admin/AdminDashboard.jsx`

- Query `getAdminStats`.
- Hiển thị metrics: ảnh đã index, người dùng, tổng ảnh upload, đang index, pending, failed.
- Có nút refetch thủ công.
- Progress snapshot tính `% ảnh đã index` dựa trên `indexed / totalImages` nếu có dữ liệu.

### AdminIndexing

File: `pages/admin/AdminIndexing.jsx`

Chức năng:

- Upload nhiều ảnh.
- Validate file.
- Preview local trước khi upload.
- Gọi upload API.
- Theo dõi jobs.
- Theo dõi items của job đang chọn.
- Retry job lỗi.
- Delete một job hoặc nhiều job.
- Polling mỗi 5 giây nếu job/item còn đang xử lý.
- Responsive table: desktop table, mobile card.

### AdminJobDetail

File: `pages/admin/AdminJobDetail.jsx`

Chức năng:

- Route param `jobId`.
- Query item trong job theo page.
- Polling nếu item `PENDING` hoặc `PROCESSING`.
- Chọn một/nhiều ảnh.
- Xoá ảnh đã chọn bằng mutation `deleteJobImages`.
- Preview ảnh qua `ImagePreviewModal`.
- Pagination item.

### AdminTrash

File: `pages/admin/AdminTrash.jsx`

Chức năng:

- Query ảnh trong thùng rác admin.
- Query policy retention days.
- Restore một ảnh, restore selected, restore all.
- Permanent delete một ảnh, selected, all.
- Select all current page.
- Refetch interval 10 giây.
- Preview ảnh.

### AdminUser

File: `pages/admin/AdminUser.jsx`

Chức năng:

- Query `/admin/users`.
- Pagination bằng local page.
- Table user: id, username, email, role, status, createdAt.
- Responsive table có overflow-x.

---

## 14. Upload và xử lý file

### Search image upload

File:

- `VisualSearchPanel.jsx`
- `CompactSearchBar.jsx`

Có:

- File input.
- Drag/drop ở `VisualSearchPanel`.
- Validate MIME type và size.
- Preview bằng object URL.
- Crop trước khi search.
- Revoke object URL.
- FormData multipart qua `searchByImage`.

Không thấy:

- Upload progress percent thật.
- Chunk upload cho search image đơn.
- Drag/drop trong admin upload.

### Admin multiple upload

File:

- `AdminIndexing.jsx`
- `imageService.js`
- `fileValidation.js`

Flow:

```text
input multiple
 ↓
Array.from(files)
 ↓
filter(validateFile)
 ↓
tạo local preview UPLOADING
 ↓
uploadImages(validImages)
 ↓
batch 50 file/lần
 ↓
multipart field "files"
 ↓
map uploaded response thành localImages
```

Đây là điểm có thể nói khi phỏng vấn: frontend chủ động chia upload thành batch 50 file/request để tránh request quá lớn khi admin chọn nhiều ảnh.

---

## 15. Performance Optimization

### TanStack Query cache

Code ở:

- `main.jsx`: `refetchOnWindowFocus: false`, `retry: 1`.
- `SearchResult.jsx`: `staleTime: 5 * 60 * 1000`, `gcTime: 10 * 60 * 1000`.

Vấn đề: tránh gọi lại API quá nhiều khi user đổi tab hoặc quay lại trang kết quả.

### Infinite scroll + pagination

Code ở:

- `SearchResult.jsx`: `useInfiniteQuery`, `useInView`.
- `BookMark.jsx`: `useInfiniteQuery`, `useInView`.
- Admin/history/trash/users: pagination.

Vấn đề: không render/tải toàn bộ dữ liệu lớn cùng lúc.

### Lazy component import

File: `SearchResult.jsx`

```jsx
const SearchResultCard = lazy(() =>
  import("../components/ui/SearchResultCard").then(module => ({ default: module.SearchResultCard }))
);
```

Vấn đề: giảm bundle/render cost ban đầu của page search result. Card được render qua `Suspense` với skeleton fallback.

### Lazy image loading

File: `ImageWithFallback.jsx`, `SearchResultCard.jsx`

Mặc định ảnh dùng `loading="lazy"`. Modal detail dùng `loading="eager"` vì ảnh chính cần hiển thị ngay.

### Masonry + aspect ratio

File: `SearchResultCard.jsx`, `SearchResult.jsx`.

Vấn đề: ảnh nhiều kích thước; giữ layout ổn định và đẹp hơn khi ảnh load.

### Memoization

File:

- `SearchResult.jsx`: `useMemo` flatten pages, preview image URL.
- `SearchHistory.jsx`: normalize history response.
- `ImageWithFallback.jsx`: memo resolve URL.
- `AdminIndexing.jsx`: memo visible local images.

Vấn đề: tránh tính toán lại không cần thiết khi render.

### Polling có điều kiện

File:

- `AdminIndexing.jsx`: polling jobs/items chỉ khi status đang chạy/chờ.
- `AdminJobDetail.jsx`: polling item nếu `PENDING/PROCESSING`.
- `AdminTrash.jsx`: refetch mỗi 10 giây.

Vấn đề: admin cần cập nhật trạng thái nền, nhưng không poll vô hạn ở mọi trường hợp.

### Upload batching

File: `imageService.js`

Batch 50 file/lần giúp giảm rủi ro request quá lớn và dễ xử lý danh sách ảnh nhiều.

### Chưa triển khai

- Không có virtualization.
- Không có debounce/throttle search input.
- Không có `useCallback`.
- Không có service worker/browser cache custom.
- Không có test performance benchmark.
- Không có responsive image `srcset`.

---

## 16. Error Handling và Loading State

### API error

- `Login/Register`: parse `response.data.error.message`, `message`, status 409/502/503.
- Search result: hiển thị box lỗi khi `searchQuery.isError`.
- Bookmark/history/admin: hiển thị error state hoặc SweetAlert feedback.
- `apiClient` log search error có status, params, response.

### Network/error fallback ảnh

`ImageWithFallback` xử lý `onError`:

1. Đánh dấu source hiện tại failed.
2. Nếu có `imageId`, gọi `getImageBlob`.
3. Tạo blob URL.
4. Nếu vẫn lỗi, render fallback text.

### Loading

- Search result: skeleton Masonry 20 card.
- Bookmark: pulse grid.
- History: pulse card.
- Admin job detail: pulse rows.
- Image blob loading: pulse gray box.
- Modal secure preview: spinner.
- Mutation pending: disabled button + text `Đang...`.

### Empty state

- Search không có dữ liệu.
- Không tìm thấy kết quả.
- Chưa có bookmark.
- Thùng rác trống.
- Chưa có lịch sử.
- Chưa có indexing job.

---

## 17. Những vấn đề thực tế đã giải quyết

```text
Vấn đề: Search trả nhiều ảnh
→ Nguyên nhân: nếu render/tải tất cả cùng lúc sẽ nặng UI và network
→ Giải pháp frontend: useInfiniteQuery + useInView + PAGE_SIZE 20 + lazy loading ảnh
→ Kết quả: chỉ tải thêm khi user cuộn gần cuối.
```

```text
Vấn đề: Ảnh có nhiều tỉ lệ khác nhau
→ Nguyên nhân: lưới đều có thể bị méo ảnh hoặc khoảng trắng xấu
→ Giải pháp frontend: Masonry layout + object-cover + aspectRatio theo width/height
→ Kết quả: grid ảnh tự nhiên hơn và giảm layout shift.
```

```text
Vấn đề: URL ảnh backend/storage có thể không truy cập trực tiếp được
→ Nguyên nhân: host nội bộ hoặc storage path khác nhau
→ Giải pháp frontend: resolveImageUrl/resolveStorageUrl + ImageWithFallback gọi blob API
→ Kết quả: ảnh vẫn có cơ hội hiển thị qua endpoint nội bộ của backend.
```

```text
Vấn đề: User cần tìm theo vùng cụ thể trong ảnh
→ Nguyên nhân: ảnh upload có thể chứa nhiều đối tượng/nội dung thừa
→ Giải pháp frontend: CropModal dùng react-image-crop + canvas.toBlob tạo file mới
→ Kết quả: request image search gửi vùng ảnh user chọn.
```

```text
Vấn đề: Admin upload nhiều ảnh
→ Nguyên nhân: request quá lớn dễ timeout/thất bại
→ Giải pháp frontend: validate file, preview local, uploadImages chia batch 50 file
→ Kết quả: upload nhiều ảnh có tổ chức hơn và có feedback trạng thái.
```

```text
Vấn đề: Job indexing chạy nền
→ Nguyên nhân: trạng thái thay đổi sau khi upload
→ Giải pháp frontend: React Query polling có điều kiện và progress bar
→ Kết quả: admin theo dõi được tiến độ mà không cần refresh thủ công.
```

```text
Vấn đề: Role-based access
→ Nguyên nhân: admin UI không nên mở cho user thường
→ Giải pháp frontend: AdminRoute kiểm tra role ADMIN, Header hiển thị link admin theo role
→ Kết quả: frontend có lớp guard UI/route theo vai trò.
```

---

## 18. Những kỹ thuật frontend nổi bật có thể nói khi phỏng vấn

1. Tôi đã sử dụng React Router để tổ chức route public, protected và admin, giải quyết phân quyền điều hướng bằng `ProtectedRoute` và `AdminRoute`.
2. Tôi đã sử dụng AuthContext để quản lý trạng thái đăng nhập toàn cục, lưu token/user vào `localStorage` và cung cấp logout/loginSuccess cho UI.
3. Tôi đã sử dụng Axios instance có interceptor để tự động gắn JWT vào request và tập trung cấu hình API.
4. Tôi đã sử dụng TanStack Query để quản lý server state, loading/error, cache, mutation và invalidate sau thao tác bookmark/admin.
5. Tôi đã sử dụng `useInfiniteQuery` kết hợp `react-intersection-observer` để tải kết quả search/bookmark theo infinite scroll.
6. Tôi đã dùng lazy loading ảnh và fallback blob API để xử lý lỗi tải ảnh hoặc URL storage không truy cập được.
7. Tôi đã dùng `react-image-crop` và canvas để crop ảnh trước khi gửi image search.
8. Tôi đã xây image preview modal có zoom bằng click, wheel và nút điều khiển.
9. Tôi đã dùng Tailwind responsive breakpoints để xây layout mobile/desktop cho search, bookmark và admin.
10. Tôi đã chia upload nhiều ảnh thành batch 50 file/request trong `imageService.uploadImages`.
11. Tôi đã dùng polling có điều kiện trong admin để theo dõi indexing job đang chạy.
12. Tôi đã dùng Masonry grid để hiển thị ảnh nhiều tỉ lệ trong search result.

---

## 19. Thành quả đạt được sau dự án

### Technical achievements

- Xây dựng SPA Visual Search bằng React + Vite.
- Tổ chức route và layout riêng cho user/auth/admin.
- Tích hợp REST API qua Axios service layer.
- Xây dựng search interface cho text, image và similar image.
- Xử lý upload/crop/preview ảnh phía frontend.
- Render kết quả ảnh bằng Masonry, lazy loading và infinite scroll.
- Quản lý server state bằng TanStack Query.
- Xây dựng auth flow với token, role và route guard.
- Xây dựng admin UI cho dashboard, upload/indexing jobs, job detail, trash, users.
- Xử lý loading/error/empty states ở các màn hình chính.

### Engineering skills gained

- Component architecture và tách page/component/service.
- API integration với Axios interceptor và response normalization.
- Async state bằng React Query.
- Image performance: lazy loading, fallback, blob URL lifecycle.
- Responsive design bằng Tailwind.
- Quản lý form và validation cơ bản.
- Thiết kế admin table responsive và polling trạng thái nền.

---

## 20. Những điểm mạnh của Frontend

### Architecture

Điểm mạnh: tách rõ `routes`, `layouts`, `pages`, `components`, `services`, `utils`.  
Bằng chứng: `AppRoutes.jsx` chỉ định route/layout, pages gọi service qua Query, service tách endpoint.

### Maintainability

Điểm mạnh: API được gom ở `services`, ảnh được resolve qua `utils/imageUrl.js`, format score/date tách thành helper.  
Bằng chứng: nhiều component dùng lại `ImageWithFallback`, `formatScore`, `formatDateTime`.

### Reusability

Điểm mạnh: `ImageWithFallback`, `ImagePreviewModal`, `PasswordInput`, `SearchResultCard`, `SearchHistoryCard` có thể tái sử dụng.  
Bằng chứng: `ImageWithFallback` xuất hiện ở search, bookmark, history, admin.

### Performance

Điểm mạnh: infinite scroll, lazy image, cache/staleTime, lazy import card, upload batching.  
Bằng chứng: `SearchResult.jsx`, `BookMark.jsx`, `imageService.js`.

### UX

Điểm mạnh: có loading, error, empty state, confirm dialog, toast, modal detail, scroll-to-top, sticky search bar.  
Bằng chứng: các page search/bookmark/history/admin đều có nhánh UI trạng thái.

### Responsive

Điểm mạnh: UI mobile/desktop được xử lý bằng Tailwind breakpoint và layout riêng cho admin table.  
Bằng chứng: `Header`, `SidebarAdmin`, `AdminIndexing`, `AdminJobDetail`, `AdminTrash`.

### API Integration

Điểm mạnh: `apiClient` có interceptor token, timeout, logging search, FormData handling.  
Bằng chứng: `src/services/apiClient.js`.

---

## 21. Những điểm còn hạn chế / có thể cải thiện

```text
Hiện tại: Project dùng JavaScript/JSX
→ Vấn đề: thiếu type safety cho response API phức tạp
→ Cải thiện đề xuất: migrate dần sang TypeScript hoặc thêm JSDoc schema
→ Mức độ ưu tiên: Trung bình/Cao
```

```text
Hiện tại: Chưa có virtualization
→ Vấn đề: infinite scroll vẫn tích luỹ DOM node khi user cuộn rất nhiều trang
→ Cải thiện đề xuất: dùng react-virtual/react-window cho grid lớn
→ Mức độ ưu tiên: Cao nếu dữ liệu thật lên hàng nghìn ảnh mỗi phiên
```

```text
Hiện tại: Search input chưa debounce
→ Vấn đề: hiện tại submit thủ công nên chưa nặng, nhưng nếu thêm auto-search sẽ dễ spam API
→ Cải thiện đề xuất: debounce khi triển khai search realtime
→ Mức độ ưu tiên: Thấp/Trung bình
```

```text
Hiện tại: Image search phụ thuộc searchStore.imageFile
→ Vấn đề: reload trang image search có thể mất File vì File không nằm trong URL/localStorage
→ Cải thiện đề xuất: upload tạm query image trước hoặc lưu searchId/queryImageId rồi dùng URL bền hơn
→ Mức độ ưu tiên: Trung bình
```

```text
Hiện tại: Một số component/file chưa dùng hoặc rỗng
→ Vấn đề: Input.jsx, Modal.jsx rỗng; Button.jsx không thấy import; App.css có CSS template không được import từ App.jsx
→ Cải thiện đề xuất: xoá file thừa hoặc hoàn thiện design system
→ Mức độ ưu tiên: Thấp/Trung bình
```

```text
Hiện tại: AdminUser có import `data` từ react-router-dom nhưng không dùng
→ Vấn đề: code noise, có thể bị lint cảnh báo
→ Cải thiện đề xuất: xoá import không dùng
→ Mức độ ưu tiên: Thấp
```

```text
Hiện tại: Error handling chưa thống nhất toàn app
→ Vấn đề: nơi dùng toast local, nơi dùng SweetAlert2, nơi dùng text box
→ Cải thiện đề xuất: tạo notification/error utility chung
→ Mức độ ưu tiên: Trung bình
```

```text
Hiện tại: Chưa thấy test frontend
→ Vấn đề: khó tự tin khi refactor auth/search/admin
→ Cải thiện đề xuất: thêm unit test cho utils/service normalization và component test cho route guard/search states
→ Mức độ ưu tiên: Trung bình
```

```text
Hiện tại: Accessibility chưa đầy đủ
→ Vấn đề: một số icon button thiếu aria-label/title; modal chưa quản lý focus trap
→ Cải thiện đề xuất: chuẩn hoá aria-label, keyboard close, focus management
→ Mức độ ưu tiên: Trung bình
```

```text
Hiện tại: OCR UI chính bị comment
→ Vấn đề: code có support mode OCR ở một số nơi nhưng user chưa bật được từ panel chính
→ Cải thiện đề xuất: xác nhận backend/API rồi bật lại tab OCR hoặc xoá code chưa dùng
→ Mức độ ưu tiên: Tuỳ roadmap
```

---

## 22. Nội dung có thể đưa vào CV

- Xây dựng SPA Visual Search bằng ReactJS + Vite, tổ chức routing, layout và component architecture cho user flow và admin console.
- Tích hợp REST API bằng Axios instance có interceptor JWT, timeout và service layer tách riêng cho auth, search, image, bookmark và admin.
- Triển khai tìm kiếm ảnh bằng text/image/similar image, đồng bộ trạng thái tìm kiếm qua URL query params và React Router navigation.
- Sử dụng TanStack Query để quản lý server state, cache, loading/error state, mutation và invalidate dữ liệu sau thao tác bookmark/admin.
- Tối ưu hiển thị nhiều ảnh bằng infinite scroll, lazy image loading, Masonry grid, skeleton loading và fallback tải ảnh qua blob API.
- Xây dựng crop image flow bằng react-image-crop và Canvas API để tạo file ảnh đã cắt trước khi gửi multipart search request.
- Phát triển admin indexing UI cho upload nhiều ảnh, preview local, batch upload 50 file/request, polling trạng thái job và progress tracking.
- Xây dựng frontend authentication/authorization với AuthContext, localStorage token, ProtectedRoute và AdminRoute dựa trên role.
- Thiết kế responsive UI bằng Tailwind CSS cho search, bookmark, modal ảnh, admin sidebar và bảng dữ liệu mobile/desktop.
- Xử lý UX trạng thái thực tế gồm loading, empty, error, disabled, confirm dialog, image preview zoom và scroll-to-top.

---

## 23. Cách giới thiệu dự án khi phỏng vấn

Trong dự án này em phụ trách phần frontend cho một hệ thống Visual Search. Em xây SPA bằng React và Vite, dùng React Router để tổ chức các luồng public, user protected và admin. Người dùng có thể đăng nhập, tìm kiếm ảnh bằng mô tả hoặc upload ảnh, crop vùng ảnh cần tìm, xem kết quả theo dạng Masonry grid, mở modal chi tiết, tìm ảnh tương tự và lưu bookmark. Với phần dữ liệu async, em dùng TanStack Query để quản lý server state, cache, loading/error, mutation và infinite scroll. Về ảnh, em xử lý lazy loading, fallback khi URL ảnh lỗi bằng blob API, preview local bằng object URL có revoke, và modal zoom ảnh. Phần admin có dashboard, upload nhiều ảnh để indexing, chia upload thành batch 50 file/request, polling trạng thái job đang chạy, xem chi tiết item, xoá/khôi phục ảnh trong thùng rác và quản lý user. Toàn bộ API được tách qua service layer dùng Axios instance có interceptor gắn JWT.

### Các câu hỏi nhà tuyển dụng có thể hỏi và câu trả lời gợi ý

1. Frontend của em tổ chức architecture như thế nào?  
Em tách route/layout/page/component/service/utils. Route nằm ở `AppRoutes`, layout tách `MainLayout`, `AuthLayout`, `AdminLayout`, API nằm trong `services`, component dùng lại nằm trong `components/common` và `components/ui`.

2. Vì sao dùng TanStack Query?  
Vì dữ liệu search/bookmark/history/admin là server state. React Query giúp cache, loading/error, mutation, invalidate, infinite query và polling rõ ràng hơn so với tự quản lý bằng nhiều `useEffect`.

3. Search result hoạt động thế nào?  
Trang đọc `type`, `q`, `mode`, `imageId`, `size` từ URL và state, sau đó `useInfiniteQuery` gọi `searchByText`, `searchByImage` hoặc `searchSimilarImages`, normalize response rồi render Masonry grid.

4. Em xử lý nhiều ảnh như thế nào?  
Em không tải toàn bộ một lần. Search dùng `PAGE_SIZE = 20`, `useInfiniteQuery` và `useInView` để fetch tiếp khi cuộn. Ảnh dùng `loading="lazy"` và skeleton khi loading.

5. Project có virtualization chưa?  
Chưa. Hiện tối ưu bằng pagination/infinite scroll/lazy loading. Nếu dữ liệu mỗi phiên lên rất nhiều trang, em sẽ thêm virtualization cho grid.

6. Image search upload hoạt động ra sao?  
Frontend validate ảnh JPG/PNG/WebP tối đa 10MB, tạo object URL preview, mở crop modal, canvas tạo file JPEG mới rồi gửi bằng `FormData` tới `/search/image`.

7. Tại sao cần `searchStore.imageFile`?  
Vì `File` object không nên serialize vào URL. `searchStore` giữ tạm file khi navigate từ panel sang `/search-result`. Hạn chế là reload có thể mất file.

8. Em xử lý lỗi ảnh như thế nào?  
`ImageWithFallback` resolve URL trước. Nếu `img onError` và có `imageId`, component gọi `getImageBlob(imageId)`, tạo blob URL fallback; nếu vẫn lỗi thì hiển thị fallback text.

9. Similar image search làm sao?  
Trong modal chi tiết, click `Tìm ảnh tương tự` navigate sang `type=similar&imageId=...`, sau đó gọi `POST /search/image/similar` với body `{ imageId }`.

10. Auth flow của em ra sao?  
Login gọi API, lấy token, lấy role từ response hoặc JWT payload, lưu vào AuthContext/localStorage. `ProtectedRoute` kiểm tra token; `AdminRoute` kiểm tra role ADMIN.

11. API token được gắn ở đâu?  
Trong `apiClient` request interceptor. Nếu có `localStorage.accessToken` và không phải login/register, request được thêm `Authorization: Bearer <token>`.

12. Admin indexing có gì đáng chú ý?  
Admin có upload nhiều ảnh, validate file, preview local, batch upload 50 file/request, query danh sách job, polling mỗi 5 giây nếu job/item còn xử lý, retry/delete job.

13. Vì sao dùng polling trong admin?  
Indexing là tác vụ nền, trạng thái thay đổi sau khi upload. Polling có điều kiện giúp UI cập nhật progress mà user không cần refresh.

14. Responsive được xử lý thế nào?  
Dùng Tailwind breakpoint mobile-first. Header/sidebar có mobile menu. Admin table có desktop table và mobile card. Grid ảnh đổi số cột theo breakpoint.

15. Modal ảnh có chức năng gì?  
`ImagePreviewModal` chặn scroll body, hiển thị ảnh object-contain, có zoom in/out/reset, wheel zoom và origin theo pointer/touch.

16. Bookmark hoạt động thế nào?  
Bookmark list dùng `useInfiniteQuery`; lưu/xoá dùng mutation. Sau mutation invalidate query `bookmarks` để dữ liệu cập nhật.

17. Search history hoạt động thế nào?  
History dùng `useQuery` với key `["search-history", activeFilter, page]`, filter theo search type, pagination, modal detail query theo `searchId`.

18. Em đã tối ưu API request thế nào?  
React Query cache, `refetchOnWindowFocus: false`, retry 1 lần, `staleTime/gcTime` cho search result, `placeholderData` khi đổi page, service layer normalize params.

19. Những hạn chế hiện tại là gì?  
Chưa có TypeScript, chưa có virtualization, chưa có test, error notification chưa thống nhất, image search reload có thể mất `File`, một vài file UI còn rỗng/chưa dùng.

20. Nếu cải thiện tiếp em làm gì?  
Em sẽ thêm TypeScript cho API types, virtualization cho grid lớn, notification system chung, focus trap/accessibility cho modal, và test cho route guard/service/utils.

---

## 24. Bảng "Tôi đã học được gì"

| Chủ đề | Tôi đã áp dụng trong project | Tôi cần hiểu sâu thêm |
| ------ | ---------------------------- | --------------------- |
| React | Component architecture, local state, props, hooks | Render lifecycle, re-render profiling |
| React Router | Public/protected/admin routes, URL query params, route params | Data routers, nested layout route nâng cao |
| Auth | AuthContext, localStorage token/user, role guard | Refresh token, token expiration handling |
| TanStack Query | `useQuery`, `useInfiniteQuery`, `useMutation`, cache, invalidate, polling | Query invalidation strategy, optimistic update |
| Axios | Instance, baseURL, interceptor token, multipart | Global error interceptor, refresh token queue |
| Image handling | Lazy loading, fallback blob, object URL, crop canvas, zoom modal | `srcset`, CDN image sizing, virtualization |
| Upload | FormData, multiple files, batch 50 file/request | Upload progress, resumable/chunk upload |
| Responsive UI | Tailwind breakpoints, mobile menu, responsive table/card | Design system consistency, accessibility |
| Performance | Infinite scroll, lazy import, memoization, skeleton | Performance profiling, virtualization |
| Admin UI | Polling jobs, progress, bulk select/delete/restore | Real-time updates bằng WebSocket/SSE |
| Error handling | Error state, SweetAlert2, toast local, fallback image | Notification architecture chung |
| Accessibility | Một số aria-label/title, keyboard button cơ bản | Focus trap, screen reader labels, modal keyboard UX |

---

## 25. Frontend Interview Cheat Sheet

```text
Framework: React 19
Build tool: Vite 8
Styling: Tailwind CSS 4 + custom Masonry CSS
Routing: React Router DOM 7
State: Local state + AuthContext
Server state: TanStack React Query
API: Axios instance + service layer
Authentication: JWT token trong localStorage, AuthContext, ProtectedRoute/AdminRoute
Image handling: lazy loading, resolve URL, fallback blob, crop, preview, zoom modal
Performance: infinite scroll, pagination, cache/staleTime, lazy import, skeleton, upload batching
Responsive: Tailwind breakpoints, mobile menu, admin responsive table/card
Admin: dashboard, indexing jobs, job detail, trash, users
```

### 10 kỹ thuật frontend nổi bật

1. Route guard bằng React Router.
2. AuthContext lưu token/user/role.
3. Axios interceptor gắn JWT.
4. TanStack Query server state.
5. Infinite scroll bằng `useInfiniteQuery` + `useInView`.
6. Lazy loading ảnh + image fallback blob API.
7. Crop ảnh bằng `react-image-crop` + canvas.
8. Masonry grid cho ảnh nhiều tỉ lệ.
9. Upload batch 50 file/request.
10. Polling admin job có điều kiện.

### 10 vấn đề tôi đã giải quyết

1. Không tải toàn bộ kết quả ảnh cùng lúc.
2. Hiển thị ảnh nhiều tỉ lệ đẹp hơn.
3. Fallback khi URL ảnh lỗi.
4. Crop vùng ảnh cần search.
5. Lưu và xoá bookmark.
6. Theo dõi lịch sử tìm kiếm.
7. Phân quyền user/admin.
8. Upload nhiều ảnh cho admin.
9. Theo dõi job indexing nền.
10. Responsive layout cho mobile/desktop.

### 10 câu hỏi cần nhớ

1. Vì sao dùng React Query thay vì `useEffect`?
2. Query key search được thiết kế thế nào?
3. Infinite scroll hoạt động ra sao?
4. Image fallback hoạt động thế nào?
5. Vì sao cần crop trước khi search?
6. Token được lưu và gắn vào request ra sao?
7. AdminRoute bảo vệ route thế nào?
8. Upload batch giải quyết vấn đề gì?
9. Responsive admin table xử lý thế nào?
10. Project còn thiếu gì để scale tốt hơn?

### 10 điểm có thể nói trong CV

1. React + Vite SPA.
2. React Router protected/admin routes.
3. TanStack Query server state.
4. Axios service layer + JWT interceptor.
5. Text/image/similar search UI.
6. Infinite scroll + lazy loading.
7. Crop image + multipart upload.
8. Image fallback + zoom preview.
9. Admin indexing dashboard/jobs.
10. Responsive UI bằng Tailwind.

---

## 26. Ví dụ code thực tế rút gọn

### QueryClient setup

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

Code này cấu hình mặc định cho React Query: không tự refetch khi focus lại tab và retry một lần nếu lỗi mạng.

### Axios interceptor token

```js
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  const isAuthEndpoint = requestUrl.startsWith("/auth/login") || requestUrl.startsWith("/auth/register");

  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
```

Code này giúp mọi service không phải tự gắn token, giảm lặp và tập trung auth request handling.

### Infinite search query

```jsx
const searchQuery = useInfiniteQuery({
  queryKey: ["search-results", type, query, mode, size, imageFile?.name, imageId],
  initialPageParam: initialPage,
  queryFn: ({ pageParam }) => searchByText({ query, mode, page: pageParam, size }),
  getNextPageParam: (lastPageRaw) => {
    const lastPage = normalizeSearchResponse(lastPageRaw);
    const current = lastPage.pageNumber + 1;
    return current < lastPage.totalPages ? current + 1 : undefined;
  },
});
```

Code này quản lý danh sách kết quả theo nhiều page và chỉ có next page khi backend còn trang tiếp theo.

### Image fallback

```jsx
const loadBlobFallback = () => {
  if (!imageId) {
    setFailedSrc(resolvedSrc);
    return;
  }

  getImageBlob(imageId).then((blob) => {
    const objectUrl = URL.createObjectURL(blob);
    setBlobFallback({ url: objectUrl, source: resolvedSrc });
  });
};
```

Code này xử lý khi URL ảnh ban đầu lỗi bằng cách lấy blob qua endpoint ảnh.

### Crop ảnh bằng canvas

```jsx
ctx.drawImage(
  image,
  completedCrop.x * scaleX,
  completedCrop.y * scaleY,
  completedCrop.width * scaleX,
  completedCrop.height * scaleY,
  0,
  0,
  canvas.width,
  canvas.height
);

canvas.toBlob((blob) => {
  const file = new File([blob], `cropped_${Date.now()}.jpeg`, { type: "image/jpeg" });
  onCropComplete(file);
}, "image/jpeg");
```

Code này biến vùng crop thành file mới để gửi API image search.

### Upload batching

```js
for (let startIndex = 0; startIndex < files.length; startIndex += 50) {
  const chunk = files.slice(startIndex, startIndex + 50);
  const formData = new FormData();
  chunk.forEach((file) => formData.append("files", file));
  await apiClient.post("/images/upload", formData);
}
```

Code này giải quyết việc admin chọn nhiều ảnh bằng cách chia request nhỏ hơn.

---

## 27. Quy tắc chống bịa thông tin đã áp dụng

- Không ghi số liệu performance như tăng bao nhiêu phần trăm vì code không chứng minh.
- Không nói có virtualization vì không có dependency/code liên quan.
- Không nói có TypeScript vì source là JS/JSX.
- Không nói có debounce/throttle vì không thấy code.
- Không nói OCR đã bật đầy đủ vì tab OCR đang bị comment trong `VisualSearchPanel`.
- Không phân tích backend/database/Docker theo yêu cầu.
- Những phần chưa triển khai được ghi rõ ở mục hạn chế/cải thiện.

