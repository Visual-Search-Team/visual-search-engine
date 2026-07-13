import { MAX_FILE_SIZE } from '../config/constants';

// # Hàm check size < 10MB, check đuôi ảnh
export function validateFile(file) {
  const validExtensions = ['image/jpeg', 'image/png', 'image/webp'];
  const isValidSize = file.size < MAX_FILE_SIZE;
  const isValidType = validExtensions.includes(file.type);

  return isValidSize && isValidType;
}
