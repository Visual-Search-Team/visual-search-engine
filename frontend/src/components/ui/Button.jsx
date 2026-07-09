export const Button = ({ children, onClick, className = '', type = 'button' }) => {
    return (
        <button
            type={type}
            onClick={onClick}
            className={`px-4 py-2 rounded-md ${className}`}
        >
            <div className="size- inline-flex justify-start items-center gap-[0px]">
                <div className="size- px-4 py-2 bg-indigo-700 hover:bg-lime-300 rounded-full inline-flex flex-col justify-center items-center">
                    <div className="text-center justify-center text-white text-sm font-medium font-['Inter'] leading-5 tracking-tight">{children}</div>
                </div>
            </div>
        </button>
    );
};