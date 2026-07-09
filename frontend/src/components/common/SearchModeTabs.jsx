export default function SearchModeTabs({ activeMode, modes, onChange }) {
  return (
    <div className="grid grid-cols-1 border-b border-gray-300/30 sm:grid-cols-3">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = mode.id === activeMode.id;

        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode)}
            className={`flex min-h-14 items-center justify-center gap-2 border-b-2 px-4 py-4 text-sm font-medium tracking-tight transition ${
              isActive
                ? "border-indigo-600 bg-indigo-600/5 text-indigo-600"
                : "border-transparent text-gray-700 hover:bg-gray-50 hover:text-indigo-600"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
