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
      <div className="sticky top-4 bg-wow-panel border border-wow-border-light rounded-sm relative
        before:pointer-events-none before:absolute before:inset-[1px]
        before:border before:border-wow-border-gold/20 before:rounded-sm">
        <h2 className="text-xs font-wow-heading tracking-widest uppercase text-wow-gold px-4 py-2.5 border-b border-wow-border-light">
          Categories
        </h2>
        <nav className="p-1.5 space-y-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`w-full text-left px-3 py-1.5 text-sm rounded-sm transition-all duration-150 ${
                cat.id === selectedCategoryId
                  ? "text-wow-gold bg-wow-border-gold/10 border-l-2 border-wow-gold pl-[10px]"
                  : "text-wow-text-dim hover:text-wow-text hover:bg-wow-panel-hover"
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
