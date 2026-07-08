export const SearchMethodCard = ({
    iconBackgroundClassName,
    iconClassName,
    Icon,
    title,
    titleWrapperClassName,
    description,
    descriptionWrapperClassName,
}) => {
    return (
        <div className="flex-1 h-56 relative bg-white rounded-2xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-gray-300/20">
            <div className="w-14 h-16 pb-4 left-[164px] top-[25px] absolute inline-flex flex-col justify-start items-start">
                <div className={`size-14 ${iconBackgroundClassName} rounded-full inline-flex justify-center items-center`}>
                    <div className="size- inline-flex flex-col justify-start items-center">
                        <Icon className={`size-6 ${iconClassName}`} />
                    </div>
                </div>
            </div>
            <div className={`size- pb-2 ${titleWrapperClassName} absolute inline-flex flex-col justify-start items-start`}>
                <div className="size- flex flex-col justify-start items-center">
                    <div className="text-center justify-center text-zinc-900 text-lg font-semibold font-['Inter'] leading-7">{title}</div>
                </div>
            </div>
            <div className={`size- ${descriptionWrapperClassName} absolute inline-flex flex-col justify-start items-center`}>
                <div className="text-center justify-center text-gray-700 text-sm font-normal font-['Inter'] leading-6">{description}</div>
            </div>
        </div>
    )
}
