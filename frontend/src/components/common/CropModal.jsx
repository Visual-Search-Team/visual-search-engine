import { useRef, useState } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { FaTimes } from 'react-icons/fa';

export default function CropModal({ imageUrl, originalFile, onCancel, onCropComplete }) {
    const [crop, setCrop] = useState(); 
    const [completedCrop, setCompletedCrop] = useState(null); 
    const [isProcessing, setIsProcessing] = useState(false);
    const imgRef = useRef(null);

    const handleConfirm = async () => {
        if (!completedCrop || !completedCrop.width || !completedCrop.height) {
            onCropComplete(originalFile);
            return; 
        }

        setIsProcessing(true);
        try {
            const image = imgRef.current;
            const canvas = document.createElement('canvas');

            const scaleX = image.naturalWidth / image.width;
            const scaleY = image.naturalHeight / image.height;

            canvas.width = Math.floor(completedCrop.width * scaleX);
            canvas.height = Math.floor(completedCrop.height * scaleY);

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Vẽ vùng ảnh đã chọn lên canvas
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

            // Xuất canvas thành file
            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error('Canvas is empty');
                    return;
                }
                const uniqueFileName = `cropped_${Date.now()}.jpeg`;
                const file = new File([blob], uniqueFileName, { type: "image/jpeg" });
                onCropComplete(file);
            }, 'image/jpeg');

        } catch (error) {
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="relative flex w-full max-w-4xl flex-col rounded-2xl bg-white p-6 shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Cắt vùng ảnh cần tìm kiếm</h3>
                    <button onClick={onCancel} className="text-gray-500 cursor-pointer hover:text-red-500 transition">
                        <FaTimes className="h-6 w-6" />
                    </button>
                </div>

                {/* Khu vực Crop */}
                <div className="flex max-h-[60vh] justify-center overflow-auto bg-slate-100 p-2 rounded-xl">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                    >
                        <img
                            ref={imgRef}
                            src={imageUrl}
                            alt="Crop area"
                            className="max-h-[55vh] w-auto object-contain"
                        />
                    </ReactCrop>
                </div>

                <p className="mt-4 text-center text-sm font-bold text-indigo-600">
                    * Kéo thả khu vực bạn muốn tìm
                </p>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="rounded-full cursor-pointer px-5 py-2 text-sm font-medium text-gray-600 hover:bg-red-500 transition hover:text-white"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="rounded-full cursor-pointer bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400"
                    >
                        {isProcessing ? 'Đang xử lý...' : (completedCrop?.width ? 'Cắt & Tìm kiếm' : 'Tìm bằng ảnh gốc')}
                    </button>
                </div>
            </div>
        </div>
    );
}