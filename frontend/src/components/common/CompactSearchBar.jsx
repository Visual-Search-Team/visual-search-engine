import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaAlignLeft, FaFont, FaImage, FaSearch, FaUpload } from 'react-icons/fa';
import { searchStore } from '../../utils/searchStore';

export const CompactSearchBar = ({className = "" }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Khởi tạo tab dựa trên URL params hiện tại để đồng bộ UI
  const initialMode = searchParams.get('mode') === 'OCR' ? 'ocr' 
                    : searchParams.get('type') === 'text' ? 'description' 
                    : 'image';

  const [activeMode, setActiveMode] = useState(initialMode);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const fileInputRef = useRef(null);

  const handleTextSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const mode = activeMode === 'ocr' ? 'OCR' : 'SEMANTIC';
    navigate(`/search-result?type=text&q=${encodeURIComponent(query.trim())}&mode=${mode}&page=1&size=20`, { replace: true });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      searchStore.imageFile = file;
      navigate('/search-result?type=image&page=1&size=20', { replace: true });
    }
  };

  return (
    <div className={`sticky top-0 z-10 mb-6 bg-slate-50/80 p-4 pt-6 backdrop-blur-md ${className}`}>
      <div className="mx-auto flex w-full flex-col items-center gap-2 md:flex-row md:rounded-full md:border md:border-zinc-300 md:bg-white md:p-1 md:shadow-sm">
        
        {/* Nhóm nút chọn chế độ */}
        <div className="flex w-full shrink-0 gap-1 rounded-full bg-zinc-100 p-1 md:w-auto md:bg-transparent md:p-0">
          {[
            { id: 'image', icon: FaImage, label: 'Ảnh' },
            { id: 'description', icon: FaAlignLeft, label: 'Mô tả' },
            { id: 'ocr', icon: FaFont, label: 'Chữ (OCR)' }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeMode === mode.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-600 hover:bg-zinc-200 md:hover:bg-zinc-100'
              }`}
            >
              <mode.icon className="size-3.5" />
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Khu vực Input */}
        <div className="flex w-full flex-1 items-center px-2">
          {activeMode === 'image' ? (
            <div className="flex w-full items-center justify-between gap-3 px-2 py-1">
              <span className="text-sm text-zinc-500 line-clamp-1">
                {searchStore.imageFile ? `Đang tìm: ${searchStore.imageFile.name}` : 'Chọn ảnh mới để tìm kiếm...'}
              </span>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 cursor-pointer rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
              >
                <FaUpload className="mr-2 inline size-3" /> Tải ảnh lên
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>
          ) : (
            <form onSubmit={handleTextSearch} className="flex w-full items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeMode === 'ocr' ? "Nhập chữ có trong ảnh..." : "Nhập mô tả ảnh..."}
                className="w-full border-none bg-transparent px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
              />
              <button 
                type="submit"
                className="flex size-9 cursor-pointer shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700 md:size-10"
              >
                <FaSearch className="size-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};