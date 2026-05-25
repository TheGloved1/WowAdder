import type { CategoryOption } from '../services/curseforge';

interface CategorySidebarProps {
  categories: CategoryOption[];
  selectedCategoryId: number;
  onCategoryChange: (id: number) => void;
}

export default function CategorySidebar({ categories, selectedCategoryId, onCategoryChange }: CategorySidebarProps) {
  return (
    <aside className='w-56 shrink-0'>
      <div className='bg-wow-panel border-wow-border-light before:border-wow-border-gold/20 relative sticky top-4 rounded-sm border before:pointer-events-none before:absolute before:inset-[1px] before:rounded-sm before:border'>
        <h2 className='font-wow-heading text-wow-gold border-wow-border-light border-b px-4 py-2.5 text-xs tracking-widest uppercase'>
          Categories
        </h2>
        <nav className='space-y-0.5 p-1.5'>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={`w-full rounded-sm px-3 py-1.5 text-left text-sm transition-all duration-150 ${
                cat.id === selectedCategoryId ?
                  'text-wow-gold bg-wow-border-gold/10 border-wow-gold border-l-2 pl-[10px]'
                : 'text-wow-text-dim hover:text-wow-text hover:bg-wow-panel-hover'
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
