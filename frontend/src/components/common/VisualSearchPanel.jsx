import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaAlignLeft, FaFont, FaImage, FaSearch, FaUpload } from 'react-icons/fa';
import { MAX_FILE_SIZE } from '../../config/constants';
import SearchModeTabs from './SearchModeTabs';

const searchModes = [
  {
    id: 'image',
    label: 'Tìm bằng hình ảnh',
    icon: FaImage,
  },
  {
    id: 'description',
    label: 'Tìm bằng mô tả',
    icon: FaAlignLeft,
    placeholder: 'Nhập mô tả hình ảnh bạn muốn tìm...',
  },
  {
    id: 'ocr',
    label: 'Tìm chữ trong ảnh',
    icon: FaFont,
    placeholder: 'Nhập nội dung chữ xuất hiện trong ảnh...',
  },
];

export default function VisualSearchPanel() {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState(searchModes[0]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [query, setQuery] = useState('');
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef('');

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const updateSelectedFile = (file) => {
    const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);

    if (!isValidType) {
      setFileError('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError('Ảnh cần nhỏ hơn hoặc bằng 10MB.');
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setPreviewUrl(nextPreviewUrl);
    setSelectedFile(file);
    setFileError('');
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (file) {
      updateSelectedFile(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file) {
      updateSelectedFile(file);
    }
  };

  const handleTabChange = (mode) => {
    setActiveMode(mode);
    setQuery('');
  };

  const handleImageSearch = () => {
    if (!selectedFile) {
      setFileError('Vui lòng chọn ảnh trước khi tìm kiếm.');
      return;
    }

    navigate('/search-result?type=image&page=0&size=20', {
      state: {
        type: 'image',
        imageFile: selectedFile,
      },
    });
  };

  const handleTextSearch = () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    const mode = activeMode.id === 'ocr' ? 'OCR' : 'SEMANTIC';
    const searchParams = new URLSearchParams({
      type: 'text',
      q: trimmedQuery,
      mode,
      page: '0',
      size: '20',
    });

    navigate(`/search-result?${searchParams.toString()}`, {
      state: {
        type: 'text',
        query: trimmedQuery,
        mode,
      },
    });
  };

  const isImageMode = activeMode.id === 'image';

  return (
    <section className="w-full max-w-[896px] overflow-hidden rounded-2xl bg-white pb-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-gray-300/30">
      <SearchModeTabs
        activeMode={activeMode}
        modes={searchModes}
        onChange={handleTabChange}
      />

      <div className="px-4 pt-8 sm:px-8">
        {isImageMode ? (
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-gray-50 px-4 py-16 text-center outline outline-2 outline-offset-[-2px] outline-indigo-700/20"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Ảnh đã chọn"
                className="mb-5 h-36 w-36 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-700/10 text-indigo-700">
                <FaUpload className="h-6 w-6" />
              </div>
            )}

            <h2 className="text-lg font-semibold leading-7 text-zinc-900">
              Kéo thả ảnh vào đây hoặc chọn ảnh từ máy
            </h2>
            <p className="mt-2 text-xs leading-4 text-gray-700">
              Hỗ trợ JPG, PNG, WebP. Tối đa 10MB.
            </p>

            {selectedFile && (
              <p className="mt-3 max-w-full truncate text-sm font-medium text-indigo-700">
                {selectedFile.name}
              </p>
            )}

            {fileError && (
              <p className="mt-3 text-sm font-medium text-red-600">
                {fileError}
              </p>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 rounded-full bg-indigo-700 px-6 py-2.5 text-sm font-medium tracking-tight text-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] transition hover:bg-indigo-800"
            >
              Chọn tệp
            </button>

            {selectedFile && (
              <button
                type="button"
                onClick={handleImageSearch}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-indigo-700 px-6 py-2.5 text-sm font-medium tracking-tight text-indigo-700 transition hover:bg-indigo-50"
              >
                <FaSearch className="h-4 w-4" />
                Tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-50 p-4 outline outline-2 outline-offset-[-2px] outline-indigo-700/20 sm:p-6">
            <label htmlFor="visual-search-query" className="mb-3 block text-sm font-medium text-gray-800">
              {activeMode.label}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="visual-search-query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={activeMode.placeholder}
                className="min-h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              />
              <button
                type="button"
                onClick={handleTextSearch}
                disabled={!query.trim()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-5 text-sm font-medium text-white transition hover:bg-indigo-800"
              >
                <FaSearch className="h-4 w-4" />
                Tìm kiếm
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
