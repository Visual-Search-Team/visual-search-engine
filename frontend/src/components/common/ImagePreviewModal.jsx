import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiZoomIn, FiZoomOut, FiMaximize } from 'react-icons/fi';
import { ImageWithFallback } from './ImageWithFallback';
import { resolveImageUrl } from '../../utils/imageUrl';

export const ImagePreviewModal = ({ imageId, imageUrl, onClose }) => {
    const [scale, setScale] = useState(1);
    const [origin, setOrigin] = useState({ x: 50, y: 50 });
    const containerRef = useRef(null);

    const finalImageUrl = imageUrl || resolveImageUrl(undefined, imageId);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 4));

    const handleZoomOut = () => {
        setScale((s) => {
            const newScale = Math.max(s - 0.5, 1);
            if (newScale === 1) {
                setOrigin({ x: 50, y: 50 });
            }
            return newScale;
        });
    };

    const handleReset = () => {
        setScale(1);
        setOrigin({ x: 50, y: 50 });
    };

    const handleWheel = (e) => {
        if (e.deltaY < 0) {
            handleZoomIn();
        } else {
            handleZoomOut();
        }
    };

    const handlePointerMove = (e) => {
        if (scale <= 1 || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        setOrigin({ x, y });
    };

    const handleClick = (e) => {
        e.stopPropagation();

        if (scale > 1) {
            handleReset();
        } else {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();

                let clientX = e.clientX;
                let clientY = e.clientY;
                if (e.touches && e.touches.length > 0) {
                    clientX = e.touches[0].clientX;
                    clientY = e.touches[0].clientY;
                }

                const x = ((clientX - rect.left) / rect.width) * 100;
                const y = ((clientY - rect.top) / rect.height) * 100;
                setOrigin({ x, y });
            }
            setScale(2.5);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity"
            onClick={onClose}
        >
            <button
                onClick={onClose}
                className="absolute right-4 top-4 md:right-6 md:top-6 z-50 rounded-full bg-black/50 p-2 text-white hover:bg-black/80 hover:text-rose-400 transition cursor-pointer"
            >
                <FiX className="size-6 md:size-8" />
            </button>

            <div
                className="absolute bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 md:gap-6 rounded-full bg-black/60 px-4 md:px-6 py-2 md:py-3 shadow-lg backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={handleZoomOut} className="text-white hover:text-indigo-400 transition cursor-pointer" title="Thu nhỏ">
                    <FiZoomOut className="size-5 md:size-6" />
                </button>
                <button onClick={handleReset} className="text-white hover:text-indigo-400 transition cursor-pointer" title="Kích thước gốc">
                    <FiMaximize className="size-4 md:size-5" />
                </button>
                <button onClick={handleZoomIn} className="text-white hover:text-indigo-400 transition cursor-pointer" title="Phóng to">
                    <FiZoomIn className="size-5 md:size-6" />
                </button>
            </div>


            <div
                ref={containerRef}
                className={`relative w-[95vw] md:w-[80vw] lg:w-[50vw] max-w-5xl h-[70vh] lg:h-[80vh] bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center ${scale > 1
                    ? "cursor-zoom-out"
                    : "cursor-zoom-in"}`}
                onClick={handleClick}
                onWheel={handleWheel}
                onMouseMove={handlePointerMove}
                onTouchMove={handlePointerMove}
            >
                <ImageWithFallback
                    src={finalImageUrl}
                    alt={`Preview ${imageId}`}
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none select-none"
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: `${origin.x}% ${origin.y}%`,
                        transition: 'transform 0.2s ease-out',
                        imageRendering: scale > 1 ? 'crisp-edges' : 'auto'
                    }}
                />
            </div>
        </div>
    );
};