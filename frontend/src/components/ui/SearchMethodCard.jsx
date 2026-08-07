export const SearchMethodCard = ({
  iconBackgroundClassName,
  iconClassName,
  Icon,
  title,
  description,
}) => {
  return (
    <div className="group flex flex-1 flex-col items-center text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-500/5">
      
      <div
        className={`w-16 h-16 mb-6 ${iconBackgroundClassName} rounded-2xl flex justify-center items-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
      >
        <Icon className={`w-7 h-7 ${iconClassName}`} />
      </div>
      
      <div className="mb-3 text-zinc-900 text-xl font-bold font-['Inter'] transition-colors group-hover:text-indigo-600">
        {title}
      </div>
      
      <div className="text-gray-500 text-sm font-normal font-['Inter'] leading-relaxed">
        {description}
      </div>
    </div>
  );
};
