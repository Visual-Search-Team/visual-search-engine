import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaAlignLeft, FaFont, FaImage, FaSearch, FaUpload, FaTimes } from 'react-icons/fa';
import { searchStore } from '../../utils/searchStore';

export const CompactSearchBar = ({className = "" }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const currentType = searchParams.get('type') || 'text';
  const initialQuery = searchParams.get('q') || '';
  const initialIsOcr = searchParams.get('mode') === 'OCR';

  const [query, setQuery] = useState(initialQuery);
  const [selectedFile, setSelectedFile] = useState(
    currentType === 'image' || currentType === 'composed' ? searchStore.imageFile : null
  );
  const [isOcrMode, setIsOcrMode] = useState(initialIsOcr);
  const fileInputRef = useRef(null);

  const hasImage = !!selectedFile;
  const hasText = !!query.trim();
  const canSearch = hasImage || hasText;

  const getSearchMode = () => {
    if (hasImage && hasText) return 'composed';
    if (hasImage) return 'image';
    if (hasText) return isOcrMode ? 'ocr' : 'semantic';
    return null;
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const mode = getSearchMode();
    if (!mode) return;

    if (mode === 'composed') {
      searchStore.imageFile = selectedFile;
      navigate(`/search-result?type=composed&q=${encodeURIComponent(query.trim())}&page=1&size=20`, {
        state: { type: 'composed', imageFile: selectedFile, query: query.trim() },
        replace: true,
      });
    } else if (mode === 'image') {
      searchStore.imageFile = selectedFile;
      navigate('/search-result?type=image&page=1&size=20', {
        state: { type: 'image', imageFile: selectedFile },
        replace: true,
      });
    } else {
      const textMode = mode === 'ocr' ? 'OCR' : 'SEMANTIC';
      navigate(`/search-result?type=text&q=${encodeURIComponent(query.trim())}&mode=${textMode}&page=1&size=20`, {
        replace: true,
      });
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsOcrMode(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    searchStore.imageFile = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={`sticky top-0 z-10 mb-6 bg-slate-50/80 p-4 pt-6 backdrop-blur-md ${className}`}>
      <form
        onSubmit={handleSearch}
        className="mx-auto flex w-full flex-col items-center gap-2 md:flex-row md:rounded-full md:border md:border-zinc-300 md:bg-white md:p-1 md:shadow-sm"
      >
        {/* Nút chọn ảnh */}
        <div className="flex shrink-0 items-center gap-2 px-2">
          {selectedFile ? (
            <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5">
              <FaImage className="h-3.5 w-3.5 text-indigo-600" />
              <span className="max-w-[100px] truncate text-xs font-medium text-indigo-700">
                {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="cursor-pointer text-indigo-400 hover:text-red-500"
              >
                <FaTimes className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <FaUpload className="h-3 w-3" />
              Ảnh
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageUpload}
          />
        </div>

        {/* Ô nhập text */}
        <div className="flex w-full flex-1 items-center gap-2 px-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hasImage ? "Thêm mô tả bổ sung..." : "Nhập mô tả ảnh..."}
            className="w-full border-none bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
          />

          {/* OCR toggle — chỉ khi không có ảnh */}
          {!hasImage && (
            <button
              type="button"
              onClick={() => setIsOcrMode(!isOcrMode)}
              className={`flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                isOcrMode
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-500 hover:bg-zinc-100'
              }`}
              title="Tìm chữ trong ảnh (OCR)"
            >
              <FaFont className="h-3 w-3" />
              <span className="hidden sm:inline">OCR</span>
            </button>
          )}

          <button
            type="submit"
            disabled={!canSearch}
            className="flex size-9 cursor-pointer shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:opacity-50 md:size-10"
          >
            <FaSearch className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
};