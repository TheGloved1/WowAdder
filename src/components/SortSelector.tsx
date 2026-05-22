export interface SortOption {
  label: string;
  field: number;
  order: "asc" | "desc";
}

export const SORT_OPTIONS: SortOption[] = [
  { label: "Most Downloads", field: 6, order: "desc" },
  { label: "Most Popular", field: 2, order: "desc" },
  { label: "Recently Updated", field: 3, order: "desc" },
  { label: "Name (A-Z)", field: 4, order: "asc" },
  { label: "Name (Z-A)", field: 4, order: "desc" },
];

interface SortSelectorProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
}

export default function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="text-xs text-gray-500 shrink-0">Sort:</label>
      <select
        value={SORT_OPTIONS.findIndex(
          (o) => o.field === value.field && o.order === value.order
        )}
        onChange={(e) => onChange(SORT_OPTIONS[Number(e.target.value)])}
        className="appearance-none bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
      >
        {SORT_OPTIONS.map((opt, i) => (
          <option key={i} value={i}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}