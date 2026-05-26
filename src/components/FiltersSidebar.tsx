import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { useMemo, useState } from 'react';
import type { CategoryTreeNode } from '../services/curseforge';
import { categoryChildren, getParentCategoryIds } from '../services/curseforge';
import { WoWSeparator } from './ui/separator';

interface FiltersSidebarProps {
  categories: CategoryTreeNode[];
  selectedCategoryIds: number[];
  excludedCategoryIds: number[];
  onCategoryChange: (selected: number[], excluded: number[]) => void;
  selectedVersions: string[];
  onVersionChange: (versions: string[]) => void;
  onClearAll: () => void;
  versions: string[];
}

function CheckboxIcon({ checked, excluded }: { checked: boolean; excluded: boolean }) {
  if (excluded) {
    return (
      <svg className='h-2.5 w-2.5' viewBox='0 0 10 10' fill='none'>
        <line x1='2' y1='2' x2='8' y2='8' stroke='currentColor' strokeWidth='1.5' />
        <line x1='8' y1='2' x2='2' y2='8' stroke='currentColor' strokeWidth='1.5' />
      </svg>
    );
  }
  if (checked) {
    return (
      <svg className='h-2.5 w-2.5' viewBox='0 0 10 10' fill='none'>
        <path d='M2 5L4 7L8 3' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
      </svg>
    );
  }
  return null;
}

