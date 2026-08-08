import { FaAlignLeft, FaFont, FaUpload } from "react-icons/fa";
import { SearchMethodCard } from "../ui/SearchMethodCard";

export const SearchMethods = () => {
  const searchMethods = [
    {
      iconBackgroundClassName: "bg-indigo-700/10",
      iconClassName: "text-indigo-700",
      Icon: FaUpload,
      title: "Upload ảnh",
      description: "Tải lên một hình ảnh bất kỳ để tìm kiếm các hình ảnh tương tự hoặc thông tin liên quan từ cơ sở dữ liệu khổng lồ.",
    },
    {
      iconBackgroundClassName: "bg-cyan-700/10",
      iconClassName: "text-sky-800",
      Icon: FaAlignLeft,
      title: "Mô tả nội dung",
      description: "Sử dụng ngôn ngữ tự nhiên để miêu tả hình ảnh bạn muốn tìm. AI sẽ hiểu ngữ cảnh và trả về kết quả chính xác nhất.",
    },
    {
      iconBackgroundClassName: "bg-indigo-500/10",
      iconClassName: "text-indigo-600",
      Icon: FaFont,
      title: "Tìm chữ trong ảnh",
      description: "Trích xuất và tìm kiếm hình ảnh dựa trên văn bản xuất hiện bên trong bức ảnh nhờ công nghệ OCR tiên tiến.",
    },
  ];

  return (
    <div className="w-full max-w-[1200px] pt-8 flex flex-col justify-start items-center">
      <div className="w-full flex flex-col justify-start items-center gap-10">
        <div className="flex flex-col justify-start items-center w-full">
          <div className="text-center text-zinc-900 text-2xl md:text-3xl font-semibold font-['Inter'] leading-10">
            Bạn có thể tìm kiếm bằng
          </div>
        </div>
        {/* Khúc bẻ layout quan trọng nằm ở md:flex-row */}
        <div className="w-full flex flex-col md:flex-row justify-center items-stretch gap-6">
          {searchMethods.map((method) => (
            <SearchMethodCard key={method.title} {...method} />
          ))}
        </div>
      </div>
    </div>
  );
};