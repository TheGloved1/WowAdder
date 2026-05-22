import type { CategoryOption } from "../services/curseforge";

interface CategorySidebarProps {
  categories: CategoryOption[];
  selectedCategoryId: number;
  onCategoryChange: (id: number) => void;
}

export default function CategorySidebar({
  categories,
  selectedCategoryId,
  onCategoryChange,
}: CategorySidebarProps) {
  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
          Categories
        </h2>
        <nav className="space-y-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                cat.id === selectedCategoryId
                  ? "bg-blue-600/20 text-blue-400 font-medium"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}