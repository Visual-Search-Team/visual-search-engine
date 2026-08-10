import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch, FaUpload, FaTimes, FaImage, FaFont } from 'react-icons/fa';
import { MAX_FILE_SIZE } from '../../config/constants';
import { searchStore } from '../../utils/searchStore';
import CropModal from './CropModal';


export default function VisualSearchPanel() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [query, setQuery] = useState('');


  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [tempOriginalFile, setTempOriginalFile] = useState(null);

  const fileInputRef = useRef(null);
  const previewUrlRef = useRef('');

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  // Xác định mode tự động
  const hasImage = !!selectedFile;
  const hasText = !!query.trim();
  const canSearch = hasImage || hasText;

  const getSearchMode = () => {
    if (hasImage && hasText) return 'composed';
    if (hasImage) return 'image';
    if (hasText) return 'semantic';
    return null;
  };

  const getModeLabel = () => {
    const mode = getSearchMode();
    switch (mode) {
      case 'composed': return 'Ảnh + Mô tả';
      case 'image': return 'Tìm bằng ảnh';

      case 'semantic': return 'Tìm bằng mô tả';
      default: return '';
    }
  };

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
    const tempUrl = URL.createObjectURL(file);
    setTempImageUrl(tempUrl);
    setTempOriginalFile(file);
    setShowCropModal(true);
    setFileError('');
  };

  const handleCropComplete = (croppedFile) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(croppedFile);
    previewUrlRef.current = nextPreviewUrl;

    setPreviewUrl(nextPreviewUrl);
    setSelectedFile(croppedFile);

    setShowCropModal(false);
    URL.revokeObjectURL(tempImageUrl);
    setTempImageUrl(null);


  };

  const handleCancelCrop = () => {
    setShowCropModal(false);
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl);
    }
    setTempImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      updateSelectedFile(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      updateSelectedFile(file);
    }
  };

  const handleSearch = () => {
    const mode = getSearchMode();
    if (!mode) return;

    if (mode === 'composed') {
      searchStore.imageFile = selectedFile;
      const searchParams = new URLSearchParams({
        type: 'composed',
        q: query.trim(),
        page: '1',
        size: '20',
      });
      navigate(`/search-result?${searchParams.toString()}`, {
        state: {
          type: 'composed',
          imageFile: selectedFile,
          query: query.trim(),
        },
      });
    } else if (mode === 'image') {
      searchStore.imageFile = selectedFile;
      navigate('/search-result?type=image&page=1&size=20', {
        state: {
          type: 'image',
          imageFile: selectedFile,
        },
      });
    } else {
      // semantic
      const searchParams = new URLSearchParams({
        type: 'text',
        q: query.trim(),
        mode: 'SEMANTIC',
        page: '1',
        size: '20',
      });
      navigate(`/search-result?${searchParams.toString()}`, {
        state: {
          type: 'text',
          query: query.trim(),
          mode: 'SEMANTIC',
        },
      });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSearch();
  };

  return (
    <section className="w-full max-w-[896px] overflow-hidden rounded-2xl bg-white pb-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-gray-300/30">

      {/* Modal Crop */}
      {showCropModal && tempImageUrl && (
        <CropModal
          imageUrl={tempImageUrl}
          onCancel={handleCancelCrop}
          originalFile={tempOriginalFile}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Header */}
      <div className="border-b border-gray-200/60 bg-gradient-to-r from-indigo-50/50 to-white px-4 py-4 sm:px-8">
        <h2 className="text-lg font-semibold text-zinc-900">Tìm kiếm hình ảnh</h2>
        <p className="mt-0.5 text-sm text-gray-500">Tải ảnh lên, nhập mô tả — hoặc cả hai cùng lúc.</p>
      </div>

      <div className="px-4 pt-6 sm:px-8">
        {/* Khu vực upload ảnh */}
        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className={`group flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ${
            previewUrl
              ? 'border-indigo-300 bg-indigo-50/30'
              : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {previewUrl ? (
            <div className="flex flex-col items-center gap-3">
              <div
                className="relative cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <img
                  src={previewUrl}
                  alt="Ảnh đã chọn"
                  className="h-28 w-28 rounded-xl object-cover shadow-sm ring-2 ring-indigo-200"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage();
                  }}
                  className="absolute -right-2 -top-2 cursor-pointer flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-500 shadow transition hover:bg-red-500 hover:text-white"
                >
                  <FaTimes className="h-3 w-3" />
                </button>
              </div>
              <p className="max-w-[200px] truncate text-xs font-medium text-indigo-600">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400">Click vào ảnh để chọn ảnh khác</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                <FaUpload className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  Kéo thả ảnh vào đây hoặc{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer text-indigo-600 underline underline-offset-2 hover:text-indigo-700"
                  >
                    chọn từ máy
                  </button>
                </p>
                <p className="mt-1 text-xs text-gray-400">JPG, PNG, WebP • Tối đa 10MB</p>
              </div>
            </div>
          )}

          {fileError && (
            <p className="mt-3 text-sm font-medium text-red-600">{fileError}</p>
          )}
        </div>

        {/* Ô nhập text + nút tìm kiếm */}
        <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="visual-search-query"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={hasImage ? "Thêm mô tả bổ sung (tuỳ chọn)..." : "Nhập mô tả hình ảnh bạn muốn tìm..."}
              className="min-h-12 flex-1 rounded-xl border border-gray-300 bg-white px-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
            />
            <button
              type="submit"
              disabled={!canSearch}
              className="inline-flex cursor-pointer min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-6 text-sm font-medium text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaSearch className="h-4 w-4" />
              Tìm kiếm
            </button>
          </div>


        </form>

        {/* Gợi ý mode hiện tại */}
        {canSearch && (
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              {getSearchMode() === 'composed' && <><FaImage className="h-3 w-3" /> + <FaFont className="h-3 w-3" /></>}
              {getSearchMode() === 'image' && <FaImage className="h-3 w-3" />}
              {getSearchMode() === 'semantic' && <FaFont className="h-3 w-3" />}
              {getModeLabel()}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