export default function FiltersSidebar({
  categories,
  selectedCategoryIds,
  excludedCategoryIds,
  onCategoryChange,
  selectedVersions,
  onVersionChange,
  onClearAll,
  versions,
}: FiltersSidebarProps) {
  const parentIds = useMemo(() => getParentCategoryIds(), []);

  const [categorySectionOpen, setCategorySectionOpen] = useState(true);
  const [versionSectionOpen, setVersionSectionOpen] = useState(true);
  const [expandedParents, setExpandedParents] = useState<Set<number>>(new Set());
  const [versionSearch, setVersionSearch] = useState('');

  const activeFilterCount = selectedCategoryIds.length + excludedCategoryIds.length + selectedVersions.length;

  const categoryChildrenMap = useMemo(() => {
    const map = new Map<number, CategoryTreeNode[]>();
    for (const cat of categories) {
      if (cat.parentId !== null) {
        const arr = map.get(cat.parentId) || [];
        arr.push(cat);
        map.set(cat.parentId, arr);
      }
    }
    return map;
  }, [categories]);

  const parentCategories = categories.filter((c) => parentIds.has(c.id));
  const topLevelCategories = categories.filter((c) => c.parentId === null && !parentIds.has(c.id));

  const filteredVersions = useMemo(() => {
    if (!versionSearch) return versions;
    const q = versionSearch.toLowerCase();
    return versions.filter((v) => v.includes(q));
  }, [versions, versionSearch]);

  function toggleParentExpand(id: number) {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function collectFamily(id: number): number[] {
    const isParent = parentIds.has(id);
    const children = categoryChildren[id] || [];
    return isParent ? [id, ...children] : [id];
  }

  function handleCategoryToggle(id: number) {
    const family = collectFamily(id);
    const selected = new Set(selectedCategoryIds);
    const excluded = new Set(excludedCategoryIds);

    const isSelected = selected.has(id);
    const isExcluded = excluded.has(id);

    if (isExcluded) {
      for (const cid of family) {
        excluded.delete(cid);
        selected.add(cid);
      }
    } else if (isSelected) {
      for (const cid of family) {
        selected.delete(cid);
        excluded.add(cid);
      }
    } else {
      for (const cid of family) {
        selected.add(cid);
      }
    }

    onCategoryChange([...selected], [...excluded]);
  }

  function handleCategoryExclude(id: number) {
    const family = collectFamily(id);
    const selected = new Set(selectedCategoryIds);
    const excluded = new Set(excludedCategoryIds);

    const isExcluded = excluded.has(id);

    if (isExcluded) {
      for (const cid of family) {
        excluded.delete(cid);
      }
    } else {
      for (const cid of family) {
        selected.delete(cid);
        excluded.add(cid);
      }
    }

    onCategoryChange([...selected], [...excluded]);
  }

  function renderCheckbox(id: number, label: string, indent: boolean) {
    const isIncluded = selectedCategoryIds.includes(id);
    const isExcluded = excludedCategoryIds.includes(id);
    const hasChildren = parentIds.has(id);

    return (
      <div key={id}>
        <div className={`group flex items-center gap-1.5 py-0.5 ${indent ? 'pl-5' : ''}`}>
          {hasChildren && (
            <button
              type='button'
              onClick={(e) => {
                e.stopPropagation();
                toggleParentExpand(id);
              }}
              className='text-wow-text-muted hover:text-wow-gold -ml-1 flex size-5 shrink-0 items-center justify-center transition-colors'
            >
              <svg
                className={`size-2.5 transition-transform ${expandedParents.has(id) ? '-rotate-90' : 'rotate-90'}`}
                viewBox='0 0 10 10'
                fill='none'
              >
                <path
                  d='M3 2L7 5L3 8'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </button>
          )}
          <button
            type='button'
            onClick={() => handleCategoryToggle(id)}
            className={`flex min-w-0 flex-1 items-center gap-2 text-left text-sm transition-colors ${
              isExcluded ? 'text-wow-text-muted'
              : isIncluded ? 'text-wow-gold'
              : 'text-wow-text-dim hover:text-wow-text'
            }`}
          >
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                isExcluded ? 'border-wow-danger/40 bg-wow-danger/10 text-wow-danger'
                : isIncluded ? 'border-wow-border-gold bg-wow-border-gold/15 text-wow-gold'
                : 'border-wow-border-light group-hover:border-wow-border-gold/50 bg-transparent text-transparent'
              }`}
            >
              <CheckboxIcon checked={isIncluded} excluded={isExcluded} />
            </span>
            <span className={`truncate ${isExcluded ? 'line-through' : ''}`}>{label}</span>
          </button>
          <button
            type='button'
            onClick={(e) => {
              e.stopPropagation();
              handleCategoryExclude(id);
            }}
            title='Exclude'
            className={`flex size-5 shrink-0 items-center justify-center rounded-sm opacity-0 transition-all group-hover:opacity-100 ${
              isExcluded ? 'text-wow-danger opacity-100' : 'text-wow-text-muted hover:text-wow-danger hover:bg-wow-danger/10'
            }`}
          >
            <svg className='size-3' viewBox='0 0 10 10' fill='none'>
              <line x1='2' y1='2' x2='8' y2='8' stroke='currentColor' strokeWidth='1.5' />
              <line x1='8' y1='2' x2='2' y2='8' stroke='currentColor' strokeWidth='1.5' />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside className='w-56 shrink-0'>
      <div className='bg-wow-panel border-wow-border-light sticky top-4 rounded-sm border'>
        <div className='flex items-center justify-between px-4 py-2.5'>
          <h2 className='font-wow-heading text-wow-gold flex items-center gap-1.5 text-xs tracking-widest uppercase'>
            Filters
            {activeFilterCount > 0 && (
              <span className='bg-wow-border-gold/20 text-wow-gold inline-flex size-4 items-center justify-center rounded-full text-[10px]'>
                {activeFilterCount}
              </span>
            )}
          </h2>
          {activeFilterCount > 0 && (
            <button
              type='button'
              onClick={onClearAll}
              className='font-wow-heading text-wow-text-muted hover:text-wow-gold text-[10px] tracking-wider uppercase transition-colors'
            >
              Clear all
            </button>
          )}
        </div>

        <WoWSeparator />

        <Collapsible open={categorySectionOpen} onOpenChange={setCategorySectionOpen}>
          <CollapsibleTrigger className='px-4 py-2'>
            <span>Categories</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='border-wow-border-light space-y-0 border-t px-3 py-2'>
              {parentCategories.map((cat) => (
                <div key={cat.id}>
                  {renderCheckbox(cat.id, cat.name, false)}
                  {expandedParents.has(cat.id) && (
                    <div className='border-wow-border-light ml-2 border-l pl-1'>
                      {(categoryChildrenMap.get(cat.id) || []).map((child) => renderCheckbox(child.id, child.name, true))}
                    </div>
                  )}
                </div>
              ))}
              {topLevelCategories.map((cat) => renderCheckbox(cat.id, cat.name, false))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <WoWSeparator />

        <Collapsible open={versionSectionOpen} onOpenChange={setVersionSectionOpen}>
          <CollapsibleTrigger className='px-4 py-2'>
            <span>Game Version</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className='border-wow-border-light border-t px-3 py-2'>
              <div className='mb-2'>
                <Input
                  type='text'
                  placeholder='Search versions...'
                  value={versionSearch}
                  onChange={(e) => setVersionSearch(e.target.value)}
                  className='h-8 text-xs'
                />
              </div>
              <div className='max-h-52 space-y-0.5 overflow-y-auto'>
                {filteredVersions.length === 0 && (
                  <p className='text-wow-text-muted py-2 text-center text-xs'>No versions found</p>
                )}
                {filteredVersions.map((v) => {
                  const selected = selectedVersions.includes(v);
                  return (
                    <label
                      key={v}
                      className={`flex cursor-pointer items-center gap-2 rounded-sm px-1 py-0.5 text-sm transition-colors ${
                        selected ? 'text-wow-gold' : 'text-wow-text-dim hover:text-wow-text'
                      }`}
                    >
                      <input
                        type='checkbox'
                        checked={selected}
                        onChange={() => {
                          const next = selected ? selectedVersions.filter((x) => x !== v) : [...selectedVersions, v];
                          onVersionChange(next);
                        }}
                        className='sr-only'
                      />
                      <span
                        className={`flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                          selected ?
                            'border-wow-border-gold bg-wow-border-gold/15 text-wow-gold'
                          : 'border-wow-border-light bg-transparent text-transparent'
                        }`}
                      >
                        {selected && (
                          <svg className='h-2.5 w-2.5' viewBox='0 0 10 10' fill='none'>
                            <path
                              d='M2 5L4 7L8 3'
                              stroke='currentColor'
                              strokeWidth='1.5'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                        )}
                      </span>
                      <span className='truncate'>{v}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </aside>
  );
}
