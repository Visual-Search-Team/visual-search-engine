# Hướng dẫn chạy Frontend trên máy cá nhân

Tài liệu này dùng cho phần **Frontend React + Vite**. Hiện tại frontend chưa cần chạy bằng Docker, có thể chạy trực tiếp trên máy cá nhân bằng `pnpm`.

## 1. Yêu cầu trước khi chạy

Cần có:

- Node.js
- pnpm
- Git

Khuyến nghị:

- Node.js từ bản 20 trở lên
- pnpm từ bản 9 trở lên

## 2. Kiểm tra máy đã cài đủ chưa

Mở terminal hoặc PowerShell rồi chạy:

```bash
node -v
```

Nếu có kết quả kiểu `v20.x.x` hoặc cao hơn là đã có Node.js.

Kiểm tra npm:

```bash
npm -v
```

Kiểm tra pnpm:

```bash
pnpm -v
```

Kiểm tra Git:

```bash
git --version
```

Nếu lệnh nào báo lỗi kiểu `command not found`, `not recognized`, hoặc không hiện version thì máy chưa có công cụ đó.

## 3. Cài Node.js nếu chưa có

Tải Node.js bản LTS tại:

```text
https://nodejs.org/
```

Sau khi cài xong, đóng terminal cũ và mở terminal mới, rồi kiểm tra lại:

```bash
node -v
npm -v
```

## 4. Cài pnpm nếu chưa có

Nếu máy đã có Node.js nhưng chưa có pnpm, chạy:

```bash
npm install -g pnpm
```

Sau đó kiểm tra:

```bash
pnpm -v
```

Nếu dùng Windows và gặp lỗi quyền khi cài global package, hãy mở PowerShell bằng quyền Administrator rồi chạy lại lệnh trên.

## 5. Clone project

Nếu chưa có source code trên máy:

```bash
git clone <URL_REPOSITORY>
```

Sau đó đi vào thư mục frontend:

```bash
cd visual-search-engine/frontend
```

Nếu đã có project sẵn trên máy thì chỉ cần mở terminal tại thư mục:

```bash
visual-search-engine/frontend
```

## 6. Kiểm tra thư viện đã được cài chưa

Trong thư mục `visual-search-engine/frontend`, kiểm tra có thư mục `node_modules` chưa.

Trên Windows PowerShell:

```powershell
Test-Path node_modules
```

Nếu kết quả là:

- `True`: đã có thư viện.
- `False`: chưa có thư viện, cần cài bằng `pnpm install`.

Có thể kiểm tra thêm các package chính:

```bash
pnpm list react vite axios react-router-dom @tanstack/react-query react-icons tailwindcss
```

Nếu package bị thiếu hoặc terminal báo lỗi dependency, chạy cài lại:

```bash
pnpm install
```

## 7. Cài thư viện frontend

Chạy trong thư mục `visual-search-engine/frontend`:

```bash
pnpm install
```

Lệnh này sẽ đọc `package.json` và `pnpm-lock.yaml` để cài đúng các thư viện của dự án.

Không nên dùng lẫn `npm install` và `pnpm install` trong cùng project để tránh lệch lockfile.

## 8. Cấu hình API backend

Nếu muốn gọi backend local, tạo file `.env` trong thư mục:

```text
visual-search-engine/frontend/.env
```

Nội dung:

```env
VITE_API_BASE_URL=http://localhost:8080/visual-search/v1
```

Nếu chưa có backend hoặc backend/AI chưa hoàn thành, frontend hiện có mock data cho trang kết quả tìm kiếm. Khi dùng mock, giao diện vẫn xem được mà chưa cần backend trả dữ liệu thật.

## 9. Chạy frontend ở môi trường dev

Trong thư mục `visual-search-engine/frontend`, chạy:

```bash
pnpm dev
```

Sau khi chạy thành công, terminal sẽ hiện URL dạng:

```text
http://localhost:5173/
```

Mở URL đó trên trình duyệt để xem giao diện.

Nếu port `5173` đang bận, Vite có thể tự chuyển sang port khác, ví dụ:

```text
http://localhost:5174/
```

Hãy mở đúng URL mà terminal hiển thị.

## 10. Kiểm tra lỗi code trước khi push

Chạy lint:

```bash
pnpm lint
```

Nếu không có lỗi, terminal sẽ kết thúc bình thường.

Chạy build:

```bash
pnpm build
```

Nếu build thành công, frontend đã sẵn sàng để review hoặc push code.

## 11. Preview bản build

Sau khi chạy:

```bash
pnpm build
```

có thể preview bản production bằng:

```bash
pnpm preview
```

Terminal sẽ hiện URL preview, thường là:

```text
http://localhost:4173/
```

## 12. Một số lỗi thường gặp

### Lỗi thiếu package

Nếu gặp lỗi dạng `Cannot find module` hoặc `Failed to resolve import`, chạy:

```bash
pnpm install
```

Sau đó chạy lại:

```bash
pnpm dev
```

### Lỗi pnpm chưa được nhận diện

Nếu chạy `pnpm -v` bị lỗi, cài pnpm:

```bash
npm install -g pnpm
```

Rồi mở terminal mới và kiểm tra lại:

```bash
pnpm -v
```

### Lỗi gọi API backend

Kiểm tra file `.env` đã có đúng chưa:

```env
VITE_API_BASE_URL=http://localhost:8080/visual-search/v1
```

Sau khi sửa `.env`, cần tắt dev server và chạy lại:

```bash
pnpm dev
```

### Lỗi token hoặc bị chuyển về trang login

Frontend dùng JWT lưu trong `localStorage`. Nếu token cũ bị lỗi hoặc hết hạn, vào trình duyệt và xóa localStorage của trang web, sau đó đăng nhập lại.

## 13. Tóm tắt lệnh chạy nhanh

```bash
cd visual-search-engine/frontend
pnpm install
pnpm dev
```

Trước khi push code:

```bash
pnpm lint
pnpm build
```
