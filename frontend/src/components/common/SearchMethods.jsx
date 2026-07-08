import { FaAlignLeft, FaFont, FaUpload } from "react-icons/fa";
import { SearchMethodCard } from "../ui/SearchMethodCard";

export const SearchMethods = () => {
    const searchMethods = [
        {
            iconBackgroundClassName: "bg-indigo-700/10",
            iconClassName: "text-indigo-700",
            Icon: FaUpload,
            title: "Upload ảnh",
            titleWrapperClassName: "left-[142.59px] top-[97px]",
            description: (
                <>
                    Tải lên một hình ảnh bất kỳ để tìm kiếm các hình<br />ảnh tương tự hoặc thông tin liên quan từ cơ sở dữ<br />liệu khổng lồ.
                </>
            ),
            descriptionWrapperClassName: "px-1 left-[23.83px] top-[131.75px]",
        },
        {
            iconBackgroundClassName: "bg-cyan-700/10",
            iconClassName: "text-sky-800",
            Icon: FaAlignLeft,
            title: "Mô tả nội dung",
            titleWrapperClassName: "left-[127.45px] top-[97px]",
            description: (
                <>
                    Sử dụng ngôn ngữ tự nhiên để miêu tả hình ảnh<br />bạn muốn tìm. AI sẽ hiểu ngữ cảnh và trả về kết<br />quả chính xác nhất.
                </>
            ),
            descriptionWrapperClassName: "px-2.5 left-[25.17px] top-[131.75px]",
        },
        {
            iconBackgroundClassName: "bg-indigo-500/10",
            iconClassName: "text-indigo-600",
            Icon: FaFont,
            title: "Tìm chữ trong ảnh",
            titleWrapperClassName: "left-[112.88px] top-[97px]",
            description: (
                <>
                    Trích xuất và tìm kiếm hình ảnh dựa trên văn bản<br />xuất hiện bên trong bức ảnh nhờ công nghệ OCR<br />tiên tiến.
                </>
            ),
            descriptionWrapperClassName: "px-1.5 left-[24.91px] top-[131.75px]",
        },
    ];

    return (
        <>
            <div className="w-[1200px] pt-8 inline-flex flex-col justify-start items-start">
                <div className="w-full max-w-[1280px] flex flex-col justify-start items-start gap-10">
                    <div className="self-stretch flex flex-col justify-start items-center">
                        <div className="text-center justify-center text-zinc-900 text-3xl font-semibold font-['Inter'] leading-10">Bạn có thể tìm kiếm bằng</div>
                    </div>
                    <div className="self-stretch inline-flex justify-center items-start gap-6">
                        {searchMethods.map((method) => (
                            <SearchMethodCard key={method.title} {...method} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    )
}
