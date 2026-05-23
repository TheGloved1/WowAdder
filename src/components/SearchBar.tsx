interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export default function SearchBar({ value, onChange, onSearch }: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="flex-1 max-w-xl"
    >
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wow-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search addons..."
          className="w-full pl-10 pr-4 py-2 bg-wow-panel border border-wow-border-light rounded-sm text-wow-text text-sm placeholder-wow-text-muted focus:outline-none focus:border-wow-border-gold focus:shadow-[0_0_6px_rgba(161,98,7,0.15)] transition-all"
        />
      </div>
    </form>
  );
}
