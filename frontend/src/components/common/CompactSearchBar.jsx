import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaFont, FaImage, FaSearch, FaTimes, FaMicrophone } from 'react-icons/fa';
import { searchStore } from '../../utils/searchStore';
import CropModal from './CropModal'; 

const MAX_FILE_SIZE = 10 * 1024 * 1024; 

export const CompactSearchBar = ({ className = "" }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const currentType = searchParams.get('type') || 'text';
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [selectedFile, setSelectedFile] = useState(
    currentType === 'image' || currentType === 'composed' ? searchStore.imageFile : null
  );

  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef(null);

  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState(null);
  const [tempOriginalFile, setTempOriginalFile] = useState(null);
  const [fileError, setFileError] = useState('');

  const hasImage = !!selectedFile;
  const hasText = !!query.trim();
  const canSearch = hasImage || hasText;

  const getSearchMode = () => {
    if (hasImage && hasText) return 'composed';
    if (hasImage) return 'image';
    if (hasText) return 'semantic';
    return null;
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
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
      navigate(`/search-result?type=text&q=${encodeURIComponent(query.trim())}&mode=SEMANTIC&page=1&size=20`, {
        replace: true,
      });
    }
  };

  // Voice Search (Web Speech API)
  const handleVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      setQuery(event.results[0][0].transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
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

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      updateSelectedFile(file);
    }
  };

  // Hoàn tất/Hủy Crop
  const handleCropComplete = (croppedFile) => {
    setShowCropModal(false);
    if (tempImageUrl) {
      URL.revokeObjectURL(tempImageUrl);
    }
    setTempImageUrl(null);

    setSelectedFile(croppedFile);
    searchStore.imageFile = croppedFile;

    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
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

  const handleRemoveImage = () => {
    setSelectedFile(null);
    searchStore.imageFile = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={`sticky top-0 z-10 w-full bg-slate-50/80 p-3 sm:p-4 md:pt-6 backdrop-blur-md ${className}`}>
      <div className="mx-auto w-full max-w-3xl relative">
        <form 
          onSubmit={handleSearch} 
          className="flex w-full items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 shadow-sm transition-shadow hover:shadow-md focus-within:shadow-md md:px-4 md:py-3"
        >
          <button 
            type="submit"
            disabled={!canSearch}
            className="flex shrink-0 items-center justify-center p-1 text-gray-500 hover:text-indigo-600 disabled:opacity-50"
            title="Tìm kiếm"
          >
            <FaSearch className="size-4 md:size-5" />
          </button>

          {/* Hiển thị ảnh đã chọn nếu có */}
          {selectedFile && (
            <div className="flex shrink-0 items-center gap-2 rounded-full bg-indigo-50 px-2.5 py-1.5 ml-1">
              <FaImage className="h-3.5 w-3.5 text-indigo-600" />
              <span className="max-w-[80px] sm:max-w-[120px] truncate text-xs font-medium text-indigo-700">
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
          )}

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hasImage ? "Thêm mô tả bổ sung..." : "Nhập mô tả để tìm kiếm..."}
            className="flex-1 w-full bg-transparent px-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none md:text-base"
          />

          <div className="flex shrink-0 items-center gap-1 md:gap-2 border-l pl-2 md:pl-3 border-gray-200">


            {/* Voice Search */}
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`group relative flex cursor-pointer items-center justify-center rounded-full p-2 transition-colors ${
                isListening ? 'bg-red-100 text-red-600' : 'text-gray-500 hover:bg-gray-100 hover:text-indigo-600'
              }`}
              title="Tìm bằng giọng nói"
            >
              <FaMicrophone className={`size-4 md:size-5 ${isListening ? 'animate-pulse' : ''}`} />
            </button>

            {/* Image Search Button */}
            {!selectedFile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative flex cursor-pointer items-center justify-center rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-indigo-600"
                title="Tìm bằng hình ảnh"
              >
                <FaImage className="size-4 md:size-5" />
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg, image/png, image/webp"
              onChange={handleImageUpload}
            />
          </div>
        </form>

        {fileError && (
          <p className="absolute -bottom-6 left-4 text-xs font-medium text-red-500">
            {fileError}
          </p>
        )}
      </div>

      {/* Modal Crop */}
      {showCropModal && tempImageUrl && (
        <CropModal
          imageUrl={tempImageUrl}
          onCancel={handleCancelCrop}
          originalFile={tempOriginalFile}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};