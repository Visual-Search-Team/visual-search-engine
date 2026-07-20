import { useQuery } from "@tanstack/react-query";
import { FaTimes, FaImage, FaAlignLeft, FaFont, FaClock, FaExpandArrowsAlt, FaFileAlt } from "react-icons/fa";
import { getSearchHistoryDetail } from "../../services/searchHistoryService";
import { ImageWithFallback } from "../common/ImageWithFallback";

const formatDateTime = (value) => {
    if (!value) return "Chưa có thời gian";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
};

export const SearchHistoryDetailModal = ({ isOpen, onClose, searchId }) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: ["search-history-detail", searchId],
        queryFn: () => getSearchHistoryDetail(searchId),
        enabled: !!searchId && isOpen,
    });

    if (!isOpen) return null;

    const isImageSearch = data?.searchType === "IMAGE_TO_IMAGE";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                        Chi tiết tìm kiếm
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 cursor-pointer hover:bg-red-100 hover:text-white-800 dark:hover:bg-gray-700 dark:hover:text-white rounded-full transition-colors"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="p-6">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : isError ? (
                        <div className="text-center text-red-500 py-10">
                            Đã có lỗi xảy ra khi tải dữ liệu.
                        </div>
                    ) : (
                        <div className="space-y-6">

                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 text-sm font-medium rounded-full flex items-center gap-1
                  ${isImageSearch ? 'bg-indigo-100 text-indigo-700' :
                                        data?.searchType === 'TEXT_OCR' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}
                `}>
                                    {isImageSearch ? <FaImage /> : data?.searchType === 'TEXT_OCR' ? <FaFont /> : <FaAlignLeft />}
                                    {isImageSearch ? "Tìm bằng hình ảnh" : data?.searchType === 'TEXT_OCR' ? "Text OCR" : "Text Semantic"}
                                </span>
                            </div>

                            {isImageSearch ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden flex justify-center p-4 min-h-[16rem]">
                                        <ImageWithFallback
                                            src={data.queryImageUrl || data.storagePath}
                                            imageId={data.queryImageId}
                                            alt="Search Query"
                                            className="max-h-80 object-contain rounded shadow-sm"
                                        />
                                    </div>

                                    <div className="flex flex-row justify-between items-center gap-4 w-full">
                                        <div className="flex gap-4">
                                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex items-center gap-3 inline-flex border border-gray-100 dark:border-gray-600">
                                                <FaClock className="text-gray-400" />
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Tốc độ xử lý</p>
                                                    <p className="text-sm font-medium">{data.processingTimeMs || 0} ms</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-[13px] font-extrabold text-black-500">
                                            {formatDateTime(data.createdAt)}
                                        </p>
                                    </div>

                                    {/* <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full mt-2">
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex items-center gap-3">
                                            <FaExpandArrowsAlt className="text-gray-400" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Kích thước</p>
                                                <p className="text-sm font-medium">
                                                    {data.width && data.height ? `${data.width} x ${data.height}` : "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex items-center gap-3">
                                            <FaFileAlt className="text-gray-400" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Định dạng</p>
                                                <p className="text-sm font-medium uppercase">
                                                    {data.mimeType ? data.mimeType.split('/')[1] : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex items-center gap-3">
                                            <FaClock className="text-gray-400" />
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Tốc độ xử lý</p>
                                                <p className="text-sm font-medium">{data.processingTimeMs || 0} ms</p>
                                            </div>
                                        </div>
                                    </div> */}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 w-full">
                                    <div className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 md:p-6 shadow-inner">
                                        <p className="text-sm text-gray-500 mb-3 sticky top-0">
                                            Nội dung tìm kiếm:
                                        </p>

                                        <div className="max-h-64 md:max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                            <p className="text-lg md:text-xl font-medium text-gray-800 dark:text-gray-200 italic break-words whitespace-pre-wrap leading-relaxed">
                                                {data.queryText !== "null" && data.queryText
                                                    ? `"${data.queryText}"`
                                                    : "Không có dữ liệu text"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-row justify-between items-center gap-4 w-full">
                                        <div className="flex gap-4">
                                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex items-center gap-3 inline-flex border border-gray-100 dark:border-gray-600">
                                                <FaClock className="text-gray-400" />
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Tốc độ xử lý</p>
                                                    <p className="text-sm font-medium">{data.processingTimeMs || 0} ms</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-[13px] font-extrabold text-black-500">
                                            {formatDateTime(data.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};