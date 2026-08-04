import { useEffect, useState } from "react";

export const SmoothProgressBar = ({ jobId, actualProgress, status }) => {
  const [displayProgress, setDisplayProgress] = useState(actualProgress || 0);

  useEffect(() => {
    if (actualProgress >= 100 || status === "COMPLETED") {
      setDisplayProgress(100);
      return;
    }

    const interval = setInterval(() => {
      setDisplayProgress((prev) => {

        if (status === "COMPLETED") return 100;

        const diff = actualProgress - prev;
        
        if (diff > 0) {
          return prev + Math.max(diff / 10, 0.5); 
        } else {
          const maxFakeProgress = Math.min(actualProgress + 3, 99);
          
          if (prev < maxFakeProgress) {
            return prev + 0.02; 
          }
          return prev;
        }
      });
    }, 50); 

    return () => clearInterval(interval);
  }, [actualProgress, status]);

  const renderPercentage = status === "COMPLETED" 
    ? 100 
    : Math.floor(Math.min(displayProgress, 99));

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-800">
          Tiến độ Indexing - Job #{jobId}
        </span>
        <span className="text-sm font-bold text-indigo-600">
          {renderPercentage}%
        </span>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className="absolute bottom-0 left-0 top-0 rounded-full bg-indigo-600 transition-all duration-75 ease-linear"
          style={{ width: `${status === "COMPLETED" ? 100 : Math.min(displayProgress, 99)}%` }}
        />
      </div>
    </div>
  );
};